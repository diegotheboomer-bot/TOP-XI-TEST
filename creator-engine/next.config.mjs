/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    // campaign thumbnails are uploaded through a server action (2 MB max + form fields)
    serverActions: { bodySizeLimit: '3mb' },
  },
};
export default nextConfig;
