import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Loader } from "@/components/Loader";
import { ReadyFlag } from "@/components/ReadyFlag";
import { getSite } from "@/lib/api";
import { buildContacts, SITE_DESCRIPTION, SITE_URL, visibleMenu } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const { settings } = await getSite();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: settings.site_name,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    image: `${SITE_URL}/logo.png`,
    sameAs: buildContacts(settings.contacts)
      .map((c) => c.href)
      .filter((h) => h.startsWith("http")),
  };
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-70 focus:rounded-xl focus:bg-burgundy focus:px-4 focus:py-3 focus:font-semibold focus:text-bg focus:outline-2 focus:outline-offset-2 focus:outline-gold"
      >
        Пропустить к содержимому
      </a>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <Loader />
      <ReadyFlag />
      <Header siteName={settings.site_name} items={visibleMenu(settings.menu)} />
      <div id="main-wrap">{children}</div>
      <Footer settings={settings} />
    </>
  );
}
