'use client';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui';
import { useSignOut } from '@/hooks/use-sign-out';

export function SignOutButton() {
  const { pending, signOut } = useSignOut();
  return (
    <Button variant="outline" className="self-start" onClick={signOut} disabled={pending}>
      <Icon name="logout" />
      Sign out
    </Button>
  );
}
