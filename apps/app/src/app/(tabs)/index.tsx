import { authClient } from '@/lib/auth-client';
import { AdminHome } from '@/screens/AdminHome';
import { CustomerHome } from '@/screens/CustomerHome';
import { ProHome } from '@/screens/ProHome';

/** Tela inicial conforme o papel do usuário (sessão já garantida pelo layout das abas). */
export default function Home() {
  const { data: session } = authClient.useSession();
  if (session?.user.role === 'admin') return <AdminHome />;
  if (session?.user.role === 'pro') return <ProHome />;
  return <CustomerHome />;
}
