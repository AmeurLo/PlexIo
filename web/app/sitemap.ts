import { MetadataRoute } from "next";

const BASE = "https://domely.ca";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: BASE,
      lastModified: new Date("2025-03-18"),
      changeFrequency: "monthly",
      priority: 1.0,
    },
    {
      url: `${BASE}/mission`,
      lastModified: new Date("2025-03-18"),
      changeFrequency: "yearly",
      priority: 0.7,
    },
    {
      url: `${BASE}/guide`,
      lastModified: new Date("2025-03-18"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/resources`,
      lastModified: new Date("2025-03-18"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${BASE}/resources/rent-increases`,
      lastModified: new Date("2025-03-05"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/resources/tenant-screening`,
      lastModified: new Date("2025-02-28"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/resources/cash-flow`,
      lastModified: new Date("2025-02-20"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/resources/maintenance`,
      lastModified: new Date("2025-02-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/resources/grow-portfolio`,
      lastModified: new Date("2025-03-10"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${BASE}/portail`,
      lastModified: new Date("2025-03-18"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${BASE}/contact`,
      lastModified: new Date("2025-03-18"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${BASE}/privacy`,
      lastModified: new Date("2025-03-18"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
    {
      url: `${BASE}/terms`,
      lastModified: new Date("2025-03-18"),
      changeFrequency: "yearly",
      priority: 0.4,
    },
  ];
}
