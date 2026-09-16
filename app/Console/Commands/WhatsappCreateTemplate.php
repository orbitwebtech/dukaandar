<?php

namespace App\Console\Commands;

use App\Models\Store;
use App\Models\WhatsappTemplate;
use App\Services\InvoicePdf;
use App\Services\WhatsApp\CloudApi;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

/**
 * Creates the invoice template from the command line.
 *
 * The browser hides why a submission failed behind an error box that is easy to
 * miss, and a request that dies on a timeout never reports anything at all.
 * This runs the same steps with no time limit and prints exactly what Meta
 * said, which is usually the whole answer.
 */
class WhatsappCreateTemplate extends Command
{
    protected $signature = 'whatsapp:template
                            {store : Store slug}
                            {--name=invoice_ready : Template name}
                            {--language=en : Template language}
                            {--no-pdf : Create it without the invoice PDF attached}';

    protected $description = 'Create the invoice template on Meta and show the raw response';

    public function handle(): int
    {
        $store = Store::where('slug', $this->argument('store'))->first();

        if (! $store) {
            $this->error("No store with slug '{$this->argument('store')}'.");

            return self::FAILURE;
        }

        $account = $store->whatsappAccount;

        if (! $account?->isConnected()) {
            $this->error('WhatsApp is not connected for this store. Run whatsapp:diagnose first.');

            return self::FAILURE;
        }

        $withPdf = ! $this->option('no-pdf');
        $components = [];

        if ($withPdf) {
            $this->line('Rendering the sample invoice…');

            $sample = InvoicePdf::sampleBytes($store);
            $this->line(sprintf('  %s KB', number_format(strlen($sample) / 1024)));

            $this->line('Uploading it to Meta for review…');

            try {
                $handle = CloudApi::uploadSampleFile($sample, 'sample-invoice.pdf');
                $this->info('  handle: ' . substr($handle, 0, 40) . '…');
            } catch (\Throwable $e) {
                $this->error('  Upload failed.');
                $this->dumpError($e);

                return self::FAILURE;
            }

            $components[] = [
                'type' => 'HEADER',
                'format' => 'DOCUMENT',
                'example' => ['header_handle' => [$handle]],
            ];
        }

        $components[] = [
            'type' => 'BODY',
            'text' => 'Hello {{1}}, thank you for shopping with {{2}}. Your invoice for order {{3}} is attached.',
            'example' => ['body_text' => [['Priya', $store->getSetting('shop_name', $store->name), 'ORD-0042']]],
        ];

        $components[] = ['type' => 'FOOTER', 'text' => 'Reply here if you have any questions.'];

        $name = $this->option('name');
        $language = $this->option('language');

        $this->line('');
        $this->line("Creating template '{$name}' on WABA {$account->waba_id}…");

        $response = Http::withToken($account->access_token)
            ->asJson()
            ->timeout(120)
            ->post(CloudApi::graphUrl("{$account->waba_id}/message_templates"), [
                'name' => $name,
                'language' => $language,
                'category' => 'UTILITY',
                'components' => $components,
            ]);

        $this->line('');
        $this->line('HTTP ' . $response->status());
        $this->line($response->body());
        $this->line('');

        if ($response->failed()) {
            $this->error('Meta refused it. The message above is the reason.');

            return self::FAILURE;
        }

        WhatsappTemplate::updateOrCreate(
            ['store_id' => $store->id, 'name' => $name, 'language' => $language],
            [
                'meta_id' => $response->json('id'),
                'category' => $response->json('category') ?? 'UTILITY',
                'status' => $response->json('status') ?? 'PENDING',
                'body' => $components[$withPdf ? 1 : 0]['text'],
                'components' => $components,
                'rejected_reason' => null,
            ]
        );

        $this->info('Created. Status: ' . ($response->json('status') ?? 'PENDING'));
        $this->line('It should now appear in WhatsApp Manager. Approval is usually minutes.');

        return self::SUCCESS;
    }

    private function dumpError(\Throwable $e): void
    {
        if ($e instanceof \Illuminate\Http\Client\RequestException) {
            $this->line('  HTTP ' . $e->response->status());
            $this->line('  ' . $e->response->body());

            return;
        }

        $this->line('  ' . $e->getMessage());
    }
}
