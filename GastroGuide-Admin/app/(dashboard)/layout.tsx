import { requireAdmin } from "@/lib/auth/server";

import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0">
        <Navbar admin={admin} />
        <main className="flex-1 px-6 py-6">{children}</main>
      </div>
    </div>
  );
}
