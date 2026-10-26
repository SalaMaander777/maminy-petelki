export function PageHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="anim-rise mb-10 flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
      <h1 className="m-0 text-[30px] font-extrabold text-burgundy sm:text-[44px]">{title}</h1>
      {subtitle && <p className="m-0 text-[15px] text-muted-2 sm:max-w-[520px] sm:text-right">{subtitle}</p>}
    </div>
  );
}

export function PageMain({ children }: { children: React.ReactNode }) {
  return <main id="main" tabIndex={-1} className="mx-auto w-full max-w-[1440px] px-4 pt-10 sm:px-10 sm:pt-16 md:px-20">{children}</main>;
}

export const GRID = "grid grid-cols-1 gap-x-8 gap-y-9 sm:grid-cols-2 sm:gap-y-12 md:grid-cols-3";

export function stagger(index: number): React.CSSProperties {
  return { "--stagger": `${((index % 3) * 0.15 + Math.floor(index / 3) * 0.25).toFixed(2)}s` } as React.CSSProperties;
}
