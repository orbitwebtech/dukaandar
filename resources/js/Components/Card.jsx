export default function Card({ children, className = '', padding = true }) {
    return (
        <div className={`bg-white rounded-xl border border-gray-200 shadow-sm ${padding ? 'p-6' : ''} ${className}`}>
            {children}
        </div>
    );
}

export function CardHeader({ title, subtitle, action, className = '' }) {
    return (
        <div className={`flex items-center justify-between mb-6 ${className}`}>
            <div>
                <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
                {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

export function StatCard({ title, value, icon: Icon, trend, color = 'primary' }) {
    const iconColors = {
        primary: 'bg-primary-50 text-primary-500',
        success: 'bg-emerald-50 text-emerald-500',
        warning: 'bg-amber-50 text-amber-500',
        danger: 'bg-red-50 text-red-500',
        blue: 'bg-blue-50 text-blue-500',
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
                    {trend && (
                        <p className={`mt-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className={`rounded-xl p-3 ${iconColors[color]}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                )}
            </div>
        </div>
    );
}
