import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { COUNTRIES, flagEmoji, findByDial, DEFAULT_DIAL } from '@/lib/countryCodes';

// A phone field with a searchable country-code dropdown. Controlled via
// `dial` (e.g. "+91") and `number` (national digits); emits onChange(dial, number).
export default function PhoneInput({ dial = DEFAULT_DIAL, number = '', onChange, error, id, placeholder = '98765 43210', autoFocus = false }) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const wrapRef = useRef(null);
    const searchRef = useRef(null);

    const selected = findByDial(dial) || findByDial(DEFAULT_DIAL);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return COUNTRIES;
        const qDigits = q.replace(/[^\d]/g, '');
        return COUNTRIES.filter((c) =>
            c.name.toLowerCase().includes(q) ||
            c.dial.includes(q) ||
            (qDigits && c.dial.includes(qDigits))
        );
    }, [query]);

    useEffect(() => {
        if (!open) return;
        const onDocClick = (e) => {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', onDocClick);
        return () => document.removeEventListener('mousedown', onDocClick);
    }, [open]);

    useEffect(() => {
        if (open && searchRef.current) searchRef.current.focus();
    }, [open]);

    const pick = (country) => {
        setOpen(false);
        setQuery('');
        onChange?.(country.dial, number);
    };

    return (
        <div ref={wrapRef} className="relative">
            <div className={`flex rounded-lg border transition focus-within:border-primary-500 focus-within:ring-1 focus-within:ring-primary-500 ${error ? 'border-danger-500' : 'border-gray-300'}`}>
                <button
                    type="button"
                    onClick={() => setOpen((v) => !v)}
                    className="flex items-center gap-1.5 rounded-l-lg border-r border-gray-200 bg-gray-50 px-3 text-sm text-gray-700 hover:bg-gray-100 focus:outline-none"
                    aria-label="Select country code"
                >
                    <span className="text-base leading-none">{flagEmoji(selected?.iso2)}</span>
                    <span className="font-medium">{selected?.dial}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                <input
                    id={id}
                    type="tel"
                    inputMode="numeric"
                    value={number}
                    autoFocus={autoFocus}
                    onChange={(e) => onChange?.(dial, e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-r-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none"
                />
            </div>

            {open && (
                <div className="absolute z-30 mt-1 w-72 rounded-lg border border-gray-200 bg-white shadow-lg">
                    <div className="border-b border-gray-100 p-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                            <input
                                ref={searchRef}
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                placeholder="Search country or code…"
                                className="w-full rounded-md border border-gray-300 py-1.5 pl-8 pr-2 text-sm outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                            />
                        </div>
                    </div>
                    <ul className="max-h-60 overflow-y-auto py-1">
                        {filtered.length === 0 && (
                            <li className="px-3 py-2 text-sm text-gray-400">No matches</li>
                        )}
                        {filtered.map((c) => (
                            <li key={c.iso2}>
                                <button
                                    type="button"
                                    onClick={() => pick(c)}
                                    className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-primary-50 ${c.dial === dial ? 'bg-primary-50/60 font-medium text-primary-700' : 'text-gray-700'}`}
                                >
                                    <span className="text-base leading-none">{flagEmoji(c.iso2)}</span>
                                    <span className="flex-1 truncate">{c.name}</span>
                                    <span className="text-gray-400">{c.dial}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {error && <p className="mt-1 text-sm text-danger-500">{error}</p>}
        </div>
    );
}
