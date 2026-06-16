/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["wagmi", "viem", "@rainbow-me/rainbowkit"],
  },
  async redirects() {
    return [
      { source: "/pages", destination: "/home", permanent: false },
      { source: "/verify", destination: "/pages/verify", permanent: false },
      { source: "/enroll", destination: "/pages/student", permanent: false },
      { source: "/pages/enroll", destination: "/pages/student", permanent: false },
      { source: "/professor", destination: "/pages/professor", permanent: false },
      { source: "/issuer", destination: "/pages/issuer", permanent: false },
      { source: "/admin", destination: "/pages/admin", permanent: false },
      { source: "/admin/enrollments", destination: "/pages/admin/enrollments", permanent: false },
    ];
  },
};

export default nextConfig;