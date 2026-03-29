/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['example.com'],
  },
  // Mengaktifkan optimisasi gambar otomatis
  experimental: {
    optimizeFonts: true,
  },
};

module.exports = nextConfig;