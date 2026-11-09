import { AppLayout } from '@/components/app-layout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <AppLayout role="clipper">{children}</AppLayout>;
}
