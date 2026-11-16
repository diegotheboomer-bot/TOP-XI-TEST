/** @type {import('next').NextConfig} */
const nextConfig = {
  // The offline demo (mock money, sample clippers) is a static page in public/demo.
  async redirects() {
    return [{ source: '/demo', destination: '/demo/index.html', permanent: false }];
  },
  // Security headers on every page. The CSP only limits who can frame the site and plugins, so it can't break
  // Stripe, Supabase or sign-in; a stricter script policy would need testing across every payment and login flow.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
        ],
      },
    ];
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    // campaign thumbnails are uploaded through a server action (2 MB max + form fields)
    serverActions: { bodySizeLimit: '3mb' },
  },
};
export default nextConfig;
