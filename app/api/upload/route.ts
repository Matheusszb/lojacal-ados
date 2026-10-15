import { requireAdmin } from "@/lib/admin";
import { fail, json } from "@/lib/store";
import { storage } from "@/lib/supabase/storage";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) return fail("Origem não permitida.", 403);
    const admin = await requireAdmin();
    if (!admin) return fail("Acesso restrito.", 403);
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return fail("Selecione uma imagem.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 8_000_000) return fail("Use JPG, PNG ou WebP de até 8 MB.");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const key = `product/${crypto.randomUUID()}.${ext}`;
    const { error } = await storage().upload(key, new Uint8Array(await file.arrayBuffer()), { contentType: file.type, upsert: false });
    if (error) return fail("Não foi possível enviar a imagem.", 500);
    return json({ key, url: `/api/image/${key}` });
  } catch (error) {
    console.error(error);
    return fail("Não foi possível enviar a imagem.", 500);
  }
}
