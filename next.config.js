/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    esmExternals: 'loose',
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    // Handle browser-only dependencies
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      'pdfjs-dist/build/pdf.worker.min.js': false,
    };

    return config;
  },
}

module.exports = nextConfig
