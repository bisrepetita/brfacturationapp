import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bis Repetita Facturation",
    short_name: "BR Factures",
    description: "Application de facturation Bis Repetita",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F9F8F6",
    theme_color: "#1A1A18",
    orientation: "portrait",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
