"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Settings } from "@/lib/api-types";
import { ApiError, getSettings, saveSettings } from "@/lib/admin-api";
import { PAGE_LABELS } from "@/lib/admin-collections";
import { moveItem, validateOptionalUrl } from "@/lib/admin-validation";
import { PhotoPicker } from "./PhotoPicker";
import { StringListEditor } from "./StringListEditor";
import { Button, Card, ErrorBox, Field, Loading, PageHeader, Switch, inputCls, useToast } from "./ui";
import { useUnsavedChanges } from "./unsaved";

export function SettingsEditor() {
  const toast = useToast();
  const [s, setS] = useState<Settings | null>(null);
  const [initial, setInitial] = useState("");
  const [loadError, setLoadError] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings()
      .then((r) => {
        setS(r);
        setInitial(JSON.stringify(r));
      })
      .catch((e) => setLoadError(e instanceof ApiError ? e.message : "Не удалось загрузить настройки."));
  }, []);

  const dirty = s !== null && JSON.stringify(s) !== initial;
  const markClean = useUnsavedChanges(dirty);

  if (loadError) return <ErrorBox>{loadError}</ErrorBox>;
  if (!s) return <Loading />;

  const patch = (p: Partial<Settings>) => setS((x) => (x ? { ...x, ...p } : x));
  const setContact = (k: keyof Settings["contacts"], v: string) => patch({ contacts: { ...s.contacts, [k]: v } });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!s) return;
    const errs: Record<string, string> = {};
    if (!s.site_name.trim()) errs.site_name = "Заполните это поле";
    for (const k of ["max_url", "telegram_url", "vk_url"] as const) {
      const m = validateOptionalUrl(s.contacts[k]);
      if (m) errs[k] = m;
    }
    for (const m of s.menu) if (!m.label.trim()) errs[`menu_${m.slug}`] = "Укажите подпись";
    setErrors(errs);
    setFormError("");
    if (Object.keys(errs).length) {
      setFormError("Проверьте поля: есть ошибки.");
      setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
      return;
    }
    setSaving(true);
    try {
      const body: Settings = {
        ...s,
        marquee: s.marquee.map((x) => x.trim()).filter(Boolean),
        contacts: {
          max_url: s.contacts.max_url.trim(),
          telegram_url: s.contacts.telegram_url.trim(),
          vk_url: s.contacts.vk_url.trim(),
        },
      };
      const saved = await saveSettings(body);
      const fresh = saved ?? body;
      setS(fresh);
      setInitial(JSON.stringify(fresh));
      markClean();
      toast("Сохранено");
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(err.fieldErrors);
        setFormError(err.status === 422 ? "Проверьте поля: сервер нашёл ошибки." : err.message);
      } else setFormError("Не удалось сохранить.");
    } finally {
      setSaving(false);
    }
  }

  const text = (key: keyof Settings & string, label: string, opts: { area?: boolean; hint?: string } = {}) => (
    <Field label={label} error={errors[key]} hint={opts.hint}>
      {(p) =>
        opts.area ? (
          <textarea {...p} rows={4} className={inputCls} value={s[key] as string} onChange={(e) => patch({ [key]: e.target.value })} />
        ) : (
          <input {...p} className={inputCls} value={s[key] as string} onChange={(e) => patch({ [key]: e.target.value })} />
        )
      }
    </Field>
  );

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <PageHeader title="Главная и настройки" />
      {formError && <ErrorBox>{formError}</ErrorBox>}

      <Card className="space-y-5">
        <h2 className="text-xl font-extrabold text-burgundy">Название сайта</h2>
        <Field label="Название сайта" required error={errors.site_name}>
          {(p) => <input {...p} className={inputCls} value={s.site_name} onChange={(e) => patch({ site_name: e.target.value })} />}
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-xl font-extrabold text-burgundy">Первый экран главной</h2>
        {text("hero_title", "Заголовок")}
        {text("hero_text", "Текст", { area: true })}
        {text("hero_cta", "Текст кнопки")}
        <fieldset className="space-y-1.5">
          <legend className="font-semibold">Фото</legend>
          <PhotoPicker label="Фото главной" value={s.hero_photo} onChange={(u) => patch({ hero_photo: u })} />
        </fieldset>
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-extrabold text-burgundy">Бегущая строка</h2>
        <p className="text-sm text-muted">Короткие фразы, которые бегут под фото на главной.</p>
        <StringListEditor label="Бегущая строка" value={s.marquee} onChange={(v) => patch({ marquee: v })} />
      </Card>

      <Card className="space-y-3">
        <h2 className="text-xl font-extrabold text-burgundy">Меню сайта</h2>
        <p className="text-sm text-muted">Подписи, порядок и видимость пунктов.</p>
        <ul className="space-y-3">
          {s.menu.map((m, i) => (
            <li key={m.slug} className="rounded-xl border border-line p-3">
              <p className="mb-1 text-sm text-muted">Страница: {PAGE_LABELS[m.slug] ?? m.slug}</p>
              <div className="flex flex-wrap items-center gap-1">
                <div className="grow basis-40">
                  <input
                    aria-label={`Подпись пункта «${PAGE_LABELS[m.slug] ?? m.slug}»`}
                    aria-invalid={errors[`menu_${m.slug}`] ? true : undefined}
                    className={inputCls}
                    value={m.label}
                    onChange={(e) => patch({ menu: s.menu.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                  />
                  {errors[`menu_${m.slug}`] && <p role="alert" className="text-sm font-semibold text-[#a4262c]">{errors[`menu_${m.slug}`]}</p>}
                </div>
                <Switch
                  checked={m.visible}
                  label={`Показывать «${m.label}» в меню`}
                  onChange={(v) => patch({ menu: s.menu.map((x, j) => (j === i ? { ...x, visible: v } : x)) })}
                />
                <Button variant="ghost" aria-label={`«${m.label}»: выше`} disabled={i === 0} onClick={() => patch({ menu: moveItem(s.menu, i, i - 1) })}>
                  ↑
                </Button>
                <Button variant="ghost" aria-label={`«${m.label}»: ниже`} disabled={i === s.menu.length - 1} onClick={() => patch({ menu: moveItem(s.menu, i, i + 1) })}>
                  ↓
                </Button>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-xl font-extrabold text-burgundy">Контакты</h2>
        <p className="text-sm text-muted">Если ссылка пустая, кнопка на сайте не показывается.</p>
        <Field label="Ссылка на чат в Максе" error={errors.max_url} hint="Начинается с https://">
          {(p) => <input {...p} type="url" className={inputCls} value={s.contacts.max_url} onChange={(e) => setContact("max_url", e.target.value)} />}
        </Field>
        <Field label="Ссылка на Telegram" error={errors.telegram_url} hint="Например, https://t.me/имя">
          {(p) => <input {...p} type="url" className={inputCls} value={s.contacts.telegram_url} onChange={(e) => setContact("telegram_url", e.target.value)} />}
        </Field>
        <Field label="Ссылка на ВКонтакте" error={errors.vk_url} hint="Например, https://vk.com/имя">
          {(p) => <input {...p} type="url" className={inputCls} value={s.contacts.vk_url} onChange={(e) => setContact("vk_url", e.target.value)} />}
        </Field>
      </Card>

      <Card className="space-y-5">
        <h2 className="text-xl font-extrabold text-burgundy">Подвал сайта</h2>
        {text("footer_title", "Заголовок")}
        {text("footer_text", "Текст", { area: true })}
        {text("copyright", "Строка copyright")}
      </Card>

      <div className="sticky bottom-0 -mx-4 flex flex-wrap items-center gap-3 border-t border-line bg-bg/95 px-4 py-3 md:static md:mx-0 md:border-0 md:bg-transparent md:px-0">
        <Button type="submit" busy={saving}>
          {saving ? "Сохраняем…" : "Сохранить"}
        </Button>
        {dirty && !saving && <span className="text-sm text-muted">Есть несохранённые изменения</span>}
      </div>
    </form>
  );
}
