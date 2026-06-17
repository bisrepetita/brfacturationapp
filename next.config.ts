import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["swissqrbill", "pdfkit"],
};

export default nextConfig;
