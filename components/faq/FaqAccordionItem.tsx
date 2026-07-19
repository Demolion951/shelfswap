/**
 * Single DaisyUI collapse row for the FAQ accordion.
 * Location: components/faq/FaqAccordionItem.tsx
 */
type Props = {
  id?: string;
  title: string;
  name: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

export function FaqAccordionItem({
  id,
  title,
  name,
  defaultOpen = false,
  children,
}: Props) {
  return (
    <div
      id={id}
      className="collapse collapse-arrow border border-base-300/80 bg-base-100 scroll-mt-24"
    >
      <input type="checkbox" name={name} defaultChecked={defaultOpen} aria-label={title} />
      <div className="collapse-title text-sm font-semibold text-base-content pr-10">
        {title}
      </div>
      <div className="collapse-content text-sm leading-relaxed text-base-content/85">
        <div className="space-y-3 border-t border-base-300/50 pb-1 pt-3">{children}</div>
      </div>
    </div>
  );
}
