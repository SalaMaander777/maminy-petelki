"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";

export function cx(...a: (string | false | null | undefined)[]) {
  return a.filter(Boolean).join(" ");
}

// ---------- кнопки ----------
type Variant = "primary" | "secondary" | "danger" | "ghost";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-burgundy text-bg hover:bg-[#62193a] border-burgundy",
  secondary: "bg-white text-burgundy hover:bg-pink-soft border-burgundy",
  danger: "bg-[#a4262c] text-white hover:bg-[#82171d] border-[#a4262c]",
  ghost: "bg-transparent text-burgundy hover:bg-pink-soft border-transparent",
};

export function Button({
  variant = "primary",
  busy,
  className,
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button
      type={type}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
      className={cx(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border-2 px-4 py-2 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {busy && <Spinner />}
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <span
      role={label ? "status" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function Loading({ text = "Загрузка…" }: { text?: string }) {
  return (
    <p role="status" className="flex items-center gap-3 py-10 text-muted">
      <Spinner /> {text}
    </p>
  );
}

// ---------- поля ----------
export const inputCls =
  "block min-h-11 w-full rounded-xl border-2 border-line bg-white px-3 py-2 text-base text-ink placeholder:text-muted-2 focus-visible:border-burgundy aria-[invalid=true]:border-[#a4262c]";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  counter?: { value: number; max: number };
  children: (p: { id: string; "aria-describedby"?: string; "aria-invalid"?: boolean }) => ReactNode;
}

export function Field({ label, error, hint, required, counter, children }: FieldProps) {
  const id = useId();
  const descId = `${id}-d`;
  const hasDesc = !!(error || hint || counter);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-base font-semibold text-ink">
        {label}
        {required && <span className="text-burgundy" aria-hidden="true"> *</span>}
        {required && <span className="sr-only"> (обязательное поле)</span>}
      </label>
      {children({ id, "aria-describedby": hasDesc ? descId : undefined, "aria-invalid": error ? true : undefined })}
      <div id={descId} className="flex justify-between gap-3 text-sm">
        <span>
          {error && (
            <span role="alert" className="font-semibold text-[#a4262c]">
              {error}
            </span>
          )}
          {!error && hint && <span className="text-muted">{hint}</span>}
        </span>
        {counter && (
          <span className={cx("shrink-0", counter.value > counter.max ? "font-semibold text-[#a4262c]" : "text-muted")}>
            {counter.value} / {counter.max}
          </span>
        )}
      </div>
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full disabled:opacity-60"
    >
      <span
        className={cx(
          "relative inline-block h-7 w-12 rounded-full border-2 transition-colors",
          checked ? "border-burgundy bg-burgundy" : "border-muted-2 bg-white",
        )}
      >
        <span
          className={cx(
            "absolute top-0.5 h-5 w-5 rounded-full transition-all",
            checked ? "left-[22px] bg-bg" : "left-0.5 bg-muted-2",
          )}
        />
      </span>
    </button>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={cx("rounded-2xl border border-line bg-white p-4 shadow-sm md:p-6", className)}>{children}</section>;
}

export function PageHeader({ title, children, back }: { title: string; children?: ReactNode; back?: ReactNode }) {
  return (
    <div className="mb-5 space-y-2">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-burgundy md:text-3xl">{title}</h1>
        <div className="flex flex-wrap gap-2">{children}</div>
      </div>
    </div>
  );
}

export function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="rounded-xl border-2 border-[#a4262c] bg-[#fdecee] px-4 py-3 font-semibold text-[#7a1319]">
      {children}
    </p>
  );
}

// ---------- уведомления ----------
interface Toast {
  id: number;
  text: string;
  kind: "ok" | "error";
}
const ToastCtx = createContext<(text: string, kind?: "ok" | "error") => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const n = useRef(0);
  const push = useCallback((text: string, kind: "ok" | "error" = "ok") => {
    const id = ++n.current;
    setToasts((t) => [...t, { id, text, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), kind === "ok" ? 4000 : 8000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[70] flex flex-col items-center gap-2 px-4"
      >
        {toasts.map((t) => (
          <p
            key={t.id}
            role={t.kind === "error" ? "alert" : "status"}
            className={cx(
              "pointer-events-auto max-w-md rounded-xl px-4 py-3 text-base font-semibold shadow-lg",
              t.kind === "ok" ? "bg-burgundy text-bg" : "bg-[#a4262c] text-white",
            )}
          >
            {t.text}
          </p>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- диалог ----------
export function Dialog({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const first = el?.querySelector<HTMLElement>("button, [href], input, select, textarea");
    first?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Tab" && el) {
        const f = Array.from(el.querySelectorAll<HTMLElement>("button:not([disabled]), [href], input:not([disabled]), select, textarea"));
        if (!f.length) return;
        const a = f[0];
        const z = f[f.length - 1];
        if (e.shiftKey && document.activeElement === a) {
          e.preventDefault();
          z.focus();
        } else if (!e.shiftKey && document.activeElement === z) {
          e.preventDefault();
          a.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      prev?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={cx("max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-bg p-5 shadow-xl sm:rounded-2xl", wide ? "max-w-3xl" : "max-w-md")}
      >
        <h2 id={titleId} className="mb-3 text-xl font-extrabold text-burgundy">
          {title}
        </h2>
        {children}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  text,
  confirmLabel = "Удалить",
  busy,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Dialog title={title} onClose={onCancel}>
      <p className="mb-5 text-base text-ink">{text}</p>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Отмена
        </Button>
        <Button variant="danger" busy={busy} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
