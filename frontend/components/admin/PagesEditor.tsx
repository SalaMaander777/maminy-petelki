"use client";

import { useEffect, useState } from "react";
import type { PageContent, PageSlug } from "@/lib/api-types";
import { ApiError, getPages, savePage } from "@/lib/admin-api";
import { PAGE_LABELS, PAGE_SLUGS } from "@/lib/admin-collections";
import { Button, Card, ErrorBox, Field, Loading, PageHeader, inputCls, useToast } from "./ui";
import { useUnsavedChanges } from "./unsaved";

function PageCard({
  page,
  saved,
  onChange,
  onSaved,
}: {
  page: PageContent;
  saved: PageContent;
  onChange: (p: PageContent) => void;
  onSaved: (p: PageContent) => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const dirty = JSON.stringify(page) !== JSON.stringify(saved);
  const set = (k: keyof PageContent, v: string) => onChange({ ...page, [k]: v });

  async function save() {
    setBusy(true);
    setError("");
    setErrors({});
    try {
      const r = await savePage(page);
      onSaved(r ?? page);
      toast(`Сохранено: «${PAGE_LABELS[page.slug]}»`);
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fieldErrors);
        setError(e.status === 422 ? "Проверьте поля: сервер нашёл ошибки." : e.message);
      } else setError("Не удалось сохранить.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="space-y-5">
      <h2 className="text-xl font-extrabold text-burgundy">{PAGE_LABELS[page.slug]}</h2>
      {error && <ErrorBox>{error}</ErrorBox>}
      <Field label="Заголовок страницы" error={errors.title}>
        {(p) => <input {...p} className={inputCls} value={page.title} onChange={(e) => set("title", e.target.value)} />}
      </Field>
      <Field label="Подзаголовок" error={errors.subtitle}>
        {(p) => <textarea {...p} rows={2} className={inputCls} value={page.subtitle} onChange={(e) => set("subtitle", e.target.value)} />}
      </Field>
      <Field
        label="SEO: заголовок (title)"
        error={errors.seo_title}
        hint="Показывается в поисковике и во вкладке браузера. Лучше до 60 символов."
        counter={{ value: page.seo_title.length, max: 60 }}
      >
        {(p) => <input {...p} className={inputCls} value={page.seo_title} onChange={(e) => set("seo_title", e.target.value)} />}
      </Field>
      <Field
        label="SEO: описание (description)"
        error={errors.seo_description}
        hint="Краткое описание страницы для поисковиков. Лучше до 160 символов."
        counter={{ value: page.seo_description.length, max: 160 }}
      >
        {(p) => <textarea {...p} rows={3} className={inputCls} value={page.seo_description} onChange={(e) => set("seo_description", e.target.value)} />}
      </Field>
      <div className="flex items-center gap-3">
        <Button busy={busy} disabled={!dirty} onClick={() => void save()}>
          {busy ? "Сохраняем…" : "Сохранить"}
        </Button>
        {dirty && !busy && <span className="text-sm text-muted">Есть несохранённые изменения</span>}
      </div>
    </Card>
  );
}

export function PagesEditor() {
  const [pages, setPages] = useState<PageContent[] | null>(null);
  const [saved, setSaved] = useState<PageContent[]>([]);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    getPages()
      .then((r) => {
        const bySlug = new Map(r.map((p) => [p.slug, p]));
        const full = PAGE_SLUGS.map(
          (slug: PageSlug) => bySlug.get(slug) ?? { slug, title: "", subtitle: "", seo_title: "", seo_description: "" },
        );
        setPages(full);
        setSaved(full);
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Не удалось загрузить тексты страниц."));
  }, []);

  const dirty = !!pages && JSON.stringify(pages) !== JSON.stringify(saved);
  useUnsavedChanges(dirty);

  if (loadError) return <ErrorBox>{loadError}</ErrorBox>;
  if (!pages) return <Loading />;

  return (
    <div className="space-y-6">
      <PageHeader title="Тексты страниц и SEO" />
      <p className="text-muted">Каждая страница сохраняется отдельно кнопкой внутри её блока.</p>
      {pages.map((p, i) => (
        <PageCard
          key={p.slug}
          page={p}
          saved={saved[i]}
          onChange={(np) => setPages((l) => l && l.map((x, j) => (j === i ? np : x)))}
          onSaved={(np) => {
            setSaved((l) => l.map((x, j) => (j === i ? np : x)));
            setPages((l) => l && l.map((x, j) => (j === i ? np : x)));
          }}
        />
      ))}
    </div>
  );
}
