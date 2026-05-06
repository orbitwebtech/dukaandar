import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard, Users, Package, ShoppingCart,
    BarChart3, TrendingUp, Tag, Settings, ShoppingBag,
    Menu, X, LogOut, ChevronDown, Store, Building2, UserCog, Wallet, KeyRound
} from 'lucide-react';
import { useStorePath, useCan } from '@/lib/storePath';

export default function VendorLayout({ children, title }) {
    const { auth, flash } = usePage().props;
    const url = useStorePath();
    const can = useCan();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [storeMenuOpen, setStoreMenuOpen] = useState(false);
    const currentPath = window.location.pathname;

    const navigation = [
        { name: 'Dashboard', href: url('/dashboard'), icon: LayoutDashboard, show: true },
        { name: 'Customers', href: url('/customers'), icon: Users, show: can('customers.read') },
        { name: 'Products', href: url('/products'), icon: Package, show: can('products.read') },
        { name: 'Orders', href: url('/orders'), icon: ShoppingCart, show: can('orders.read') },
        { name: 'Purchases', href: url('/purchases'), icon: ShoppingBag, show: can('purchases.read') },
        { name: 'Inventory Reports', href: url('/reports/inventory'), icon: BarChart3, show: can('reports.read') },
        { name: 'Sales Reports', href: url('/reports/sales'), icon: TrendingUp, show: can('reports.read') },
        { name: 'Profit & Loss', href: url('/reports/profit-loss'), icon: Wallet, show: can('reports.read') },
        { name: 'Coupons', href: url('/coupons'), icon: Tag, show: can('coupons.read') },
        { name: 'Settings', href: url('/settings'), icon: Settings, show: can('settings.read') },
    ].filter(i => i.show);

    const orgNav = [
        { name: 'Stores', href: '/org/stores', icon: Building2, show: !!auth?.user?.is_owner },
        { name: 'Team', href: '/org/team', icon: UserCog, show: !!auth?.user?.is_owner || can('team.invite') },
        { name: 'Expenses', href: '/org/expenses', icon: Wallet, show: !!auth?.user?.is_owner },
    ].filter(i => i.show);

    return (
        <div className="min-h-screen bg-gray-50">
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="fixed inset-0 bg-black/40" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-xl">
                        <SidebarContent navigation={navigation} orgNav={orgNav} currentPath={currentPath} onClose={() => setSidebarOpen(false)} auth={auth} />
                    </div>
                </div>
            )}

            <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
                <div className="flex grow flex-col bg-white border-r border-gray-200">
                    <SidebarContent navigation={navigation} orgNav={orgNav} currentPath={currentPath} auth={auth} />
                </div>
            </div>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-200">
                    <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setSidebarOpen(true)}
                                className="lg:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                            >
                                <Menu className="h-5 w-5" />
                            </button>
                            <h1 className="text-xl font-bold text-gray-900">{title}</h1>
                        </div>

                        <div className="flex items-center gap-2">
                            {auth?.stores && auth.stores.length > 1 && (
                                <div className="relative">
                                    <button
                                        onClick={() => setStoreMenuOpen(!storeMenuOpen)}
                                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition"
                                    >
                                        <Store className="h-4 w-4 text-gray-500" />
                                        <span className="hidden sm:block font-medium text-gray-700">{auth.currentStore?.name}</span>
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    </button>
                                    {storeMenuOpen && (
                                        <>
                                            <div className="fixed inset-0 z-30" onClick={() => setStoreMenuOpen(false)} />
                                            <div className="absolute right-0 z-40 mt-1 w-56 rounded-xl bg-white border border-gray-200 shadow-lg py-1">
                                                {auth.stores.map(s => (
                                                    <Link
                                                        key={s.slug}
                                                        href={`/store/${s.slug}/dashboard`}
                                                        className={`block px-4 py-2 text-sm ${s.slug === auth.currentStore?.slug ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                                                    >
                                                        {s.name}
                                                    </Link>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}

                            <div className="relative">
                                <button
                                    onClick={() => setProfileOpen(!profileOpen)}
                                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition"
                                >
                                    <div className="h-8 w-8 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium text-sm">
                                        {auth?.user?.name?.charAt(0)?.toUpperCase() || 'V'}
                                    </div>
                                    <span className="hidden sm:block font-medium text-gray-700">{auth?.user?.name}</span>
                                    <ChevronDown className="h-4 w-4 text-gray-400" />
                                </button>

                                {profileOpen && (
                                    <>
                                        <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                                        <div className="absolute right-0 z-40 mt-1 w-48 rounded-xl bg-white border border-gray-200 shadow-lg py-1">
                                            {can('settings.read') && (
                                                <Link
                                                    href={url('/settings')}
                                                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                                >
                                                    <Settings className="h-4 w-4" />
                                                    Settings
                                                </Link>
                                            )}
                                            <Link
                                                href="/account/password"
                                                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                <KeyRound className="h-4 w-4" />
                                                Change Password
                                            </Link>
                                            <Link
                                                href="/logout"
                                                method="post"
                                                as="button"
                                                className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                <LogOut className="h-4 w-4" />
                                                Sign Out
                                            </Link>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                {flash?.success && (
                    <div className="mx-4 mt-4 sm:mx-6 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-700">
                        {flash.success}
                    </div>
                )}
                {flash?.error && (
                    <div className="mx-4 mt-4 sm:mx-6 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                        {flash.error}
                    </div>
                )}

                <main className="p-4 sm:p-6">{children}</main>
            </div>
        </div>
    );
}

function SidebarContent({ navigation, orgNav, currentPath, onClose, auth }) {
    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
                <Link href={auth?.currentStore ? `/store/${auth.currentStore.slug}/dashboard` : '/'} className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-lg bg-primary-500 flex items-center justify-center">
                        <Store className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-primary-700">Dukaandar</span>
                        <p className="text-[10px] text-gray-400 -mt-0.5 font-medium tracking-wider uppercase">CRM</p>
                    </div>
                </Link>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {auth?.currentStore && (
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50">
                    <p className="text-xs font-semibold text-gray-900 truncate">{auth.currentStore.name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">
                        {auth.currentStore.role}{auth.organization?.status ? ` · ${auth.organization.status}` : ''}
                    </p>
                </div>
            )}

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                {navigation.map((item) => {
                    const isActive = currentPath.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                                isActive
                                    ? 'bg-primary-50 text-primary-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                            }`}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                            {item.name}
                        </Link>
                    );
                })}

                {orgNav.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-gray-100">
                        <p className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-gray-400">Organization</p>
                        {orgNav.map((item) => {
                            const isActive = currentPath.startsWith(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={onClose}
                                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                                        isActive ? 'bg-primary-50 text-primary-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                    }`}
                                >
                                    <item.icon className={`h-5 w-5 ${isActive ? 'text-primary-500' : 'text-gray-400'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                )}
            </nav>
        </div>
    );
}
