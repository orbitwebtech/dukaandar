import { createInertiaApp, router } from '@inertiajs/react';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import '../css/app.css';
import { applyTheme } from '@/lib/theme';

const primaryOf = (page) => page?.props?.auth?.currentStore?.primary_color;

createInertiaApp({
    title: (title) => title ? `${title} — Dukaandar` : 'Dukaandar',
    resolve: (name) =>
        resolvePageComponent(
            `./Pages/${name}.jsx`,
            import.meta.glob('./Pages/**/*.jsx')
        ),
    setup({ el, App, props }) {
        // Apply the store's primary colour on first paint, then on every visit
        // (covers store switch and saving a new colour without a full reload).
        if (primaryOf(props.initialPage)) applyTheme(primaryOf(props.initialPage));
        router.on('navigate', (event) => {
            const hex = primaryOf(event.detail.page);
            if (hex) applyTheme(hex);
        });
        createRoot(el).render(<App {...props} />);
    },
    progress: {
        color: '#4338ca',
        showSpinner: true,
    },
});
