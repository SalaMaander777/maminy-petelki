"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DEFAULT_MENU, SITE_NAME, visibleMenu } from "@/lib/site";

type Item = { label: string; href: string };

export function Header({
  siteName = SITE_NAME,
  items = visibleMenu(DEFAULT_MENU),
}: {
  siteName?: string;
  items?: Item[];
}) {
  const pathname = usePathname();
  return (
    <header className="anim-drop mx-auto flex w-full max-w-[1440px] flex-col items-center gap-2 px-4 pt-5 sm:px-10 sm:pt-9 md:px-20">
      <Link href="/" className="logo block" aria-label={`${siteName} — на главную`}>
        <Image
          src="/logo.png"
          alt={siteName}
          width={479}
          height={460}
          priority
          className="block h-auto w-[132px] sm:w-[190px]"
        />
      </Link>
      {items.length > 0 && (
        <nav
          aria-label="Основное меню"
          className="mt-2.5 mb-[18px] box-border flex w-full flex-wrap justify-center rounded-3xl sm:justify-around sm:gap-x-4 sm:rounded-full bg-pink-soft px-2 py-1 text-[13px] font-extrabold uppercase tracking-[0.04em] text-burgundy sm:px-7 sm:text-[17px] sm:tracking-[0.12em] md:gap-x-10 md:text-2xl"
        >
          {items.map((item) => {
            const current = item.href === pathname;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={current ? "page" : undefined}
                className="nav-link box-border inline-flex min-h-11 basis-1/3 items-center justify-center px-1 sm:basis-auto py-2.5 text-center sm:px-3 sm:py-3.5"
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      )}
      <div className="h-px w-full bg-line" />
    </header>
  );
}
