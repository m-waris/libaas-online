import type { CSSProperties } from "react";

import type { StorefrontStore } from "./queries";

const FALLBACK_ACCENT = "#39332E";
const DARK_TEXT = "#25211E";

function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string" || !/^#[0-9a-f]{6}$/i.test(value.trim())) {
    return null;
  }

  return value.trim().toLowerCase();
}

function linearizeChannel(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(hex: string) {
  const channels =
    hex
      .slice(1)
      .match(/.{2}/g)
      ?.map((channel) => parseInt(channel, 16)) ?? [];
  const [red, green, blue] = channels;

  return (
    0.2126 * linearizeChannel(red) +
    0.7152 * linearizeChannel(green) +
    0.0722 * linearizeChannel(blue)
  );
}

function contrastRatio(first: string, second: string) {
  const values = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

function isSafeImageUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.trim() === "") {
    return false;
  }

  const normalized = value.trim();
  if (normalized.startsWith("/") && !normalized.startsWith("//")) {
    return true;
  }

  try {
    const url = new URL(normalized);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

export function getStorefrontBranding(store: StorefrontStore) {
  const theme = store.theme_config ?? {};
  const logoCandidate =
    theme.logoUrl ?? theme.logo_url ?? theme.logo ?? store.logo_url;
  const accentColor = normalizeHexColor(theme.primaryColor) ?? FALLBACK_ACCENT;
  const accentForeground =
    contrastRatio(accentColor, "#ffffff") >=
    contrastRatio(accentColor, DARK_TEXT)
      ? "#ffffff"
      : DARK_TEXT;

  return {
    logoUrl: isSafeImageUrl(logoCandidate) ? logoCandidate.trim() : null,
    accentColor,
    accentForeground,
  };
}

export function getStorefrontThemeStyle(store: StorefrontStore): CSSProperties {
  const branding = getStorefrontBranding(store);

  return {
    "--store-accent": branding.accentColor,
    "--store-accent-foreground": branding.accentForeground,
  } as CSSProperties & {
    "--store-accent": string;
    "--store-accent-foreground": string;
  };
}
