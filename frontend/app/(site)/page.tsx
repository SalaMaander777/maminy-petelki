import { Hero } from "@/components/Hero";
import { Marquee } from "@/components/Marquee";
import { Thread } from "@/components/Thread";
import { getSite } from "@/lib/api";
import { pageMetadata } from "@/lib/page-meta";

export const generateMetadata = () => pageMetadata("home");

export default async function Home() {
  const { settings } = await getSite();
  return (
    <main id="main" tabIndex={-1}>
      <Hero settings={settings} />
      <Thread />
      <Marquee words={settings.marquee} />
    </main>
  );
}
