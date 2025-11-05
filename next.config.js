let withBundleAnalyzer = (config) => config;
try {
  if (process.env.ANALYZE === 'true') {
    // Lazily require only when ANALYZE is enabled and the package is installed
    const analyzer = require('@next/bundle-analyzer');
    withBundleAnalyzer = analyzer({ enabled: true });
  }
} catch (err) {
  // Optional dependency not installed; continue without analyzer
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {},
};

module.exports = withBundleAnalyzer(nextConfig);


