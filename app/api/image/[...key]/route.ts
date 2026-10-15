import { createClient } from "@supabase/supabase-js";
import { bucket } from "@/lib/supabase/storage";

export async function GET(_request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  const path = key.join("/");
  if (!/^product\/[a-f0-9-]+\.(png|jpg|webp)$/.test(path)) return new Response("Not found", { status: 404 });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return new Response("Storage indisponível", { status: 503 });
  const { data } = createClient(url, publishableKey).storage.from(bucket).getPublicUrl(path);
  return Response.redirect(data.publicUrl, 307);
}
