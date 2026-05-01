import { usePage } from '@inertiajs/react';

export function useStorePath() {
    const { auth } = usePage().props;
    const slug = auth?.currentStore?.slug;
    return (path) => slug ? `/store/${slug}${path.startsWith('/') ? '' : '/'}${path}` : path;
}

export function useCan() {
    const { auth } = usePage().props;
    const perms = auth?.currentStore?.permissions || [];
    return (permission) => perms.includes(permission);
}
