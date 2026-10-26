import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Админ-панель — Мамины петельки",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-root min-h-screen bg-bg">{children}</div>;
}
