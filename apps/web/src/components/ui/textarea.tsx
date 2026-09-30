import * as React from 'react';
import { cn } from '@/lib/utils';

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex min-h-16 w-full rounded-lg border border-input bg-background px-3.5 py-3 text-body-md leading-relaxed text-ink transition-[color,box-shadow] outline-none placeholder:text-faint focus-visible:border-ink disabled:cursor-not-allowed disabled:bg-subtle disabled:text-slate aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
