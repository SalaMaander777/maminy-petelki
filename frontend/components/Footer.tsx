import type { Settings } from "@/lib/api-types";
import { buildContacts, DEFAULT_SETTINGS, type ContactLink } from "@/lib/site";

const ICONS: Record<ContactLink["id"], React.ReactNode> = {
  max: <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />,
  telegram: <path d="M21.5 3.5 2.5 11l6 2.2L10.5 20l3-4 4.5 3.5 3.5-16z" />,
  vk: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <path d="M7 9c.4 4 2.4 6 5 6V9m0 3c1.8-.2 3-1.6 3.6-3M12 12c1.6.4 2.8 1.6 3.6 3" />
    </>
  ),
};

export function Footer({ settings = DEFAULT_SETTINGS }: { settings?: Settings }) {
  const contacts = buildContacts(settings.contacts);
  return (
    <footer
      id="contacts"
      className="mt-16 bg-burgundy px-4 py-12 text-bg sm:mt-[120px] sm:px-10 sm:py-[72px] md:px-20"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-8 text-center">
        {settings.footer_title && <h2 className="m-0 text-[28px] font-extrabold sm:text-4xl">{settings.footer_title}</h2>}
        {settings.footer_text && (
          <p className="m-0 max-w-[520px] text-[15px] leading-normal text-cream sm:text-lg">{settings.footer_text}</p>
        )}
        {contacts.length > 0 && (
          <ul className="m-0 flex list-none flex-wrap justify-center gap-5 p-0">
            {contacts.map((c) => (
              <li key={c.id}>
                <a
                  href={c.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sweep sweep-c box-border flex min-h-11 items-center gap-3 rounded-full border-2 border-cream px-[30px] py-3.5 text-[17px] font-extrabold"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    {ICONS[c.id]}
                  </svg>
                  {c.label}
                </a>
              </li>
            ))}
          </ul>
        )}
        {settings.copyright && (
          <div className="w-full border-t border-cream/30 pt-6 text-sm text-[#E6CFD6]">{settings.copyright}</div>
        )}
      </div>
    </footer>
  );
}
