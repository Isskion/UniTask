import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: "/validador",
        destination: "/validador.html",
      },
    ];
  },
};

export default nextConfig;
