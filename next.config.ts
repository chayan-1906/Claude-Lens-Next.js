import type {NextConfig} from "next";

const nextConfig: NextConfig = {
    /* config options here */
    output: 'standalone',
    reactCompiler: true,
    cacheComponents: true,
    allowedDevOrigins: ['192.168.0.4'],
};

export default nextConfig;
