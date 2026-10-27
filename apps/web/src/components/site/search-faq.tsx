export type SearchQuestion = { q: string; a: string };

export function SearchFaq({
  title,
  questions,
}: {
  title: string;
  questions: readonly SearchQuestion[];
}) {
  return (
    <section className="flex flex-col gap-5 border-t border-hairline pt-8">
      <h2 className="font-display text-headline-md text-ink">{title}</h2>
      <dl className="flex flex-col divide-y divide-divider">
        {questions.map(({ q, a }) => (
          <div key={q} className="flex flex-col gap-2 py-4">
            <dt className="text-label-md text-ink">{q}</dt>
            <dd className="text-body-md text-body">{a}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
