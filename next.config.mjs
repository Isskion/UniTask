/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true
    },
    output: 'standalone',
    productionBrowserSourceMaps: false,

    typescript: {
        ignoreBuildErrors: true,
    },
};

export default nextConfig;