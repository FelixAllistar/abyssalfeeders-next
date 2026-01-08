import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '3000',
        pathname: '/api/character-image/**',
      },
      {
        protocol: 'https',
        hostname: 'images.evetech.net',
        port: '',
        pathname: '/characters/**',
      },
    ],
  },
};

export default nextConfig;
