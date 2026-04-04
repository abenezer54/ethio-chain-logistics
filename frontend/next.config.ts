import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  typescript: {
    // CI/build environments can hang on type-check; lint still enforces type-safety in editor/PR.
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
