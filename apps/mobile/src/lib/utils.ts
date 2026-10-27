import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the design-system type and font tokens, so `text-body-sm text-ink`
// keeps both classes and `font-sans font-mono` resolves to the last one.
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      'font-size': [
        {
          text: [
            'display',
            'display-mobile',
            'headline-lg',
            'headline-lg-mobile',
            'headline-md',
            'headline-sm',
            'body-lg',
            'body-md',
            'body-sm',
            'label-md',
            'label-sm',
            'code',
          ],
        },
      ],
      'font-family': [
        { font: ['sans', 'sans-medium', 'sans-semibold', 'display', 'display-bold', 'mono'] },
      ],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
