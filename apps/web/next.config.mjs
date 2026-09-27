/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // El paquete compartido se transpila desde el monorepo.
  transpilePackages: ['@platea/shared'],
};

export default nextConfig;
