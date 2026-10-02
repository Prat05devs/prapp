import { redirect } from 'next/navigation';
import { Page, PageHeader } from '@/components/ui';
import { getCurrentUser, safeNext } from '@/server/session';
import { CompleteProfileForm } from './complete-profile-form';

export default async function CompleteProfilePage({
  searchParams,
}: PageProps<'/complete-profile'>) {
  const params = await searchParams;
  const next = safeNext(typeof params.next === 'string' ? params.next : null);
  const me = await getCurrentUser();
  if (!me) redirect(`/login?next=${encodeURIComponent('/complete-profile')}`);
  if (me.profileComplete) redirect(next);

  return (
    <Page width="sm">
      <PageHeader
        eyebrow="One last step"
        title="Complete your profile"
        lede="We need your name and phone number before you can place an order."
      />
      <div className="rounded-2xl border border-hairline bg-subtle p-5 sm:p-6">
        <CompleteProfileForm initialName={me.fullName} next={next} />
      </div>
    </Page>
  );
}
