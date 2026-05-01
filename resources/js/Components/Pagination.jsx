import { Link } from '@inertiajs/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ links, meta }) {
    if (!meta || meta.last_page <= 1) return null;

    return (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 sm:px-6">
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <p className="text-sm text-gray-500">
                    Showing <span className="font-medium">{meta.from}</span> to{' '}
                    <span className="font-medium">{meta.to}</span> of{' '}
                    <span className="font-medium">{meta.total}</span> results
                </p>
                <nav className="flex items-center gap-1">
                    {links.map((link, i) => {
                        if (!link.url) {
                            return (
                                <span
                                    key={i}
                                    className="inline-flex items-center rounded-lg px-3 py-2 text-sm text-gray-300"
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
                            );
                        }
                        return (
                            <Link
                                key={i}
                                href={link.url}
                                className={`inline-flex items-center rounded-lg px-3 py-2 text-sm font-medium transition ${
                                    link.active
                                        ? 'bg-primary-500 text-white'
                                        : 'text-gray-700 hover:bg-gray-100'
                                }`}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
