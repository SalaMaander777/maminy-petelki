"use client";

import { useRef, useState } from "react";
import { ApiError, uploadMedia } from "@/lib/admin-api";
import { IMAGE_RULES_TEXT, validateImageFile } from "@/lib/admin-validation";
import { Button, cx } from "./ui";

interface Props {
  onUploaded: (urls: string[]) => void;
  multiple?: boolean;
  /** кнопка без области перетаскивания */
  compact?: boolean;
  label?: string;
}

/** Загрузка фото: кнопка «Выбрать файл» + перетаскивание. Проверяет тип и размер до отправки. */
export function UploadZone({ onUploaded, multiple, compact, label = "Выбрать файл" }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [over, setOver] = useState(false);

  async function handle(files: FileList | File[] | null) {
    const list = Array.from(files ?? []);
    if (!list.length) return;
    const errs: string[] = [];
    const ok: File[] = [];
    for (const f of list.slice(0, multiple ? 20 : 1)) {
      const e = validateImageFile(f);
      if (e) errs.push(e);
      else ok.push(f);
    }
    setErrors(errs);
    if (!ok.length) return;
    setBusy(true);
    const urls: string[] = [];
    for (const f of ok) {
      try {
        const r = await uploadMedia(f);
        urls.push(r.url);
      } catch (e) {
        errs.push(`«${f.name}»: ${e instanceof ApiError ? e.message : "не удалось загрузить"}`);
      }
    }
    setErrors([...errs]);
    setBusy(false);
    if (urls.length) onUploaded(urls);
    if (input.current) input.current.value = "";
  }

  const hidden = (
    <input
      ref={input}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      multiple={multiple}
      className="sr-only"
      tabIndex={-1}
      aria-label={label}
      data-testid="file-input"
      onChange={(e) => void handle(e.target.files)}
    />
  );

  return (
    <div>
      <div
        onDragOver={compact ? undefined : (e) => (e.preventDefault(), setOver(true))}
        onDragLeave={compact ? undefined : () => setOver(false)}
        onDrop={
          compact
            ? undefined
            : (e) => {
                e.preventDefault();
                setOver(false);
                void handle(e.dataTransfer.files);
              }
        }
        className={cx(
          compact ? "" : "rounded-2xl border-2 border-dashed p-5 text-center",
          !compact && (over ? "border-burgundy bg-pink-soft" : "border-pink bg-white"),
        )}
      >
        {!compact && <p className="mb-3 text-base text-ink">Перетащите фото сюда или выберите файл</p>}
        {hidden}
        <Button variant={compact ? "secondary" : "primary"} busy={busy} onClick={() => input.current?.click()}>
          {busy ? "Загружаем…" : label}
        </Button>
        <p className="mt-2 text-sm text-muted">{IMAGE_RULES_TEXT}</p>
      </div>
      <div aria-live="polite">
        {errors.map((e) => (
          <p key={e} role="alert" className="mt-2 text-sm font-semibold text-[#a4262c]">
            {e}
          </p>
        ))}
      </div>
    </div>
  );
}
