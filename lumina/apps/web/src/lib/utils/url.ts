/**
 * Gets the base URL for the application based on the environment.
 * In production (Vercel), it uses NEXT_PUBLIC_SITE_URL or NEXT_PUBLIC_VERCEL_URL.
 * In development, it defaults to http://localhost:3000.
 */
export function getBaseUrl() {
  let url =
    process?.env?.NEXT_PUBLIC_SITE_URL ?? // Set this to your custom domain in production
    process?.env?.NEXT_PUBLIC_VERCEL_URL ?? // Automatically set by Vercel
    'http://localhost:3000';
  
  // Make sure to include `https://` when not on localhost
  url = url.includes('http') ? url : `https://${url}`;
  
  // Remove trailing slash if present
  return url.replace(/\/$/, '');
}
