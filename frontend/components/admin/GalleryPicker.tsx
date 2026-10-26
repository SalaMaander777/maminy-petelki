"use client";

import { moveItem } from "@/lib/admin-validation";
import { PhotoPicker, Thumb } from "./PhotoPicker";
import { Button } from "./ui";
import { useState } from "react";

/** Несколько фото: добавить, поменять порядок, удалить. */
export function GalleryPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [adderKey, setAdderKey] = useState(0);
  return (
    <div className="space-y-3">
      {value.length === 0 && <p className="text-sm text-muted">Дополнительных фото пока нет.</p>}
      <ul className="space-y-2">
        {value.map((url, i) => (
          <li key={`${url}-${i}`} className="flex items-center gap-3 rounded-xl border border-line bg-white p-2">
            <Thumb src={url} alt={`Фото ${i + 1}`} className="h-16 w-16 shrink-0 rounded-lg" />
            <span className="grow text-sm text-muted">Фото {i + 1}</span>
            <Button variant="ghost" aria-label={`Фото ${i + 1}: выше`} disabled={i === 0} onClick={() => onChange(moveItem(value, i, i - 1))}>
              ↑
            </Button>
            <Button variant="ghost" aria-label={`Фото ${i + 1}: ниже`} disabled={i === value.length - 1} onClick={() => onChange(moveItem(value, i, i + 1))}>
              ↓
            </Button>
            <Button variant="ghost" aria-label={`Фото ${i + 1}: удалить`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
              ✕
            </Button>
          </li>
        ))}
      </ul>
      <PhotoPicker
        key={adderKey}
        value={null}
        label="Новое фото в галерею"
        onChange={(u) => {
          if (u) onChange([...value, u]);
          setAdderKey((k) => k + 1);
        }}
      />
    </div>
  );
}
