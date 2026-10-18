import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(
  request: NextRequest,
  requestHeaders: Headers = new Headers(request.headers),
) {
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          requestHeaders.set("cookie", request.cookies.toString());
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) =>
            supabaseResponse.headers.set(key, value),
          );
        },
      },
    },
  );

  // Refresh the session if expired — required for Server Components to read
  // an up-to-date auth cookie. Do not add logic between createServerClient
  // and getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const tenantSlug = requestHeaders.get("x-store-slug")?.trim();
  if (user && tenantSlug) {
    const { data: store } = await supabase
      .from("stores")
      .select("is_active")
      .eq("owner_id", user.id)
      .eq("slug", tenantSlug)
      .maybeSingle<{ is_active: boolean }>();

    if (store && !store.is_active) {
      await supabase.auth.signOut();
      const redirectResponse = NextResponse.redirect(
        new URL("/login?disabled=1", request.url),
      );
      supabaseResponse.cookies.getAll().forEach((cookie) =>
        redirectResponse.cookies.set(cookie),
      );
      return redirectResponse;
    }
  }

  return supabaseResponse;
}
