import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.27", "172.20.10.2"],
  // Produce a minimal server bundle that can be copied into the runtime image.
  output: "standalone",
};

export default nextConfig;
