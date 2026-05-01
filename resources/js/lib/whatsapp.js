// Default country code when a number doesn't include one (India)
const DEFAULT_COUNTRY_CODE = '91';

export function normalizePhone(input) {
    const digits = String(input || '').replace(/\D/g, '');
    if (!digits) return '';
    // 10-digit numbers → assume India
    if (digits.length === 10) return DEFAULT_COUNTRY_CODE + digits;
    // Numbers starting with 0 (local format) → strip leading 0 and prepend
    if (digits.length === 11 && digits.startsWith('0')) return DEFAULT_COUNTRY_CODE + digits.slice(1);
    return digits;
}

export function waLink(phone, text = '') {
    const number = normalizePhone(phone);
    if (!number) return '#';
    const encoded = text ? `?text=${encodeURIComponent(text)}` : '';
    return `https://wa.me/${number}${encoded}`;
}
