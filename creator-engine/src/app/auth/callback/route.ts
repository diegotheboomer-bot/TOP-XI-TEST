import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  // Google / Apple sign-up passes the side they picked, so onboarding starts on it.
  const role = req.nextUrl.searchParams.get('role');
  const side = role === 'creator' || role === 'brand' || role === 'agency' ? `?role=${role}` : '';
  if (code) {
    const { error } = await createClient().auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${appUrl()}/onboarding${side}`);
  }
  return NextResponse.redirect(`${appUrl()}/login?error=link`);
}
