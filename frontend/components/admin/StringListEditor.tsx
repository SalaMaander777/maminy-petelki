"use client";

import { useState } from "react";
import { moveItem } from "@/lib/admin-validation";
import { Button, inputCls } from "./ui";

/** Список строк: добавить, изменить, удалить, переставить. */
export function StringListEditor({
  value,
  onChange,
  label,
  addLabel = "Добавить строку",
}: {
  value: string[];
  onChange: (v: string[]) => void;
  label: string;
  addLabel?: string;
}) {
  const [draft, setDraft] = useState("");
  function add() {
    const t = draft.trim();
    if (!t) return;
    onChange([...value, t]);
    setDraft("");
  }
  return (
    <div className="space-y-2">
      {value.length === 0 && <p className="text-sm text-muted">Строк пока нет.</p>}
      <ul className="space-y-2">
        {value.map((s, i) => (
          <li key={i} className="flex items-center gap-1">
            <input
              aria-label={`${label}, строка ${i + 1}`}
              className={inputCls}
              value={s}
              onChange={(e) => onChange(value.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <Button variant="ghost" aria-label={`Строка ${i + 1}: выше`} disabled={i === 0} onClick={() => onChange(moveItem(value, i, i - 1))}>
              ↑
            </Button>
            <Button variant="ghost" aria-label={`Строка ${i + 1}: ниже`} disabled={i === value.length - 1} onClick={() => onChange(moveItem(value, i, i + 1))}>
              ↓
            </Button>
            <Button variant="ghost" aria-label={`Строка ${i + 1}: удалить`} onClick={() => onChange(value.filter((_, j) => j !== i))}>
              ✕
            </Button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <input
          aria-label="Новая строка"
          className={inputCls}
          value={draft}
          placeholder="Новая строка"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
        />
        <Button variant="secondary" onClick={add} className="shrink-0">
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
