import { redirect } from 'next/navigation';
import { Page, PageHeader } from '@/components/ui';
import { getCurrentUser } from '@/server/session';
import { TeamLoginForm } from './team-login-form';

/** Email + password login for the content team; accounts are created by an admin. */
export default async function TeamLoginPage() {
  const me = await getCurrentUser();
  if (me && (me.role === 'editor' || me.role === 'admin')) redirect('/admin');
  return (
    <Page width="sm">
      <PageHeader
        eyebrow="NewsVio team"
        title="Team login"
        lede="For editors and admins. Use the email and password your admin gave you."
      />
      <TeamLoginForm />
    </Page>
  );
}
