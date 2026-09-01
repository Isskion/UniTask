import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Type-check ya se verifica a mano (tsc --noEmit) antes de cada push;
  // que next build lo repita en cada deploy duplica ese coste sobre un
  // proyecto con ~24 rutas/mini-apps y solo alarga el build en Vercel.
  // (ESLint no aplica aquí: Next 16 ya no lo integra en el build — es
  // el script "lint" aparte, así que no había duplicidad en ese frente.)
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
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
