/** @type {import('next').NextConfig} */
const nextConfig = {
  // The offline demo (mock money, sample clippers) is a static page in public/demo.
  async redirects() {
    return [{ source: '/demo', destination: '/demo/index.html', permanent: false }];
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    // campaign thumbnails are uploaded through a server action (2 MB max + form fields)
    serverActions: { bodySizeLimit: '3mb' },
  },
};
export default nextConfig;
