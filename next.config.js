/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: { serverActions: { allowedOrigins: ['*'] } },
  images: { domains: ['oyvugnqmwufctbrkoqdv.supabase.co'] },
};
module.exports = nextConfig;
