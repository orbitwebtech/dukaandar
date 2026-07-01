<?php

namespace App\Support;

/**
 * Generates a Tailwind-style 50–900 shade ramp from a single base (500) hex,
 * so a store's chosen primary colour can theme the whole app + invoice PDF.
 *
 * NOTE: the mixing table here is mirrored in resources/js/lib/theme.js — keep
 * the two in sync so the server-rendered shell and the client match exactly.
 */
class ThemePalette
{
    public const DEFAULT = '#4338ca';

    /** shade => [direction, amount] where direction mixes toward white/black from the base. */
    private const MIX = [
        '50'  => ['white', 0.92],
        '100' => ['white', 0.84],
        '200' => ['white', 0.68],
        '300' => ['white', 0.48],
        '400' => ['white', 0.24],
        '500' => ['base',  0.0],
        '600' => ['black', 0.12],
        '700' => ['black', 0.24],
        '800' => ['black', 0.40],
        '900' => ['black', 0.52],
    ];

    /** @return array<string,string> e.g. ['50' => '#eef...', ..., '900' => '#1a...'] */
    public static function ramp(?string $hex): array
    {
        [$r, $g, $b] = self::toRgb(self::normalize($hex));

        $out = [];
        foreach (self::MIX as $shade => [$dir, $amt]) {
            if ($dir === 'base') {
                $out[$shade] = self::hex($r, $g, $b);
            } elseif ($dir === 'white') {
                $out[$shade] = self::hex($r + (255 - $r) * $amt, $g + (255 - $g) * $amt, $b + (255 - $b) * $amt);
            } else {
                $out[$shade] = self::hex($r * (1 - $amt), $g * (1 - $amt), $b * (1 - $amt));
            }
        }
        return $out;
    }

    /** A single darker shade (used for e.g. invoice accents). */
    public static function shade(?string $hex, string $shade = '700'): string
    {
        return self::ramp($hex)[$shade] ?? self::normalize($hex);
    }

    /** Build the `:root { --color-primary-*: ... }` CSS block for head injection. */
    public static function rootCss(?string $hex): string
    {
        $vars = '';
        foreach (self::ramp($hex) as $shade => $value) {
            $vars .= "--color-primary-{$shade}:{$value};";
        }
        return ":root{{$vars}}";
    }

    /** Coerce any input to a valid 6-digit hex, falling back to the default. */
    public static function normalize(?string $hex): string
    {
        $hex = is_string($hex) ? trim($hex) : '';
        if (!preg_match('/^#?[0-9a-fA-F]{6}$/', $hex)) {
            return self::DEFAULT;
        }
        return '#' . strtolower(ltrim($hex, '#'));
    }

    private static function toRgb(string $hex): array
    {
        $hex = ltrim($hex, '#');
        return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
    }

    private static function hex($r, $g, $b): string
    {
        return sprintf(
            '#%02x%02x%02x',
            max(0, min(255, (int) round($r))),
            max(0, min(255, (int) round($g))),
            max(0, min(255, (int) round($b))),
        );
    }
}
