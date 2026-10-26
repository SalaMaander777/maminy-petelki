"use client";

import { useState, useSyncExternalStore } from "react";
import { getRaw, getServerRaw, parseFavorites, subscribe, toggleFavorite } from "@/lib/favorites";

export function FavoriteButton({ id, name }: { id: string; name: string }) {
  const raw = useSyncExternalStore(subscribe, getRaw, getServerRaw);
  const on = parseFavorites(raw).includes(id);
  const [popped, setPopped] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`Сохранить: ${name}`}
      onClick={() => {
        setPopped(!on);
        toggleFavorite(id);
      }}
      className={`heart absolute right-3.5 top-3.5 flex size-11 cursor-pointer items-center justify-center rounded-full border-0 shadow-[0_4px_12px_rgba(59,42,51,0.15)] ${
        on ? "bg-burgundy" : "bg-bg"
      }`}
    >
      <svg
        width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"
        className={on && popped ? "heart-pop" : undefined}
        fill={on ? "#D98FA8" : "none"} stroke="#7B2346" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      >
        <path d="M12 20.5s-8-4.9-8-11A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5c0 6.1-8 11-8 11z" />
      </svg>
    </button>
  );
}
