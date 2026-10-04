import { pageMetadata } from '@/lib/seo';
import { Icon, type IconName } from '@/components/icon';
import { supportContacts } from '@/components/site/support';
import { Notice, Page, PageHeader } from '@/components/ui';

export const metadata = pageMetadata(
  '/support',
  'Contact & Support',
  'Contact NewsVio for help with PR publishing, payments, fact-check reports or corrections through the available support channels.',
);

export default async function SupportPage({ searchParams }: PageProps<'/support'>) {
  const s = await supportContacts();
  const sp = await searchParams;
  const order = typeof sp.order === 'string' ? sp.order.slice(0, 40) : '';
  const msg = encodeURIComponent(
    order ? `Hi, I need help with order ${order}.` : 'Hi, I need help.',
  );
  const channels: {
    href: string;
    label: string;
    detail: string;
    icon: IconName;
    external?: boolean;
  }[] = [
    ...(s.whatsapp
      ? [
          {
            href: `https://wa.me/${s.whatsapp.replace(/\D/g, '')}?text=${msg}`,
            label: 'WhatsApp us',
            detail: s.whatsapp,
            icon: 'chat' as const,
            external: true,
          },
        ]
      : []),
    ...(s.phone
      ? [{ href: `tel:${s.phone}`, label: 'Call us', detail: s.phone, icon: 'call' as const }]
      : []),
    ...(s.email
      ? [
          {
            href: `mailto:${s.email}?subject=${encodeURIComponent(order ? `Order ${order}` : 'Support')}`,
            label: 'Email us',
            detail: s.email,
            icon: 'mail' as const,
          },
        ]
      : []),
  ];
  return (
    <Page width="md">
      <PageHeader
        eyebrow="Support"
        title="How can we help?"
        lede="We're happy to help with orders, payments and fact checks."
      />
      {order ? (
        <Notice>
          About order <span className="font-mono text-ink">{order}</span>
        </Notice>
      ) : null}
      <ul className="grid gap-3 sm:grid-cols-3">
        {channels.map((c) => (
          <li key={c.label}>
            <a
              href={c.href}
              target={c.external ? '_blank' : undefined}
              rel={c.external ? 'noreferrer' : undefined}
              className="group flex h-full flex-col gap-4 rounded-2xl border border-hairline bg-canvas p-5 transition-colors hover:border-ink"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-lg border border-hairline bg-subtle text-brand">
                <Icon name={c.icon} />
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-label-md text-ink">{c.label}</span>
                <span className="font-mono text-code break-all text-slate">{c.detail}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
      <dl className="flex flex-col divide-y divide-divider rounded-2xl border border-hairline">
        {s.hours ? (
          <div className="flex items-start gap-3 px-4 py-3.5 text-body-sm">
            <Icon name="schedule" className="text-slate" />
            <dt className="text-slate">Hours</dt>
            <dd className="ml-auto text-ink">{s.hours}</dd>
          </div>
        ) : null}
        <div className="flex items-start gap-3 px-4 py-3.5 text-body-sm">
          <Icon name="payments" className="text-slate" />
          <dt className="text-slate">Refunds</dt>
          <dd className="ml-auto text-right text-ink">
            5–7 working days to reach your bank after we process them
          </dd>
        </div>
      </dl>
    </Page>
  );
}
