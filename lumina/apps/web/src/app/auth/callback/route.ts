import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = await cookies();

    // Track cookies that need to be set on the response
    const cookiesToSet: { name: string; value: string; options: CookieOptions }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookies: { name: string; value: string; options: CookieOptions }[]) {
            // Store cookies to apply to redirect response later
            cookiesToSet.push(...cookies);
            // Also set on cookieStore for immediate use
            cookies.forEach(({ name, value, options }) => {
              try {
                cookieStore.set(name, value, options);
              } catch {
                // Ignore - we'll set on response
              }
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Check if user has an organization
      const { data: { user } } = await supabase.auth.getUser();

      let redirectUrl = `${origin}${next}`;

      if (user) {
        const { data: memberships } = await supabase
          .from('org_members')
          .select('org_id, role')
          .eq('user_id', user.id)
          .limit(1);

        if (!memberships || memberships.length === 0) {
          // User needs to join or create an organization
          redirectUrl = `${origin}/onboarding`;
        }
      }

      // Create redirect response and apply session cookies
      const response = NextResponse.redirect(redirectUrl);
      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options);
      });
      return response;
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_error`);
}
