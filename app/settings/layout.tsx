import { Sidebar } from "@/components/sidebar";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-zenshin-cream">
      <Sidebar />
      <main className="pl-16 min-h-screen">{children}</main>
    </div>
  );
}
