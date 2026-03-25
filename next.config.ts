import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /** Keep PDF stack out of client bundles when server actions are referenced from the client. */
  serverExternalPackages: ['unpdf'],
  productionBrowserSourceMaps: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, {isServer}) => {
    if (!isServer) {
      config.resolve.alias = {
        ...(config.resolve.alias || {}),
        handlebars: false, // don't bundle handlebars in client
      };
    }
    return config;
  },
};

export default nextConfig;
