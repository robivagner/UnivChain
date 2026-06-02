type Props = {
  size?: "sm" | "md";
};

export function UnivChainLogo({ size = "md" }: Props) {
  const iconSize = size === "sm" ? 28 : 36;

  return (
    <div className="flex items-center gap-3">
      <div
        className="relative flex shrink-0 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-uc-gold/20 via-uc-violet/10 to-uc-cyan/10 shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
        style={{ width: iconSize, height: iconSize }}
        aria-hidden
      >
        <svg viewBox="0 0 24 24" className="h-[58%] w-[58%]" fill="none">
          <path
            d="M12 3L4 7.5V16.5L12 21L20 16.5V7.5L12 3Z"
            stroke="url(#uc-logo-stroke)"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path
            d="M12 8V16M8.5 10.5L15.5 13.5M15.5 10.5L8.5 13.5"
            stroke="url(#uc-logo-stroke)"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <defs>
            <linearGradient id="uc-logo-stroke" x1="4" y1="3" x2="20" y2="21">
              <stop stopColor="#e8b86d" />
              <stop offset="0.5" stopColor="#a78bfa" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      <div className="flex flex-col leading-none">
        <span
          className={`font-semibold tracking-tight text-uc-text ${
            size === "sm" ? "text-base" : "text-lg"
          }`}
        >
          UnivChain
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-uc-muted">
          Academic portal
        </span>
      </div>
    </div>
  );
}
