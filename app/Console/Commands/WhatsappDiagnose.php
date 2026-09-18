<?php

namespace App\Console\Commands;

use App\Models\Store;
use App\Services\WhatsApp\CloudApi;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Answers "why did that not work" without guesswork.
 *
 * Checks each link in the chain in the order it breaks: configuration, then
 * the stored connection, then whether Meta actually accepts the token.
 */
class WhatsappDiagnose extends Command
{
    protected $signature = 'whatsapp:diagnose {store : Store slug}';

    protected $description = 'Check the WhatsApp setup for a store and report what is broken';

    public function handle(): int
    {
        $store = Store::where('slug', $this->argument('store'))->first();

        if (! $store) {
            $this->error("No store with slug '{$this->argument('store')}'.");
            $this->line('Available: ' . Store::pluck('slug')->implode(', '));

            return self::FAILURE;
        }

        $problems = [];

        $this->line('');
        $this->info("Store: {$store->name}");

        // 1. Configuration
        $this->line('');
        $this->comment('Configuration');

        foreach ([
            'META_APP_ID' => config('services.meta.app_id'),
            'META_APP_SECRET' => config('services.meta.app_secret'),
            'META_WEBHOOK_VERIFY_TOKEN' => config('services.meta.verify_token'),
        ] as $key => $value) {
            $set = ! empty($value);
            $this->line(sprintf('  %-28s %s', $key, $set ? '<info>set</info>' : '<error>MISSING</error>'));

            if (! $set) {
                $problems[] = "{$key} is not set in .env (run artisan config:clear after adding it)";
            }
        }

        $this->line(sprintf('  %-28s %s', 'Graph version', config('services.meta.graph_version')));

        // 2. Stored connection
        $this->line('');
        $this->comment('Connection');

        $account = $store->whatsappAccount;

        if (! $account) {
            $this->line('  <error>No WhatsApp account linked to this store.</error>');
            $problems[] = 'Connect WhatsApp in Settings, or run whatsapp:link';
            $this->report($problems);

            return self::FAILURE;
        }

        $this->line(sprintf('  %-28s %s', 'Number', $account->display_phone_number ?: '(unknown)'));
        $this->line(sprintf('  %-28s %s', 'Status', $account->status));
        $this->line(sprintf('  %-28s %s', 'Phone number id', $account->phone_number_id));
        $this->line(sprintf('  %-28s %s', 'WABA id', $account->waba_id));
        $this->line(sprintf('  %-28s %s', 'Last webhook', $account->last_webhook_at?->diffForHumans() ?: 'never received'));

        if ($account->last_error) {
            $this->line('  <error>Last error: ' . $account->last_error . '</error>');
        }

        if (str_starts_with($account->phone_number_id, 'DEMO-')) {
            $this->line('  <error>This is a demo connection — nothing will reach Meta.</error>');
            $problems[] = 'Replace the demo link with a real one (whatsapp:link with a token)';
            $this->report($problems);

            return self::FAILURE;
        }

        // 3. Does Meta accept the token?
        $this->line('');
        $this->comment('Meta');

        try {
            $details = CloudApi::phoneNumberDetails($account->phone_number_id, $account->access_token);
            $this->line(sprintf('  %-28s <info>accepted</info>', 'Access token'));
            $this->line(sprintf('  %-28s %s', 'Number status at Meta', $details['status'] ?? 'unknown'));
            $this->line(sprintf('  %-28s %s', 'Quality', $details['quality_rating'] ?? 'unknown'));
            // CLOUD_API means the number lives here only. A phone running the
            // Business app on the same number would read as coexistence.
            $this->line(sprintf('  %-28s %s', 'Platform', $details['platform_type'] ?? 'unknown'));
        } catch (\Throwable $e) {
            $this->line(sprintf('  %-28s <error>rejected</error>', 'Access token'));
            $this->line('  ' . $this->metaError($e));
            $problems[] = 'The stored access token is not working. A Graph Explorer token expires in hours — create a permanent System User token and re-run whatsapp:link.';
            $this->report($problems);

            return self::FAILURE;
        }

        // 4. Templates, read straight from Meta rather than our copy
        try {
            $templates = CloudApi::for($account)->listTemplates();
            $this->line(sprintf('  %-28s %d', 'Templates at Meta', count($templates)));

            foreach ($templates as $t) {
                $this->line(sprintf('    %-28s %-10s %s', $t['name'], $t['language'] ?? '', $t['status'] ?? ''));
            }

            if (count($templates) === 0) {
                $problems[] = 'Meta has no templates for this account, so none were ever created. Submit one and read the red error box if it does not appear here.';
            }
        } catch (\Throwable $e) {
            $this->line('  <error>Could not list templates: ' . $this->metaError($e) . '</error>');
            $problems[] = 'The token cannot read templates — it may be missing the whatsapp_business_management permission.';
        }

        // 5. Can the app token upload a sample file? This is what a PDF template needs.
        $this->line('');
        $this->comment('Sample upload (needed for PDF templates)');

        if (empty(config('services.meta.app_secret'))) {
            $this->line('  <error>Skipped — META_APP_SECRET is not set.</error>');
        } else {
            try {
                $handle = CloudApi::uploadSampleFile('%PDF-1.4 test', 'probe.pdf');
                $this->line('  <info>Works</info> (handle ' . substr($handle, 0, 24) . '…)');
            } catch (\Throwable $e) {
                $this->line('  <error>Failed: ' . $this->metaError($e) . '</error>');
                $problems[] = 'A template with an attached PDF cannot be created until this works. Check META_APP_SECRET matches the app.';
            }
        }

        // 5b. Account standing. A number can be CONNECTED and still be barred
        // from messaging anyone outside a verified list, which Meta accepts and
        // then silently drops — indistinguishable from success at the API.
        $this->line('');
        $this->comment('Account standing');

        try {
            $waba = Http::withToken($account->access_token)
                ->get(CloudApi::graphUrl($account->waba_id), [
                    'fields' => 'account_review_status,name,on_behalf_of_business_info,business_verification_status',
                ])
                ->throw()
                ->json();

            $review = $waba['account_review_status'] ?? 'unknown';
            $this->line(sprintf('  %-28s %s', 'WABA review status', $review));
            $this->line(sprintf('  %-28s %s', 'Business verification', $waba['business_verification_status'] ?? 'unknown'));

            if (strtoupper($review) !== 'APPROVED') {
                $problems[] = "The WhatsApp Business Account review status is '{$review}'. Until it is APPROVED, "
                    . 'messages can only reach numbers added as verified recipients in the Meta dashboard — '
                    . 'Meta accepts anything else and never delivers it.';
            }
        } catch (\Throwable $e) {
            $this->line('  <error>Could not read the account: ' . $this->metaError($e) . '</error>');
        }

        try {
            $numbers = Http::withToken($account->access_token)
                ->get(CloudApi::graphUrl("{$account->waba_id}/phone_numbers"), [
                    'fields' => 'display_phone_number,quality_rating,messaging_limit_tier,status,name_status',
                ])
                ->throw()
                ->json('data') ?: [];

            foreach ($numbers as $number) {
                $this->line(sprintf(
                    '  %-28s %s  tier: %s  name: %s',
                    $number['display_phone_number'] ?? '?',
                    $number['status'] ?? '?',
                    $number['messaging_limit_tier'] ?? 'none',
                    $number['name_status'] ?? '?'
                ));

                if (($number['messaging_limit_tier'] ?? null) === null && ($number['status'] ?? '') === 'CONNECTED') {
                    $problems[] = 'This number has no messaging limit tier, which means it is not yet cleared to '
                        . 'message the general public. Add the recipient as a verified test number, or complete '
                        . 'business verification to lift the restriction.';
                }
            }
        } catch (\Throwable $e) {
            $this->line('  <error>Could not read the numbers: ' . $this->metaError($e) . '</error>');
        }

        // 5c. Webhooks only flow to apps subscribed to the account. Without
        // this, sends still succeed and no delivery report ever arrives — the
        // exact shape of "it says sent but nothing happened".
        $this->line('');
        $this->comment('Webhook subscription');

        try {
            $apps = Http::withToken($account->access_token)
                ->get(CloudApi::graphUrl("{$account->waba_id}/subscribed_apps"))
                ->throw()
                ->json('data') ?: [];

            if ($apps === []) {
                $this->line('  <error>No app is subscribed to this account.</error>');
                $problems[] = 'No app is subscribed to this WhatsApp account, so Meta sends no webhooks at all. '
                    . 'Re-run whatsapp:link for this store, which subscribes it.';
            }

            foreach ($apps as $app) {
                $id = $app['whatsapp_business_api_data']['id'] ?? '?';
                $name = $app['whatsapp_business_api_data']['name'] ?? '?';
                $ours = $id === (string) config('services.meta.app_id');

                $this->line(sprintf('  %-28s %s %s', $name, $id, $ours ? '(ours)' : ''));

                if (! $ours) {
                    continue;
                }
            }

            $ids = array_map(fn ($a) => $a['whatsapp_business_api_data']['id'] ?? '', $apps);

            if ($apps !== [] && ! in_array((string) config('services.meta.app_id'), $ids, true)) {
                $problems[] = 'This account sends its webhooks to a different app, not '
                    . config('services.meta.app_id') . '. Re-run whatsapp:link to subscribe ours.';
            }
        } catch (\Throwable $e) {
            $this->line('  <error>Could not read subscriptions: ' . $this->metaError($e) . '</error>');
        }

        // 5d. Subscribing the account is only half of it. The app itself needs a
        // callback URL and the messages field, or Meta has nowhere to deliver
        // the reports to and sends nothing while everything else looks correct.
        $this->line('');
        $this->comment('App callback URL');

        try {
            $appId = config('services.meta.app_id');
            $subscriptions = Http::get(CloudApi::graphUrl("{$appId}/subscriptions"), [
                'access_token' => $appId . '|' . config('services.meta.app_secret'),
            ])->throw()->json('data') ?: [];

            $whatsapp = collect($subscriptions)
                ->firstWhere('object', 'whatsapp_business_account');

            if (! $whatsapp) {
                $this->line('  <error>No callback URL is configured for WhatsApp on this app.</error>');
                $problems[] = 'The app has no WhatsApp callback URL, so Meta sends no webhooks. Set it in the App '
                    . 'Dashboard under WhatsApp > Configuration: https://' . request()->getHost() . '/webhooks/whatsapp '
                    . 'with your META_WEBHOOK_VERIFY_TOKEN, and tick the "messages" field.';
            } else {
                $fields = collect($whatsapp['fields'] ?? [])->pluck('name')->all();

                $this->line(sprintf('  %-28s %s', 'Callback URL', $whatsapp['callback_url'] ?? '(none)'));
                $this->line(sprintf('  %-28s %s', 'Active', ($whatsapp['active'] ?? false) ? 'yes' : 'no'));
                $this->line(sprintf('  %-28s %s', 'Fields', $fields ? implode(', ', $fields) : '(none)'));

                if (! in_array('messages', $fields, true)) {
                    $problems[] = 'The "messages" field is not subscribed, so no delivery reports and no incoming '
                        . 'messages arrive. Tick it in the App Dashboard under WhatsApp > Configuration.';
                }

                if (! ($whatsapp['active'] ?? false)) {
                    $problems[] = 'The webhook subscription is inactive. Meta disables it after repeated failures — '
                        . 're-save the callback URL in the App Dashboard to switch it back on.';
                }
            }
        } catch (\Throwable $e) {
            $this->line('  <error>Could not read the app subscription: ' . $this->metaError($e) . '</error>');
        }

        // 5e. The queue itself. attempts is the field that matters: zero means
        // nothing has ever picked the job up, so the worker is not running.
        // Anything higher means it ran and the send keeps failing.
        $this->line('');
        $this->comment('Queue');

        $jobs = \Illuminate\Support\Facades\DB::table('jobs')->get();
        $failed = \Illuminate\Support\Facades\DB::table('failed_jobs')->count();

        $this->line(sprintf('  %-28s %d', 'Jobs waiting', $jobs->count()));
        $this->line(sprintf('  %-28s %d', 'Failed jobs', $failed));

        foreach ($jobs as $job) {
            $this->line(sprintf(
                '    attempts: %d   due: %s   queued: %s',
                $job->attempts,
                date('H:i:s', $job->available_at),
                date('H:i:s', $job->created_at)
            ));
        }

        if ($jobs->isNotEmpty()) {
            $allUntouched = $jobs->every(fn ($j) => (int) $j->attempts === 0);

            $problems[] = $allUntouched
                ? 'Jobs are waiting and none has been attempted, so no worker is running them. Check the cron '
                    . 'command runs from SSH exactly as written, and that its schedule is every minute.'
                : 'Jobs are being attempted and released, so the worker runs but the send keeps failing. The '
                    . 'reason is on the message below, or in storage/logs/laravel.log.';
        }

        // 6. What actually happened to recent messages. "accepted" means Meta
        // took it; only a delivery webhook proves it reached the customer.
        $this->line('');
        $this->comment('Recent messages');

        $recent = \App\Models\WhatsappMessage::where('store_id', $store->id)
            ->latest('id')
            ->limit(8)
            ->get();

        if ($recent->isEmpty()) {
            $this->line('  None yet.');
        }

        foreach ($recent as $m) {
            $this->line(sprintf(
                '  #%-4s %-8s %-10s %-10s %s',
                $m->id,
                $m->direction,
                $m->type,
                $m->status,
                $m->error_message ? '— ' . $m->error_message : ''
            ));
        }

        $stuck = $recent->where('direction', 'outbound')->where('status', 'accepted');

        if ($stuck->isNotEmpty()) {
            $this->line('');
            $this->comment('Some messages are still "accepted", meaning Meta took them but has not');
            $this->comment('reported delivery. If that persists for more than a minute or two:');
            $this->line('  - the delivery report needs the "messages" webhook field subscribed');
            $this->line('  - or Meta is holding it: a missing payment method is the usual reason,');
            $this->line('    and it surfaces as error 131042 once the report arrives');
        }

        $this->report($problems);

        return $problems === [] ? self::SUCCESS : self::FAILURE;
    }

    private function metaError(\Throwable $e): string
    {
        if ($e instanceof \Illuminate\Http\Client\RequestException) {
            return $e->response->json('error.message') ?? $e->getMessage();
        }

        return $e->getMessage();
    }

    private function report(array $problems): void
    {
        $this->line('');

        if ($problems === []) {
            $this->info('Everything checks out.');

            return;
        }

        $this->error('Problems found:');

        foreach ($problems as $i => $problem) {
            $this->line('  ' . ($i + 1) . '. ' . $problem);
        }
    }
}
