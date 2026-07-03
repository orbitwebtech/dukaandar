import { useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    LayoutDashboard, Building2, CreditCard, BarChart3,
    Menu, X, LogOut, ChevronDown, Shield, Settings, KeyRound
} from 'lucide-react';

const navigation = [
    { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Organizations', href: '/admin/organizations', icon: Building2 },
    { name: 'Plans & Billing', href: '/admin/plans', icon: CreditCard },
    { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

export default function AdminLayout({ children, title }) {
    const { auth, flash } = usePage().props;
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const currentPath = window.location.pathname;

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50/40 via-white to-gray-50">
            {sidebarOpen && (
                <div className="fixed inset-0 z-40 lg:hidden">
                    <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
                    <div className="fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-2xl">
                        <SidebarContent currentPath={currentPath} onClose={() => setSidebarOpen(false)} />
                    </div>
                </div>
            )}

            <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-64 lg:flex-col">
                <div className="flex grow flex-col bg-white border-r border-gray-200/80">
                    <SidebarContent currentPath={currentPath} />
                </div>
            </div>

            <div className="lg:pl-64">
                <header className="sticky top-0 z-20 bg-white/70 backdrop-blur-xl border-b border-gray-200/70">
                    <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                        <div className="flex items-center gap-3">
                            <button onClick={() => setSidebarOpen(true)} className="lg:hidden rounded-lg p-2 text-gray-500 hover:bg-gray-100">
                                <Menu className="h-5 w-5" />
                            </button>
                            <h1 className="text-xl font-bold tracking-tight text-gray-900">{title}</h1>
                        </div>
                        <div className="relative">
                            <button onClick={() => setProfileOpen(!profileOpen)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-gray-100 transition">
                                <div className="h-8 w-8 rounded-full bg-admin-gradient shadow-sm shadow-red-500/40 ring-2 ring-white flex items-center justify-center text-white font-medium text-sm">
                                    <Shield className="h-4 w-4" />
                                </div>
                                <span className="hidden sm:block font-medium text-gray-700">Super Admin</span>
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                            </button>
                            {profileOpen && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setProfileOpen(false)} />
                                    <div className="absolute right-0 z-40 mt-1 w-48 rounded-xl bg-white border border-gray-200 shadow-lg py-1">
                                        <Link href="/account/password" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
                                            <KeyRound className="h-4 w-4" />
                                            Change Password
                                        </Link>
                                        <Link href="/logout" method="post" as="button" className="flex w-full items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
                                            <LogOut className="h-4 w-4" />
                                            Sign Out
                                        </Link>
                                    </div>
                                </>
                            )}
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

function SidebarContent({ currentPath, onClose }) {
    return (
        <div className="flex h-full flex-col">
            <div className="flex items-center justify-between px-5 py-5 border-b border-gray-100">
                <Link href="/admin/dashboard" className="flex items-center gap-2.5 group">
                    <div className="h-9 w-9 rounded-xl bg-admin-gradient shadow-sm shadow-red-500/40 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                        <Shield className="h-5 w-5 text-white" />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-gray-900">Dukaandar</span>
                        <p className="text-[10px] text-admin-gradient -mt-0.5 font-semibold tracking-wider uppercase">Super Admin</p>
                    </div>
                </Link>
                {onClose && (
                    <button onClick={onClose} className="lg:hidden rounded-lg p-1 text-gray-400 hover:bg-gray-100">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
                {navigation.map((item) => {
                    const isActive = currentPath.startsWith(item.href);
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            onClick={onClose}
                            className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                                isActive ? 'bg-admin-gradient text-white shadow-sm shadow-red-500/40' : 'text-gray-600 hover:bg-red-50/60 hover:text-red-700'
                            }`}
                        >
                            <item.icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400'}`} />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
