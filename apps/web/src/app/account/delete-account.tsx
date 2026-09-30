'use client';

import { useState } from 'react';
import { Icon } from '@/components/icon';
import { Button, ErrorText } from '@/components/ui';
import { useDeleteAccount } from '@/hooks/use-delete-account';

export function DeleteAccount() {
  const { pending, error, deleteAccount } = useDeleteAccount();
  const [confirming, setConfirming] = useState(false);
  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-danger/25 p-5">
      <h2 className="flex items-center gap-2 text-label-md text-danger">
        <Icon name="warning" /> Delete account
      </h2>
      <p className="text-body-sm text-body">
        Deletes your profile, notifications, devices and fact-check uploads. Completed order records
        are kept for our records. Not possible while an order is in progress.
      </p>
      {confirming ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="destructive" disabled={pending} onClick={() => void deleteAccount()}>
            Yes, delete my account
          </Button>
          <Button variant="outline" onClick={() => setConfirming(false)}>
            Cancel
          </Button>
        </div>
      ) : (
        <Button
          variant="destructive-outline"
          className="self-start"
          onClick={() => setConfirming(true)}
        >
          <Icon name="delete" /> Delete account…
        </Button>
      )}
      <ErrorText>{error}</ErrorText>
    </section>
  );
}
