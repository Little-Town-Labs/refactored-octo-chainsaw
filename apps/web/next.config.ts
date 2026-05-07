import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // F01 ships an empty Next.js shell. Concrete config (rewrites,
  // headers, image domains, etc.) lands per consuming feature.
  transpilePackages: ["@spyglass/shared"],
};

export default nextConfig;
