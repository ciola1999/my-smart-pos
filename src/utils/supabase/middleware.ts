import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Penting: Membaca user untuk validasi token
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // ATURAN KEAMANAN:
  // 1. Kalau user BELUM login, dan mencoba akses halaman /dashboard...
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login"; // ...tendang ke login
    return NextResponse.redirect(url);
  }

  // 2. Kalau user SUDAH login, dan mencoba akses halaman /login...
  if (user && request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard"; // ...lempar ke dashboard
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}