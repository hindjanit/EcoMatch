import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/admin/trust",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
