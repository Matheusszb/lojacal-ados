import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { return { rules: [{ userAgent: "*", allow: "/", disallow: "/admin" }], sitemap: "https://loja-dos-calcados-rio-do-sul.mtsartslogotipo.chatgpt.site/sitemap.xml" }; }
