import { Link } from '@inertiajs/react';

const variants = {
    primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-300',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300',
    danger: 'bg-danger-500 text-white hover:bg-danger-600 focus:ring-red-300',
    success: 'bg-success-500 text-white hover:bg-success-600 focus:ring-green-300',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-primary-300',
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
    const classes = `inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`;

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
