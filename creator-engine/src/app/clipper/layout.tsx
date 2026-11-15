import { AppLayout } from '@/components/app-layout';
import { MoneyAlert } from '@/components/money-alert';

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <AppLayout role="clipper">
      <MoneyAlert />
      {children}
    </AppLayout>
  );
}
