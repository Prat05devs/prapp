import { redirect } from 'next/navigation';
import { Notice, Page, PageHeader } from '@/components/ui';
import { getCurrentUser, safeNext } from '@/server/session';
import { LoginForm } from './login-form';

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === 'string' ? params.next : null);
  const mode = params.mode === 'signup' ? 'signup' : 'login';
  const me = await getCurrentUser();
  if (me)
    redirect(me.profileComplete ? next : `/complete-profile?next=${encodeURIComponent(next)}`);

  return (
    <Page width="sm">
      <PageHeader
        eyebrow="Welcome to NewsVio"
        title={mode === 'signup' ? 'Create your account' : 'Log in'}
        lede="Save your fact checks and track your published stories."
      />
      {params.error ? (
        <Notice tone="danger">
          <span role="alert">
            {params.error === 'link'
              ? 'That sign-in link has expired or was already used. Request a new code below.'
              : 'Sign-in didn’t complete. Please try again.'}
          </span>
        </Notice>
      ) : null}
      <LoginForm next={next} initialMode={mode} />
    </Page>
  );
}
