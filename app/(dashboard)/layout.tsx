import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { Sidebar } from '@/components/dashboard/Sidebar';
import { LogoutButton } from '@/components/dashboard/LogoutButton';
import { DailyStoicGate } from '@/components/dashboard/DailyStoicGate';
import { ThemeProvider } from '@/components/theme/ThemeProvider';

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
    <ThemeProvider>
      <div className="min-h-screen bg-bg relative z-[1]">
        <Sidebar />
        <div className="md:pl-[72px] min-h-screen flex flex-col">
          <header className="h-14 border-b border-border bg-card/95 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 shrink-0">
            <span className="font-display text-lg tracking-wide text-tan">APEX</span>
            <LogoutButton />
          </header>
          <main className="flex-1 p-4 md:p-6 pb-20 md:pb-6">{children}</main>
        </div>
        <DailyStoicGate />
      </div>
    </ThemeProvider>
  );
}
