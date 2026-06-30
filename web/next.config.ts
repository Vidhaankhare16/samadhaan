import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Small, self-contained server bundle for Cloud Run.
  output: "standalone",
};

export default nextConfig;
