import { requireAdmin } from "@/lib/admin";
import { redirect } from "next/navigation";
import AdminPanel from "./panel";
export const dynamic = "force-dynamic";
export default async function AdminPage() { if (!await requireAdmin()) redirect("/admin/login"); return <AdminPanel />; }
