import { useState, useMemo } from 'react';
import { Link, router } from '@inertiajs/react';
import { ArrowUp, ArrowDown, ArrowUpDown, Search } from 'lucide-react';

const PER_PAGE_OPTIONS = [10, 25, 50, 100];

/**
 * Extract pagination info from whatever Laravel sends.
 * Laravel's default paginator->toArray() gives:
 *   { current_page, data, from, to, total, per_page, last_page, links: [{url,label,active}...], ... }
 * Everything is top-level. No "meta" wrapper.
 */
function extractPagination(raw) {
    if (!raw) return { total: 0, from: null, to: null, perPage: 20, lastPage: 1, pageLinks: [] };

    // Top-level Laravel paginator (most common)
    if (raw.total !== undefined) {
        return {
            total: raw.total,
            from: raw.from,
            to: raw.to,
            perPage: raw.per_page,
            lastPage: raw.last_page,
            pageLinks: Array.isArray(raw.links) ? raw.links : [],
        };
    }

    // Wrapped in meta (some Inertia setups)
    if (raw.meta?.total !== undefined) {
        return {
            total: raw.meta.total,
            from: raw.meta.from,
            to: raw.meta.to,
            perPage: raw.meta.per_page,
            lastPage: raw.meta.last_page,
            pageLinks: Array.isArray(raw.meta.links) ? raw.meta.links : (Array.isArray(raw.links) ? raw.links : []),
        };
    }

    return { total: 0, from: null, to: null, perPage: 20, lastPage: 1, pageLinks: [] };
}

export default function DataTable({
    columns = [],
    data = [],
    pagination,
    filterUrl,
    filters = {},
    onRowClick,
    emptyIcon: EmptyIcon,
    emptyTitle = 'No data found',
    emptyDescription = '',
    searchable = false,
    searchPlaceholder = 'Search...',
    striped = false,
    compact = false,
}) {
    const [sortKey, setSortKey] = useState(null);
    const [sortDir, setSortDir] = useState('asc');
    const [internalSearch, setInternalSearch] = useState('');

    const pg = extractPagination(pagination);

    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortKey(key);
            setSortDir('asc');
        }
    };

    const sortedData = useMemo(() => {
        if (!sortKey) return data;
        return [...data].sort((a, b) => {
            let aVal = getNestedValue(a, sortKey);
            let bVal = getNestedValue(b, sortKey);
            if (aVal == null && bVal == null) return 0;
            if (aVal == null) return 1;
            if (bVal == null) return -1;
            if (typeof aVal === 'number' && typeof bVal === 'number') {
                return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
            }
            aVal = String(aVal).toLowerCase();
            bVal = String(bVal).toLowerCase();
            if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
            return 0;
        });
    }, [data, sortKey, sortDir]);

    const filteredData = useMemo(() => {
        if (!searchable || !internalSearch.trim()) return sortedData;
        const q = internalSearch.toLowerCase();
        return sortedData.filter((row) =>
            columns.some((col) => {
                const val = getNestedValue(row, col.key);
                return val != null && String(val).toLowerCase().includes(q);
            })
        );
    }, [sortedData, internalSearch, searchable, columns]);

    const cellPadding = compact ? 'px-4 py-2.5' : 'px-5 py-3.5';
    const headerPadding = compact ? 'px-4 py-2.5' : 'px-5 py-3';
    const hasData = filteredData.length > 0;
    const totalRecords = pg.total || data.length;

    const handlePerPageChange = (newPerPage) => {
        if (!filterUrl) return;
        router.get(filterUrl, { ...filters, per_page: newPerPage, page: 1 }, { preserveState: true, replace: true });
    };

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {searchable && (
                <div className="px-5 py-3 border-b border-gray-100">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                        <input
                            type="text"
                            value={internalSearch}
                            onChange={(e) => setInternalSearch(e.target.value)}
                            placeholder={searchPlaceholder}
                            className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition"
                        />
                    </div>
                </div>
            )}

            {!hasData ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                    {EmptyIcon && <EmptyIcon className="h-12 w-12 mb-3 opacity-30" />}
                    <p className="text-sm font-medium text-gray-500">{emptyTitle}</p>
                    {emptyDescription && <p className="text-xs mt-1 text-gray-400">{emptyDescription}</p>}
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                {columns.map((col) => (
                                    <th
                                        key={col.key}
                                        className={`${headerPadding} text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap ${
                                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                                        } ${col.sortable !== false ? 'cursor-pointer select-none hover:bg-gray-100 transition' : ''} ${col.className || ''}`}
                                        onClick={() => col.sortable !== false && handleSort(col.key)}
                                    >
                                        <span className="inline-flex items-center gap-1.5">
                                            {col.label}
                                            {col.sortable !== false && (
                                                <span className="text-gray-300">
                                                    {sortKey === col.key ? (
                                                        sortDir === 'asc' ? <ArrowUp className="h-3.5 w-3.5 text-primary-500" /> : <ArrowDown className="h-3.5 w-3.5 text-primary-500" />
                                                    ) : (
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                    )}
                                                </span>
                                            )}
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {filteredData.map((row, rowIdx) => (
                                <tr
                                    key={row.id || rowIdx}
                                    className={`transition-colors ${
                                        onRowClick ? 'cursor-pointer hover:bg-primary-50/40' : 'hover:bg-gray-50/60'
                                    } ${striped && rowIdx % 2 === 1 ? 'bg-gray-50/30' : ''}`}
                                    onClick={() => onRowClick?.(row)}
                                >
                                    {columns.map((col) => (
                                        <td
                                            key={col.key}
                                            className={`${cellPadding} text-sm whitespace-nowrap ${
                                                col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                                            } ${col.cellClassName || ''}`}
                                        >
                                            {col.render ? col.render(row, rowIdx) : getNestedValue(row, col.key) ?? '—'}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Footer ── */}
            {totalRecords > 0 && (
                <div className="border-t border-gray-200 px-5 py-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 flex-wrap">
                        <p className="text-sm text-gray-500">
                            {pg.from ? (
                                <>
                                    Showing <span className="font-medium text-gray-700">{pg.from}</span> to{' '}
                                    <span className="font-medium text-gray-700">{pg.to}</span> of{' '}
                                    <span className="font-medium text-gray-700">{pg.total}</span> records
                                </>
                            ) : (
                                <>
                                    <span className="font-medium text-gray-700">{totalRecords}</span> record{totalRecords !== 1 ? 's' : ''}
                                </>
                            )}
                        </p>

                        {filterUrl && (
                            <div className="flex items-center gap-2">
                                <label className="text-sm text-gray-500">Show</label>
                                <select
                                    value={pg.perPage}
                                    onChange={(e) => handlePerPageChange(Number(e.target.value))}
                                    className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-700 focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition cursor-pointer"
                                >
                                    {PER_PAGE_OPTIONS.map((n) => (
                                        <option key={n} value={n}>{n}</option>
                                    ))}
                                </select>
                                <span className="text-sm text-gray-500">per page</span>
                            </div>
                        )}
                    </div>

                    {pg.lastPage > 1 && pg.pageLinks.length > 0 && (
                        <nav className="flex items-center gap-1">
                            {pg.pageLinks.map((link, i) => {
                                if (!link.url) {
                                    return (
                                        <span
                                            key={i}
                                            className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm text-gray-300"
                                            dangerouslySetInnerHTML={{ __html: link.label }}
                                        />
                                    );
                                }
                                return (
                                    <Link
                                        key={i}
                                        href={link.url}
                                        className={`inline-flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                                            link.active
                                                ? 'bg-primary-500 text-white shadow-sm'
                                                : 'text-gray-600 hover:bg-gray-100'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                );
                            })}
                        </nav>
                    )}
                </div>
            )}
        </div>
    );
}

function getNestedValue(obj, key) {
    return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}
