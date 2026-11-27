import { AdminShell } from "@/components/shell/admin-shell";
import { requireAdmin } from "@/lib/require-admin";

export default async function ConsoleLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireAdmin();
  return <AdminShell>{children}</AdminShell>;
}
