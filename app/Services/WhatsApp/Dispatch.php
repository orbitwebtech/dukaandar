<?php

namespace App\Services\WhatsApp;

use Illuminate\Foundation\Bus\PendingDispatch;

/**
 * Decides whether WhatsApp work waits for a queue worker or runs itself.
 *
 * Shared hosting frequently has no worker and a cron that does not fire, and
 * the result is invisible: messages queue, nothing drains them, and the app
 * reports success. Running the job after the response instead needs neither,
 * and the customer gets the message within seconds.
 *
 * The trade is that a failure here is not retried, so a deployment with a real
 * worker should set WHATSAPP_AFTER_RESPONSE=false and get durability back.
 */
class Dispatch
{
    public static function job(PendingDispatch $pending): void
    {
        if (! config('services.meta.after_response')) {
            return; // a real worker is running; leave it on the queue
        }

        if (app()->runningInConsole()) {
            // There is no response to run after, and the callback that would
            // fire it never happens — the job would be dropped without a trace.
            $pending->onConnection('sync');

            return;
        }

        $pending->afterResponse();
    }
}
