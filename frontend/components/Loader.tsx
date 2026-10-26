export function Loader() {
  return (
    <div
      className="loader fixed inset-0 z-60 flex flex-col items-center justify-center gap-2 bg-bg"
      aria-hidden="true"
    >
      <svg width="200" height="200" viewBox="0 0 200 200">
        <path className="unwind" d="M138 122 C 165 150, 150 178, 118 182 S 66 192, 24 176" fill="none" stroke="#D98FA8" strokeWidth="5" strokeLinecap="round" />
        <g className="ball">
          <circle cx="90" cy="95" r="52" fill="#D98FA8" stroke="#7B2346" strokeWidth="4" />
          <path d="M44 82 C 70 60, 112 60, 138 86" fill="none" stroke="#F3E6C8" strokeWidth="7" strokeLinecap="round" />
          <path d="M40 102 C 70 80, 115 82, 142 106" fill="none" stroke="#F3E6C8" strokeWidth="7" strokeLinecap="round" />
          <path d="M48 122 C 75 102, 112 104, 134 124" fill="none" stroke="#F3E6C8" strokeWidth="7" strokeLinecap="round" />
        </g>
        <g className="needles">
          <line x1="40" y1="28" x2="152" y2="150" stroke="#C99A4B" strokeWidth="5" strokeLinecap="round" />
          <circle cx="40" cy="28" r="7" fill="#C99A4B" stroke="#7B2346" strokeWidth="2" />
          <line x1="148" y1="28" x2="36" y2="150" stroke="#C99A4B" strokeWidth="5" strokeLinecap="round" />
          <circle cx="148" cy="28" r="7" fill="#C99A4B" stroke="#7B2346" strokeWidth="2" />
        </g>
      </svg>
      {/* Подпись — SVG-текст: браузер не считает его LCP-кандидатом (в отличие от DOM-текста). */}
      <svg width="260" height="28" viewBox="0 0 260 28" focusable="false">
        <text
          x="130"
          y="20"
          textAnchor="middle"
          fill="#7B2346"
          fontSize="16"
          fontWeight="800"
          letterSpacing="2.6"
          style={{ fontFamily: "var(--font-nunito), sans-serif" }}
        >
          ВЯЖЕМ УЮТ…
        </text>
      </svg>
    </div>
  );
}
