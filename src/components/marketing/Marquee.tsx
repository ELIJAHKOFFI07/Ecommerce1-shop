export function Marquee({
  items,
  reverse = false,
}: {
  items: string[];
  reverse?: boolean;
}) {
  const doubled = [...items, ...items];
  return (
    <div className="relative flex overflow-hidden border-y border-border py-4">
      <div
        className={`flex shrink-0 gap-8 whitespace-nowrap ${
          reverse ? "animate-marquee-right" : "animate-marquee-left"
        }`}
      >
        {doubled.map((item, i) => (
          <span
            key={i}
            className="flex items-center gap-8 text-2xl font-medium text-muted"
          >
            {item}
            <span className="text-accent">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
