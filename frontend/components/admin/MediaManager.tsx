"use client";

import { useCallback, useEffect, useState } from "react";
import type { MediaFile } from "@/lib/api-types";
import { ApiError, deleteMedia, listMedia } from "@/lib/admin-api";
import { formatBytes } from "@/lib/admin-validation";
import { Thumb } from "./PhotoPicker";
import { UploadZone } from "./UploadZone";
import { Button, Card, ConfirmDialog, ErrorBox, Loading, PageHeader, useToast } from "./ui";

export function MediaManager() {
  const toast = useToast();
  const [files, setFiles] = useState<MediaFile[] | null>(null);
  const [error, setError] = useState("");
  const [toDelete, setToDelete] = useState<MediaFile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    listMedia()
      .then((r) => setFiles([...r].reverse()))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить список фото."));
  }, []);
  useEffect(load, [load]);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteMedia(toDelete.url);
      setFiles((l) => l && l.filter((f) => f.url !== toDelete.url));
      toast("Фото удалено");
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Не удалось удалить", "error");
    } finally {
      setDeleting(false);
      setToDelete(null);
    }
  }

  return (
    <>
      <PageHeader title="Фото" />
      <Card className="mb-6">
        <UploadZone
          multiple
          onUploaded={(urls) => {
            toast(urls.length > 1 ? `Загружено фото: ${urls.length}` : "Фото загружено");
            load();
          }}
        />
      </Card>
      {error && <ErrorBox>{error}</ErrorBox>}
      {!files && !error && <Loading />}
      {files && files.length === 0 && <p className="rounded-2xl border border-dashed border-pink bg-white p-6 text-center text-muted">Загруженных фото пока нет.</p>}
      {files && files.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {files.map((f) => (
            <li key={f.url} className="overflow-hidden rounded-2xl border border-line bg-white">
              <Thumb src={f.url} className="aspect-square w-full" />
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="text-sm text-muted">{formatBytes(f.size)}</span>
                <Button variant="ghost" aria-label="Удалить это фото" onClick={() => setToDelete(f)} className="text-[#a4262c]">
                  Удалить
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {toDelete && (
        <ConfirmDialog
          title="Удалить фото?"
          text="Фото будет удалено с сервера. Если оно используется в карточке или на главной, там оно перестанет показываться."
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
