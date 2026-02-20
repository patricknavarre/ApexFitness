import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/dashboard/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect('/auth/login?session=redirect');
  }
  return (
    <div className="min-h-screen bg-bg">
      <Sidebar />
      <div className="md:pl-[72px] min-h-screen flex flex-col">
        <header className="h-14 border-b border-border bg-card flex items-center px-4 md:px-6 shrink-0">
          <span className="font-sans text-muted text-sm">APEX</span>
        </header>
        <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
