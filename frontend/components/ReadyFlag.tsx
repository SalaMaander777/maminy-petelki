"use client";

import { useEffect } from "react";

/**
 * Через 4с после первой загрузки (загрузочный экран + анимации входа)
 * помечает <html data-ready="1"> — дальше анимации входа на страницах стартуют сразу.
 */
export function ReadyFlag() {
  useEffect(() => {
    const t = window.setTimeout(() => {
      document.documentElement.dataset.ready = "1";
    }, 4000);
    return () => window.clearTimeout(t);
  }, []);
  return null;
}
