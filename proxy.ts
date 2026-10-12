import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";

const ROOT_DOMAINS = new Set(["libaas.online", "www.libaas.online"]);
const LOCALHOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

export function proxy(request: NextRequest) {
  const host =
    request.headers.get("host") ??
    request.headers.get("x-forwarded-host") ??
    "";
  const hostname = normalizeHostname(host);

  const overrideSlug = process.env.TENANT_STORE_SLUG?.trim();
  const tenantSlug = overrideSlug ? overrideSlug : resolveTenantSlug(hostname);

  const requestHeaders = new Headers(request.headers);

  if (tenantSlug) {
    requestHeaders.set("x-store-slug", tenantSlug);
    requestHeaders.set(
      "x-tenant-mode",
      overrideSlug ? "override" : "subdomain",
    );
  } else {
    requestHeaders.set("x-store-slug", "");
    requestHeaders.set(
      "x-tenant-mode",
      ROOT_DOMAINS.has(hostname) ? "root-domain" : "none",
    );
  }

  return updateSession(request, requestHeaders);
}

function resolveTenantSlug(hostname: string): string | null {
  if (!hostname) {
    return null;
  }

  if (ROOT_DOMAINS.has(hostname) || LOCALHOSTS.has(hostname)) {
    return null;
  }

  if (hostname.endsWith(".localhost")) {
    return hostname.slice(0, -".localhost".length) || null;
  }

  if (hostname.endsWith(".libaas.online")) {
    return hostname.slice(0, -".libaas.online".length) || null;
  }

  return null;
}

function normalizeHostname(host: string): string {
  const trimmed = host.trim().toLowerCase().replace(/\.$/, "");

  if (!trimmed) {
    return "";
  }

  const lastColon = trimmed.lastIndexOf(":");

  if (lastColon > -1) {
    const maybePort = trimmed.slice(lastColon + 1);

    if (/^\d+$/.test(maybePort)) {
      return trimmed.slice(0, lastColon);
    }
  }

  return trimmed;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
