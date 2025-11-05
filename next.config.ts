import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { 
        hostname: "img.clerk.com" 
      },
      {
        // Supabase Storage
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        // 로컬 개발용
        hostname: "localhost",
      },
    ],
  },
};

export default nextConfig;
