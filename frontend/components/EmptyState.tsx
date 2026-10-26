export function EmptyState({ message = "Скоро здесь появятся изделия — загляните позже" }: { message?: string }) {
  return (
    <div
      role="status"
      className="anim-rise mx-auto flex max-w-[560px] flex-col items-center gap-5 rounded-[28px] bg-pink-soft px-6 py-12 text-center sm:py-16"
    >
      <svg width="140" height="120" viewBox="0 0 200 170" aria-hidden="true" className="float-slow">
        <path d="M138 122 C 165 150, 150 168, 118 164 S 66 160, 24 156" fill="none" stroke="#D98FA8" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 10" />
        <circle cx="90" cy="80" r="52" fill="#D98FA8" stroke="#7B2346" strokeWidth="4" />
        <path d="M44 67 C 70 45, 112 45, 138 71" fill="none" stroke="#F3E6C8" strokeWidth="7" strokeLinecap="round" />
        <path d="M40 87 C 70 65, 115 67, 142 91" fill="none" stroke="#F3E6C8" strokeWidth="7" strokeLinecap="round" />
        <path d="M48 107 C 75 87, 112 89, 134 109" fill="none" stroke="#F3E6C8" strokeWidth="7" strokeLinecap="round" />
      </svg>
      <p className="m-0 text-xl font-extrabold text-burgundy sm:text-2xl">{message}</p>
    </div>
  );
}
