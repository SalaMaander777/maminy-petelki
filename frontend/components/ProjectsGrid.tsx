"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/lib/api-types";
import { Photo } from "./Photo";
import { stagger } from "./PageHeading";

function ProjectDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const images = [project.photo, ...project.gallery].filter((u): u is string => !!u);

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <dialog
      ref={ref}
      aria-labelledby="project-dialog-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
      className="modal m-auto max-h-[92vh] w-[min(960px,calc(100vw-24px))] overflow-y-auto rounded-[24px] border-0 bg-bg p-0 text-ink"
    >
      <div className="relative flex flex-col gap-5 p-5 sm:p-8">
        <button
          type="button"
          onClick={() => ref.current?.close()}
          aria-label="Закрыть"
          className="absolute right-3 top-3 z-10 flex size-11 cursor-pointer items-center justify-center rounded-full border-0 bg-pink-soft text-burgundy"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
            <path d="M5 5l14 14M19 5 5 19" />
          </svg>
        </button>
        <h2 id="project-dialog-title" className="m-0 pr-12 text-[26px] font-extrabold text-burgundy sm:text-4xl">
          {project.title}
        </h2>
        {project.description && <p className="m-0 whitespace-pre-line text-base leading-relaxed text-muted">{project.description}</p>}
        {images.length > 0 && (
          <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2">
            {images.map((src, i) => (
              <li key={`${src}-${i}`} className="relative aspect-[4/3] overflow-hidden rounded-[16px] bg-[#F1E4D0]">
                <Photo src={src} alt={`${project.title} — фото ${i + 1}`} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </dialog>
  );
}

export function ProjectsGrid({ projects, gridClass }: { projects: Project[]; gridClass: string }) {
  const [openId, setOpenId] = useState<number | null>(null);
  const open = projects.find((p) => p.id === openId) ?? null;
  return (
    <>
      <div className={gridClass}>
        {projects.map((p, i) => (
          <article key={p.id} className="card anim-rise-item" style={stagger(i)}>
            <button
              type="button"
              onClick={() => setOpenId(p.id)}
              aria-haspopup="dialog"
              className="m-0 flex w-full cursor-pointer flex-col gap-[18px] border-0 bg-transparent p-0 text-left font-[inherit] text-inherit"
            >
              <span className="frame relative block aspect-[4/3] overflow-hidden rounded-[20px] bg-[#F1E4D0]">
                <Photo src={p.photo} alt={p.photo ? p.title : ""} index={i} />
                {p.gallery.length > 0 && (
                  <span className="absolute bottom-3.5 left-3.5 rounded-full bg-bg px-4 py-2 text-[13px] font-extrabold text-burgundy">
                    Смотреть фото ({p.gallery.length})
                  </span>
                )}
              </span>
              <span className="flex flex-col gap-2.5">
                <h2 className="m-0 text-[22px] font-extrabold text-ink">{p.title}</h2>
                {p.description && (
                  <span className="line-clamp-4 text-[15px] leading-normal text-muted">{p.description}</span>
                )}
              </span>
            </button>
          </article>
        ))}
      </div>
      {open && <ProjectDialog key={open.id} project={open} onClose={() => setOpenId(null)} />}
    </>
  );
}
