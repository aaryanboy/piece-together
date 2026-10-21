import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
  if (!siteUrl) return [];

  return [
    { url: new URL("/", siteUrl).toString(), changeFrequency: "weekly", priority: 1 },
    { url: new URL("/create", siteUrl).toString(), changeFrequency: "monthly", priority: 0.8 },
    { url: new URL("/join", siteUrl).toString(), changeFrequency: "monthly", priority: 0.8 },
    { url: new URL("/solo", siteUrl).toString(), changeFrequency: "monthly", priority: 0.7 },
  ];
}
