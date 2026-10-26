"use client";

import { useEffect, useState } from "react";
import type { MediaFile } from "@/lib/api-types";
import { ApiError, listMedia } from "@/lib/admin-api";
import { UploadZone } from "./UploadZone";
import { Button, Dialog, ErrorBox, Loading, cx } from "./ui";

/** Миниатюра. Фото из /uploads: обычный <img>, чтобы не зависеть от настроек next/image. */
export function Thumb({ src, alt = "", className }: { src: string | null; alt?: string; className?: string }) {
  if (!src) {
    return (
      <span
        aria-hidden="true"
        className={cx("flex items-center justify-center bg-pink-soft p-1 text-center text-xs text-muted", className)}
      >
        нет фото
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" className={cx("object-cover", className)} />;
}

function Chooser({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [files, setFiles] = useState<MediaFile[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    listMedia()
      .then((f) => setFiles([...f].reverse()))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить список фото."));
  }, []);
  return (
    <Dialog title="Выбор фото" onClose={onClose} wide>
      <div className="mb-4">
        <UploadZone compact label="Загрузить новое фото" onUploaded={(u) => onPick(u[0])} />
      </div>
      <h3 className="mb-2 font-bold text-ink">Или выберите из загруженных</h3>
      {error && <ErrorBox>{error}</ErrorBox>}
      {!files && !error && <Loading />}
      {files && files.length === 0 && <p className="text-muted">Загруженных фото пока нет.</p>}
      {files && files.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((f) => (
            <li key={f.url}>
              <button
                type="button"
                onClick={() => onPick(f.url)}
                aria-label="Выбрать это фото"
                className="block aspect-square w-full overflow-hidden rounded-xl border-2 border-line hover:border-burgundy"
              >
                <Thumb src={f.url} className="h-full w-full" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" onClick={onClose}>
          Закрыть
        </Button>
      </div>
    </Dialog>
  );
}

interface Props {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
}

/** Выбор одного фото: предпросмотр, загрузить/выбрать, убрать. */
export function PhotoPicker({ value, onChange, label = "Фото" }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        <Thumb src={value} alt={value ? `${label}: предпросмотр` : ""} className="h-24 w-24 shrink-0 rounded-xl border border-line" />
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setOpen(true)}>
            {value ? "Заменить фото" : "Добавить фото"}
          </Button>
          {value && (
            <Button variant="ghost" onClick={() => onChange(null)}>
              Убрать фото
            </Button>
          )}
        </div>
      </div>
      {!value && <p className="text-sm text-muted">Фото не выбрано. Подходит: JPG, PNG или WebP, до 8 МБ.</p>}
      {open && (
        <Chooser
          onClose={() => setOpen(false)}
          onPick={(u) => {
            onChange(u);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
