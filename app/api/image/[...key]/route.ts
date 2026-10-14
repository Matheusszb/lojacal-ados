import { env } from "cloudflare:workers";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const path = key.join("/");
  if (!path.startsWith("product/") || !env.BUCKET) return new Response("Not found", { status: 404 });
  const object = await env.BUCKET.get(path);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=86400", "x-content-type-options": "nosniff" } });
}
