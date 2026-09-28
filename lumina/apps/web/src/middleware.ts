import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Middleware for authentication and role-based routing
 *
 * Routes:
 * - /login, /join: Public (redirect to dashboard if authenticated)
 * - /dashboard/*: Requires authentication
 * - /admin/*: Requires admin or manager role
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Skip middleware for static assets and API routes
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return response;
  }

  // Create Supabase client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }: { name: string; value: string; options: CookieOptions }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get current session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Auth callback route - always allow
  if (pathname.startsWith('/auth/callback')) {
    return response;
  }

  // Public routes - redirect to dashboard if authenticated
  if (pathname === '/login' || pathname === '/join' || pathname.startsWith('/join/')) {
    if (user) {
      // Check if user has an organization
      const { data: memberships } = await supabase
        .from('org_members')
        .select('org_id')
        .eq('user_id', user.id)
        .limit(1);

      if (!memberships || memberships.length === 0) {
        return NextResponse.redirect(new URL('/onboarding', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return response;
  }

  // Onboarding - requires auth but no org
  if (pathname === '/onboarding') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    // Check if user already has an org
    const { data: memberships, error: onboardingError } = await supabase
      .from('org_members')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1);

    console.log('[Middleware] Onboarding check:', {
      userId: user.id,
      memberships,
      error: onboardingError?.message
    });

    if (memberships && memberships.length > 0) {
      console.log('[Middleware] User has org, redirecting from onboarding to dashboard');
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    console.log('[Middleware] No org found, staying on onboarding');
    return response;
  }

  // Payment routes - require authentication and admin role
  if (pathname === '/checkout' || pathname === '/portal') {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const { data: memberships } = await supabase
      .from('org_members')
      .select('role, org_id')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1);

    const membership = memberships?.[0];
    if (!membership || (membership.role !== 'admin' && membership.role !== 'manager')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
  }

  // Protected routes - require authentication and organization
  if (pathname.startsWith('/dashboard') || pathname.startsWith('/admin')) {
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Get user's organization membership (most recent if multiple)
    const { data: memberships, error: membershipError } = await supabase
      .from('org_members')
      .select('role, org_id')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
      .limit(1);

    console.log('[Middleware] Dashboard check:', {
      userId: user.id,
      memberships,
      error: membershipError?.message
    });

    const membership = memberships?.[0];

    // User needs to join or create an org first
    if (!membership) {
      console.log('[Middleware] No membership found, redirecting to onboarding');
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    console.log('[Middleware] User has org, allowing dashboard access');

    // Admin routes - require admin or manager role
    if (pathname.startsWith('/admin')) {
      if (membership.role !== 'admin' && membership.role !== 'manager') {
        // Redirect non-admins to employee dashboard
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }

    // Trial/subscription enforcement
    // Skip for billing page (admins) and subscription-expired page (employees)
    if (!pathname.startsWith('/admin/billing') && pathname !== '/subscription-expired') {
      const { data: org } = await supabase
        .from('organizations')
        .select('subscription_status, trial_ends_at')
        .eq('id', membership.org_id)
        .single();

      if (org) {
        const isTrialing = org.subscription_status === 'trialing';
        const isActive = org.subscription_status === 'active';
        const isAdmin = membership.role === 'admin' || membership.role === 'manager';

        let needsBillingRedirect = false;

        if (isTrialing && org.trial_ends_at) {
          const trialEnd = new Date(org.trial_ends_at);
          if (new Date() > trialEnd) {
            needsBillingRedirect = true;
          }
        }

        if (!isTrialing && !isActive) {
          needsBillingRedirect = true;
        }

        if (needsBillingRedirect) {
          if (isAdmin) {
            // Admins go to billing page to subscribe
            console.log('[Middleware] Subscription inactive, admin -> billing');
            return NextResponse.redirect(new URL('/admin/billing', request.url));
          } else {
            // Non-admins see a "contact your admin" page (avoids infinite redirect loop)
            console.log('[Middleware] Subscription inactive, employee -> subscription-expired');
            return NextResponse.redirect(new URL('/subscription-expired', request.url));
          }
        }
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
