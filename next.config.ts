import type { NextConfig } from "next";

// Storage public host whitelist for next/image — docs/SUPABASE.md §5.4.
const storageHost =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^https?:\/\//, "") ??
  "your-project-ref.supabase.co";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.monkeycode-ai.live"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: storageHost,
      },
    ],
  },
};

export default nextConfig;
