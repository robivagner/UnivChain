/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["wagmi", "viem", "@rainbow-me/rainbowkit"],
  },
};

export default nextConfig;