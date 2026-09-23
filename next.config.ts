import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/network/policies",
        destination: "/network/connectivity",
        permanent: true,
      },
    ];
  },
};
export default nextConfig;
