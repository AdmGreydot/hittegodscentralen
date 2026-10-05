import type { NextConfig } from "next";

const supabaseHost = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL!).hostname;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Uploaded item images in Supabase Storage.
      {
        protocol: "https",
        hostname: supabaseHost,
        pathname: "/storage/v1/object/public/**",
      },
      // Photos used by the test data in supabase/seed.sql.
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  // The logo embedded in every e-mail (lib/mail.ts). Mails are sent from many routes.
  outputFileTracingIncludes: {
    "/**": ["./lib/assets/email-logo.png"],
  },
  experimental: {
    serverActions: {
      // Creating an item uploads one photo. It's resized in the browser first (usually well under
      // 1 MB), and the action rejects anything over 4 MB; this leaves room for form overhead.
      bodySizeLimit: "5mb",
    },
  },
};

export default nextConfig;
