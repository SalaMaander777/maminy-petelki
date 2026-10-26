"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { CollectionMap, CollectionName } from "@/lib/api-types";
import { ApiError, deleteItem, listItems, reorderItems, updateItem } from "@/lib/admin-api";
import { COLLECTIONS, itemTitle } from "@/lib/admin-collections";
import { moveItem } from "@/lib/admin-validation";
import { Thumb } from "./PhotoPicker";
import { Button, ConfirmDialog, ErrorBox, Loading, PageHeader, Switch, cx, inputCls, useToast } from "./ui";

/** Стрелки ↑↓: область не меньше 44px, тёмный читаемый цвет, крупнее на мобильном. */
const ARROW_CLS = "h-11 w-11 shrink-0 !px-0 text-3xl font-extrabold leading-none text-burgundy disabled:text-muted";

type Item = CollectionMap[CollectionName] & Record<string, unknown>;

export function CollectionList({ collection }: { collection: CollectionName }) {
  const def = COLLECTIONS[collection];
  const toast = useToast();
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Item | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [dragId, setDragId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(() => {
    listItems(collection)
      .then((r) => setItems(r as Item[]))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Не удалось загрузить список."));
  }, [collection]);
  useEffect(load, [load]);

  const searching = query.trim().length > 0;
  const visible = useMemo(() => {
    if (!items) return [];
    const q = query.trim().toLowerCase();
    return q ? items.filter((i) => itemTitle(def, i).toLowerCase().includes(q)) : items;
  }, [items, query, def]);

  async function togglePublished(item: Item) {
    const next = !item.is_published;
    setBusyId(item.id);
    setItems((l) => l && l.map((x) => (x.id === item.id ? { ...x, is_published: next } : x)));
    try {
      const { id: _id, ...rest } = item;
      void _id;
      await updateItem(collection, item.id, { ...rest, is_published: next } as never);
      toast(next ? "Показано на сайте" : "Скрыто с сайта");
    } catch (e) {
      setItems((l) => l && l.map((x) => (x.id === item.id ? { ...x, is_published: !next } : x)));
      toast(e instanceof ApiError ? e.message : "Не удалось изменить статус", "error");
    } finally {
      setBusyId(null);
    }
  }

  async function applyOrder(next: Item[]) {
    const prev = items;
    setItems(next);
    try {
      await reorderItems(collection, next.map((i) => i.id));
      toast("Порядок сохранён");
    } catch (e) {
      setItems(prev);
      toast(e instanceof ApiError ? e.message : "Не удалось сохранить порядок", "error");
    }
  }

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteItem(collection, toDelete.id);
      setItems((l) => l && l.filter((x) => x.id !== toDelete.id));
      toast("Удалено");
      setToDelete(null);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : "Не удалось удалить", "error");
      setToDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  function onDrop(targetId: number) {
    if (dragId === null || dragId === targetId || !items) return;
    const from = items.findIndex((i) => i.id === dragId);
    const to = items.findIndex((i) => i.id === targetId);
    setDragId(null);
    void applyOrder(moveItem(items, from, to));
  }

  return (
    <>
      <PageHeader title={def.label}>
        <Link
          href={`/admin/${collection}/new`}
          className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-burgundy bg-burgundy px-4 py-2 font-semibold text-bg hover:bg-[#62193a]"
        >
          + Добавить
        </Link>
      </PageHeader>

      {error && (
        <div className="space-y-3">
          <ErrorBox>{error}</ErrorBox>
          <Button onClick={() => (setError(""), load())}>Повторить</Button>
        </div>
      )}
      {!items && !error && <Loading />}

      {items && items.length > 0 && (
        <div className="mb-4">
          <label htmlFor="list-search" className="mb-1 block font-semibold">
            Поиск по названию
          </label>
          <input
            id="list-search"
            type="search"
            className={inputCls}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Начните вводить название"
          />
          {searching && <p className="mt-1 text-sm text-muted">Пока идёт поиск, менять порядок нельзя — очистите поле поиска.</p>}
        </div>
      )}

      {items && items.length === 0 && <p className="rounded-2xl border border-dashed border-pink bg-white p-6 text-center text-muted">{def.emptyText}</p>}
      {items && items.length > 0 && visible.length === 0 && <p className="text-muted">Ничего не найдено.</p>}

      {visible.length > 0 && (
        <ul className="space-y-2" aria-label={def.label}>
          {visible.map((item) => {
            const idx = items!.findIndex((i) => i.id === item.id);
            const title = itemTitle(def, item) || "Без названия";
            const sub = def.descriptionField ? String(item[def.descriptionField] ?? "") : "";
            return (
              <li
                key={item.id}
                draggable={!searching}
                onDragStart={() => setDragId(item.id)}
                onDragEnd={() => setDragId(null)}
                onDragOver={(e) => !searching && e.preventDefault()}
                onDrop={() => onDrop(item.id)}
                className={cx(
                  "flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-white p-3",
                  dragId === item.id && "opacity-50",
                  !item.is_published && "bg-[#f4efea]",
                )}
              >
                <Thumb src={(item.photo as string | null) ?? null} className="h-16 w-16 shrink-0 rounded-xl" />
                <div className="min-w-0 grow basis-40">
                  <Link href={`/admin/${collection}/${item.id}`} className="block truncate text-lg font-bold text-burgundy hover:underline">
                    {title}
                  </Link>
                  {sub && <p className="truncate text-sm text-muted">{sub}</p>}
                  <p className={cx("text-sm font-semibold", item.is_published ? "text-[#1d6b3a]" : "text-[#7a4a00]")}>
                    {item.is_published ? "Опубликовано" : "Скрыто"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-1 gap-y-1 max-sm:w-full max-sm:justify-between">
                  <Switch
                    checked={item.is_published}
                    disabled={busyId === item.id}
                    label={`${title}: показывать на сайте`}
                    onChange={() => void togglePublished(item)}
                  />
                  <Button
                    variant="ghost"
                    className={ARROW_CLS}
                    aria-label={`Переместить «${title}» выше`}
                    disabled={searching || idx === 0}
                    onClick={() => void applyOrder(moveItem(items!, idx, idx - 1))}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="ghost"
                    className={ARROW_CLS}
                    aria-label={`Переместить «${title}» ниже`}
                    disabled={searching || idx === items!.length - 1}
                    onClick={() => void applyOrder(moveItem(items!, idx, idx + 1))}
                  >
                    ↓
                  </Button>
                  <Link
                    href={`/admin/${collection}/${item.id}`}
                    aria-label={`Изменить «${title}»`}
                    className="inline-flex min-h-11 items-center rounded-xl px-2 font-semibold sm:px-3 text-burgundy hover:bg-pink-soft"
                  >
                    Изменить
                  </Link>
                  <Button variant="ghost" aria-label={`Удалить «${title}»`} onClick={() => setToDelete(item)} className="!px-2 text-[#a4262c] sm:!px-4">
                    Удалить
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toDelete && (
        <ConfirmDialog
          title="Удалить запись?"
          text={`«${itemTitle(def, toDelete) || "Без названия"}» будет удалена безвозвратно. Если хотите просто убрать с сайта — лучше скройте её переключателем.`}
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => setToDelete(null)}
        />
      )}
    </>
  );
}
