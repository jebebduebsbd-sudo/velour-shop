export function VelourEmblem({
  className = "h-8 w-8",
}: {
  className?: string;
}) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="velour-emblem" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b2fd6" />
          <stop offset="1" stopColor="#e156f5" />
        </linearGradient>
      </defs>
      <path
        fill="url(#velour-emblem)"
        d="M4 6h5.2l6.8 14.9L22.8 6H28l-9.6 20h-4.8Z"
      />
      <path fill="#eed6ff" d="m26.2 2.6 2 2-2 2-2-2Z" />
    </svg>
  );
}

export function VelourLogo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <VelourEmblem className="h-7 w-7" />
      <span className="text-lg font-bold tracking-[0.22em] text-ink">
        VELOUR
      </span>
    </span>
  );
}
