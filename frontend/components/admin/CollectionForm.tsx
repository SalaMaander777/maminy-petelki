"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import type { CollectionName } from "@/lib/api-types";
import { ApiError, createItem, getItem, listItems, updateItem } from "@/lib/admin-api";
import {
  COLLECTIONS,
  emptyFormState,
  toFormState,
  toPayload,
  validateForm,
  type FieldDef,
  type FormState,
} from "@/lib/admin-collections";
import { GalleryPicker } from "./GalleryPicker";
import { PhotoPicker } from "./PhotoPicker";
import { Button, Card, ErrorBox, Field, Loading, PageHeader, Switch, inputCls, useToast } from "./ui";
import { useUnsavedChanges } from "./unsaved";

export function CollectionForm({ collection, id }: { collection: CollectionName; id?: number }) {
  const def = COLLECTIONS[collection];
  const router = useRouter();
  const toast = useToast();
  const isNew = id === undefined;
  const [state, setState] = useState<FormState | null>(isNew ? emptyFormState(def) : null);
  const [initial, setInitial] = useState<string>(() => JSON.stringify(emptyFormState(def)));
  const [sortOrder, setSortOrder] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    if (isNew) {
      // новый элемент ставим в конец списка
      listItems(collection)
        .then((l) => alive && setSortOrder(Math.max(-1, ...l.map((x) => x.sort_order)) + 1))
        .catch(() => undefined);
    } else {
      getItem(collection, id)
        .then((item) => {
          if (!alive) return;
          const s = toFormState(def, item as unknown as Record<string, unknown>);
          setState(s);
          setInitial(JSON.stringify(s));
          setSortOrder(item.sort_order);
        })
        .catch((e) => alive && setLoadError(e instanceof ApiError ? e.message : "Не удалось загрузить запись."));
    }
    return () => {
      alive = false;
    };
  }, [collection, id, isNew, def]);

  const dirty = state !== null && JSON.stringify(state) !== initial;
  const markClean = useUnsavedChanges(dirty);

  if (loadError) {
    return (
      <>
        <ErrorBox>{loadError}</ErrorBox>
        <p className="mt-4">
          <Link href={`/admin/${collection}`} className="font-semibold text-burgundy underline">
            ← К списку
          </Link>
        </p>
      </>
    );
  }
  if (!state) return <Loading />;

  const set = (name: string, v: string | string[] | null) => {
    setState((s) => (s ? { ...s, values: { ...s.values, [name]: v ?? "" } } : s));
    setErrors((e) => {
      if (!(name in e)) return e;
      const { [name]: _x, ...rest } = e;
      void _x;
      return rest;
    });
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!state) return;
    setFormError("");
    const errs = validateForm(def, state);
    setErrors(errs);
    if (Object.keys(errs).length) {
      setFormError("Проверьте поля: есть ошибки.");
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setSaving(true);
    try {
      const payload = toPayload(def, state, sortOrder);
      if (isNew) await createItem(collection, payload as never);
      else await updateItem(collection, id, payload as never);
      markClean();
      toast("Сохранено");
      router.push(`/admin/${collection}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setFormError(err.status === 422 ? "Проверьте поля: сервер нашёл ошибки." : err.message);
      } else setFormError("Не удалось сохранить. Попробуйте ещё раз.");
      setSaving(false);
    }
  }

  function renderField(f: FieldDef) {
    const raw = state!.values[f.name];
    const val = typeof raw === "string" ? raw : "";
    const err = errors[f.name];
    if (f.type === "photo") {
      return (
        <fieldset key={f.name} className="space-y-1.5">
          <legend className="text-base font-semibold">{f.label}</legend>
          <PhotoPicker label={f.label} value={val || null} onChange={(u) => set(f.name, u)} />
          {err && <p role="alert" className="text-sm font-semibold text-[#a4262c]">{err}</p>}
        </fieldset>
      );
    }
    if (f.type === "gallery") {
      return (
        <fieldset key={f.name} className="space-y-1.5">
          <legend className="text-base font-semibold">{f.label}</legend>
          <GalleryPicker value={Array.isArray(raw) ? raw : []} onChange={(v) => set(f.name, v)} />
          {err && <p role="alert" className="text-sm font-semibold text-[#a4262c]">{err}</p>}
        </fieldset>
      );
    }
    return (
      <Field
        key={f.name}
        label={f.label}
        required={f.required}
        error={err}
        hint={f.hint}
        counter={f.type === "textarea" && f.max ? { value: val.length, max: f.max } : undefined}
      >
        {(p) => {
          if (f.type === "textarea")
            return <textarea {...p} rows={5} className={inputCls} value={val} onChange={(e) => set(f.name, e.target.value)} />;
          if (f.type === "rating")
            return (
              <select {...p} className={inputCls} value={val} onChange={(e) => set(f.name, e.target.value)}>
                <option value="">Без оценки</option>
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} из 5
                  </option>
                ))}
              </select>
            );
          const type = f.type === "datetime" ? "datetime-local" : f.type === "date" ? "date" : f.type === "url" ? "url" : "text";
          return (
            <input
              {...p}
              type={type}
              inputMode={f.type === "int" ? "numeric" : undefined}
              className={inputCls}
              value={val}
              placeholder={f.placeholder}
              onChange={(e) => set(f.name, e.target.value)}
            />
          );
        }}
      </Field>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <PageHeader
        title={isNew ? def.newLabel : `Изменить: ${def.label}`}
        back={
          <Link href={`/admin/${collection}`} className="inline-flex min-h-11 items-center font-semibold text-burgundy underline">
            ← К списку «{def.label}»
          </Link>
        }
      />
      <Card className="space-y-5">
        {formError && <ErrorBox>{formError}</ErrorBox>}
        {def.fields.map(renderField)}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-pink-soft p-3">
          <div>
            <p className="font-semibold">Показывать на сайте</p>
            <p className="text-sm text-muted">{state.is_published ? "Запись опубликована" : "Запись скрыта"}</p>
          </div>
          <Switch
            checked={state.is_published}
            label="Показывать на сайте"
            onChange={(v) => setState((s) => (s ? { ...s, is_published: v } : s))}
          />
        </div>
      </Card>
      <div className="sticky bottom-0 -mx-4 mt-4 flex flex-wrap items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
        <Button type="submit" busy={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
        <Link href={`/admin/${collection}`} className="inline-flex min-h-11 items-center px-3 font-semibold text-burgundy underline">
          Отмена
        </Link>
        {dirty && !saving && <span className="text-sm text-muted">Есть несохранённые изменения</span>}
      </div>
    </form>
  );
}
