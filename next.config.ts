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
    // Uploaded images get a random path and never change, so cache optimized versions for 31 days
    // instead of the default 4 hours. Fewer transformations keeps us within Vercel's limits.
    minimumCacheTTL: 2678400,
    // Fewer widths than the defaults (15 in total). Uploads are at most 1600px wide (resizeImage.ts);
    // the largest sizes are only used by the full-width hero, which is a static import.
    deviceSizes: [640, 828, 1080, 1280, 1920],
    imageSizes: [96, 256],
    qualities: [75],
    formats: ["image/webp"],
  },
  // The page for organisations moved from /business; keep old links working.
  async redirects() {
    return [{ source: "/business", destination: "/organisationer", permanent: true }];
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
