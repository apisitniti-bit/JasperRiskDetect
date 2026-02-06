import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@jasper-risk-detect/engine"],
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
