import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api/gamma/:path*",
        destination: "https://gamma-api.polymarket.com/:path*",
      },
      {
        source: "/api/clob/:path*",
        destination: "https://clob.polymarket.com/:path*",
      },
    ];
  },
};

export default nextConfig;
