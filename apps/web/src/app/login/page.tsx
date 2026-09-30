import { redirect } from 'next/navigation';
import { Notice, Page, PageHeader } from '@/components/ui';
import { getCurrentUser, safeNext } from '@/server/session';
import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === 'string' ? params.next : null);
  const me = await getCurrentUser();
  if (me)
    redirect(me.profileComplete ? next : `/complete-profile?next=${encodeURIComponent(next)}`);

  return (
    <Page width="sm">
      <PageHeader
        eyebrow="Welcome"
        title="Sign in"
        lede="Save your fact checks and track your published stories."
      />
      {params.error ? (
        <Notice tone="danger">
          <span role="alert">Sign-in didn&apos;t complete. Please try again.</span>
        </Notice>
      ) : null}
      <LoginForm next={next} />
    </Page>
  );
}
