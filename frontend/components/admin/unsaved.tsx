"use client";

import { createContext, useCallback, useContext, useEffect, type MutableRefObject } from "react";

/** Общий флаг «есть несохранённые изменения». Читает оболочка (перехват ссылок). */
export const DirtyContext = createContext<MutableRefObject<boolean>>({ current: false });

export const UNSAVED_TEXT = "Есть несохранённые изменения. Если уйти, они пропадут. Уйти без сохранения?";

export function useUnsavedChanges(dirty: boolean) {
  const ref = useContext(DirtyContext);
  useEffect(() => {
    ref.current = dirty;
    if (!dirty) return;
    const onBefore = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBefore);
    return () => window.removeEventListener("beforeunload", onBefore);
  }, [dirty, ref]);
  useEffect(() => () => void (ref.current = false), [ref]);
  /** Вызвать сразу после успешного сохранения, перед переходом. */
  return useCallback(() => {
    ref.current = false;
  }, [ref]);
}
