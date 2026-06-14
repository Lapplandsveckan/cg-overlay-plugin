/**
 * @type {import('next').NextConfig}
 */
const dev = process.env.NODE_ENV !== 'production';
const nextConfig = {
    trailingSlash: true,
};

if (!dev) {
    nextConfig.output = 'export';
    nextConfig.distDir = 'out';
}

module.exports = nextConfig;
