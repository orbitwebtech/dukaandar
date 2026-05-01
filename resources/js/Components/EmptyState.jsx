import { PackageOpen } from 'lucide-react';
import Button from './Button';

export default function EmptyState({ icon: Icon = PackageOpen, title, description, action, actionLabel, actionHref }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-xl bg-gray-50 p-4 mb-4">
                <Icon className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900">{title}</h3>
            {description && <p className="mt-1 text-sm text-gray-500 max-w-sm">{description}</p>}
            {(action || actionHref) && (
                <div className="mt-4">
                    <Button onClick={action} href={actionHref} size="sm">
                        {actionLabel || 'Get started'}
                    </Button>
                </div>
            )}
        </div>
    );
}
