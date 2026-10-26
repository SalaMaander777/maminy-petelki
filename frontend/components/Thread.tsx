export function Thread() {
  return (
    <div aria-hidden="true" className="relative mx-auto mt-2 h-[60px] w-full max-w-[1440px] sm:h-[110px]">
      <svg viewBox="0 0 1440 110" preserveAspectRatio="none" className="block h-full w-full overflow-visible">
        <path
          className="thread-pink"
          d="M0 55 C 160 5, 320 105, 520 55 S 860 5, 1000 55 S 1280 105, 1440 55"
          fill="none" stroke="#D98FA8" strokeWidth="5" strokeLinecap="round" vectorEffect="non-scaling-stroke"
        />
        <path
          className="thread-gold"
          d="M0 62 C 160 12, 320 112, 520 62 S 860 12, 1000 62 S 1280 112, 1440 62"
          fill="none" stroke="#C99A4B" strokeWidth="2" strokeLinecap="round" strokeDasharray="3 9" vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}
