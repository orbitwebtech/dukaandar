import { Link } from '@inertiajs/react';

const variants = {
    primary: 'bg-brand-gradient text-white shadow-brand hover:brightness-110 hover:-translate-y-px active:translate-y-0 focus:ring-primary-300',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300',
    danger: 'bg-gradient-to-br from-danger-500 to-danger-600 text-white shadow-sm shadow-red-500/30 hover:brightness-110 focus:ring-red-300',
    success: 'bg-gradient-to-br from-success-500 to-success-600 text-white shadow-sm shadow-emerald-500/30 hover:brightness-110 focus:ring-green-300',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-primary-300',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
};

const sizes = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-base',
};

export default function Button({
    children,
    variant = 'primary',
    size = 'md',
    href,
    className = '',
    disabled = false,
    loading = false,
    ...props
}) {
    const classes = `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:brightness-100 ${variants[variant]} ${sizes[size]} ${className}`;

    if (href) {
        return (
            <Link href={href} className={classes} {...props}>
                {children}
            </Link>
        );
    }

    return (
        <button className={classes} disabled={disabled || loading} {...props}>
            {loading && (
                <svg className="animate-spin -ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
            )}
            {children}
        </button>
    );
}
