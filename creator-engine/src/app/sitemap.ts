import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://atlasclipping.com';
  return ['', '/start', '/signup', '/login', '/terms', '/privacy'].map((path) => ({ url: `${base}${path}`, changeFrequency: path ? 'monthly' : 'weekly', priority: path ? 0.5 : 1 }));
}
