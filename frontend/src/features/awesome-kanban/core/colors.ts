import type { Id } from '../types';

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic avatar palette (6 colors, aligned with Calendar / Timesheet)
// ─────────────────────────────────────────────────────────────────────────────

export const AVATAR_PALETTE = [
  { name: 'violet', bg: '#7c5cff', fg: '#ffffff' },
  { name: 'blue', bg: '#3b82f6', fg: '#ffffff' },
  { name: 'green', bg: '#10b981', fg: '#ffffff' },
  { name: 'amber', bg: '#f59e0b', fg: '#1f2430' },
  { name: 'sky', bg: '#0ea5e9', fg: '#ffffff' },
  { name: 'red', bg: '#ef4444', fg: '#ffffff' },
] as const;

export type AvatarPaletteEntry = (typeof AVATAR_PALETTE)[number];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarColor(id: Id): AvatarPaletteEntry {
  const key = String(id);
  const index = hashString(key) % AVATAR_PALETTE.length;
  return AVATAR_PALETTE[index]!;
}

// ─────────────────────────────────────────────────────────────────────────────
// Color manipulation — used for derived primary tones
// ─────────────────────────────────────────────────────────────────────────────

interface RGB {
  r: number;
  g: number;
  b: number;
}

function clamp(value: number, min = 0, max = 255): number {
  return Math.max(min, Math.min(max, value));
}

function parseHex(hex: string): RGB | null {
  let normalized = hex.trim().replace(/^#/, '');
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((c) => c + c)
      .join('');
  }
  if (normalized.length !== 6 || !/^[0-9a-f]{6}$/i.test(normalized)) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function toHex(rgb: RGB): string {
  const channel = (n: number) =>
    clamp(Math.round(n))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(rgb.r)}${channel(rgb.g)}${channel(rgb.b)}`;
}

/** Mix `color` with `target` (default white) by `ratio` (0..1). 0 = full color, 1 = full target. */
export function mix(color: string, ratio: number, target = '#ffffff'): string {
  const a = parseHex(color);
  const b = parseHex(target);
  if (!a || !b) return color;
  const r = ratio;
  return toHex({
    r: a.r * (1 - r) + b.r * r,
    g: a.g * (1 - r) + b.g * r,
    b: a.b * (1 - r) + b.b * r,
  });
}

/** Mix `color` with `transparent` (returns rgba). 0 = full color, 1 = transparent. */
export function fade(color: string, ratio: number): string {
  const rgb = parseHex(color);
  if (!rgb) return color;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${1 - ratio})`;
}

/** Soft variant of a primary color (~10% mix on white). */
export function softVariant(color: string): string {
  return mix(color, 0.9, '#ffffff');
}

/** Active variant (~25% mix on black). */
export function activeVariant(color: string): string {
  return mix(color, 0.25, '#000000');
}

/** Light tinted background (used by column count pill — 14% on white). */
export function tintedBackground(color: string): string {
  return mix(color, 0.86, '#ffffff');
}

// ─────────────────────────────────────────────────────────────────────────────
// Initials helper
// ─────────────────────────────────────────────────────────────────────────────

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return (parts[0]?.charAt(0) ?? '?').toUpperCase();
  const first = parts[0]?.charAt(0) ?? '';
  const last = parts[parts.length - 1]?.charAt(0) ?? '';
  return (first + last).toUpperCase();
}
