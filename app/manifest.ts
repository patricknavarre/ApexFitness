import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'APEX Fitness',
    short_name: 'APEX',
    description: 'Your body. Your data. Your potential.',
    start_url: '/dashboard',
    scope: '/',
    id: '/',
    display: 'standalone',
    display_override: ['standalone', 'browser'],
    orientation: 'portrait-primary',
    background_color: '#12140f',
    theme_color: '#12140f',
    icons: [
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  };
}
