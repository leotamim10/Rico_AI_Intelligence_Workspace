import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Import .glsl shader sources as raw strings (dev + build both use Turbopack).
  turbopack: {
    rules: {
      "*.glsl": {
        loaders: ["raw-loader"],
        as: "*.js",
      },
    },
  },
};

export default nextConfig;
