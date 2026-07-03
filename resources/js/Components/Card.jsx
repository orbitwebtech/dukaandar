export default function Card({ children, className = '', padding = true }) {
    return (
        <div className={`bg-white rounded-2xl border border-gray-200/70 shadow-card ${padding ? 'p-6' : ''} ${className}`}>
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
        primary: 'bg-brand-gradient text-white shadow-brand',
        success: 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm shadow-emerald-500/30',
        warning: 'bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-sm shadow-amber-500/30',
        danger: 'bg-gradient-to-br from-red-500 to-red-600 text-white shadow-sm shadow-red-500/30',
        blue: 'bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-sm shadow-blue-500/30',
    };

    return (
        <div className="group relative bg-white rounded-2xl border border-gray-200/70 shadow-card p-5 transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-gray-500">{title}</p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">{value}</p>
                    {trend && (
                        <p className={`mt-1 text-xs font-medium ${trend > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
                        </p>
                    )}
                </div>
                {Icon && (
                    <div className={`rounded-xl p-3 transition-transform duration-200 group-hover:scale-105 ${iconColors[color]}`}>
                        <Icon className="h-6 w-6" />
                    </div>
                )}
            </div>
        </div>
    );
}
