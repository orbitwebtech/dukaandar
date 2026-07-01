// Generates a Tailwind-style 50–900 shade ramp from a single base (500) hex and
// applies it to the app's --color-primary-* CSS variables at runtime.
//
// NOTE: the mixing table here mirrors app/Support/ThemePalette.php — keep the
// two in sync so the server-rendered shell and the client match exactly.

export const DEFAULT_PRIMARY = '#4338ca';

const MIX = {
    50: ['white', 0.92],
    100: ['white', 0.84],
    200: ['white', 0.68],
    300: ['white', 0.48],
    400: ['white', 0.24],
    500: ['base', 0.0],
    600: ['black', 0.12],
    700: ['black', 0.24],
    800: ['black', 0.40],
    900: ['black', 0.52],
};

const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];

export function normalizeHex(hex) {
    const v = typeof hex === 'string' ? hex.trim() : '';
    return /^#?[0-9a-fA-F]{6}$/.test(v) ? '#' + v.replace(/^#/, '').toLowerCase() : DEFAULT_PRIMARY;
}

function toRgb(hex) {
    const h = normalizeHex(hex).slice(1);
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function toHex(r, g, b) {
    const c = (n) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0');
    return `#${c(r)}${c(g)}${c(b)}`;
}

export function buildRamp(hex) {
    const [r, g, b] = toRgb(hex);
    const out = {};
    for (const shade of SHADES) {
        const [dir, amt] = MIX[shade];
        if (dir === 'base') out[shade] = toHex(r, g, b);
        else if (dir === 'white') out[shade] = toHex(r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt);
        else out[shade] = toHex(r * (1 - amt), g * (1 - amt), b * (1 - amt));
    }
    return out;
}

// Apply (or preview) a primary colour by setting the CSS variables on <html>.
// Inline styles on the root element override any stylesheet :root rule.
export function applyTheme(hex) {
    if (typeof document === 'undefined') return;
    const ramp = buildRamp(hex);
    const root = document.documentElement;
    for (const shade of SHADES) {
        root.style.setProperty(`--color-primary-${shade}`, ramp[shade]);
    }
}
