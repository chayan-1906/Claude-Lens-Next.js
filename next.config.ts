import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    serverActions: {
        bodySizeLimit: '10mb',
    },
    output: 'standalone',
    reactCompiler: true,
    reactStrictMode: false,
    cacheComponents: true,
    allowedDevOrigins: ['192.168.7.7'],
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'pub-c98b3e53eafb4d4198eef98bb3031025.r2.dev',
                pathname: '/**',
            },
        ],
    },
};

export default nextConfig;
