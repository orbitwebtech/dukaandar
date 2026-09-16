<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
        ]);
        // Meta signs webhooks with X-Hub-Signature-256; it cannot send a CSRF token.
        $middleware->validateCsrfTokens(except: [
            'webhooks/whatsapp',
        ]);
        $middleware->alias([
            'system_role' => \App\Http\Middleware\EnsureSystemRole::class,
            'store.access' => \App\Http\Middleware\EnsureStoreAccess::class,
            'store.can' => \App\Http\Middleware\EnsurePermission::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
