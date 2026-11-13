import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Refreshes the Supabase session cookie on each request, and gives each browser a random
// device ID (used only for invite anti-fraud, see src/lib/device.ts).
const DEVICE_COOKIE = 'atlas_device';

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !key) return NextResponse.next(); // demo mode

  let deviceId = request.cookies.get(DEVICE_COOKIE)?.value;
  const newDevice = !deviceId;
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    request.cookies.set(DEVICE_COOKIE, deviceId); // so this same request already sees it
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  if (newDevice) response.cookies.set(DEVICE_COOKIE, deviceId, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 2 * 365 * 86_400 });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/cron|api/discord).*)'],
};
