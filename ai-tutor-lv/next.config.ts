import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Without this, dev-mode JS chunks are blocked on 127.0.0.1 and buttons never hydrate.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
};

export default nextConfig;
