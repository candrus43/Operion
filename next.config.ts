import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  serverExternalPackages: ["bcryptjs"],
  async headers() {
    return [
      {
        // Defense in depth for previously uploaded files: user content must
        // never inherit the application's execution context.
        source: "/uploads/:path*",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ]
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
