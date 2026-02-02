/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true
    },
    output: 'export',
    productionBrowserSourceMaps: false
};

export default nextConfig;