import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compteDeLaSession } from "@/components/landing/compte-session";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { BoutonContact } from "@/components/landing/BoutonContact";
import { PAGES_LEGALES } from "@/components/landing/pages-legales";

// Les pages d'information (mentions légales, confidentialité, cookies).
// Publiques (`/legal` dans les préfixes ouverts du proxy). Le texte vit dans
// `components/landing/pages-legales.ts` [2026-11-19 : il disait « en cours de
// rédaction »].

type Props = { params: Promise<{ page: string }> };

function pageDe(slug: string) {
  return PAGES_LEGALES.find((p) => p.slug === slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = pageDe((await params).page);
  return page ? { title: `${page.titre} — Rojer` } : {};
}

export default async function PageLegale({ params }: Props) {
  const page = pageDe((await params).page);
  if (!page) notFound();
  const compte = await compteDeLaSession();

  return (
    <main className="flex min-h-svh flex-col bg-[color:var(--board-card)]">
      <LandingHeader compte={compte} />
      <section className="lp-shell flex-1 py-20 sm:py-28">
        <article className="max-w-[var(--board-mesure)]">
          <h1 className="lp-titre lp-h2">{page.titre}</h1>
          <p className="m-0 mt-3 text-[13px] text-[color:var(--board-slate-mid)]">
            Dernière mise à jour : {page.misAJour}
          </p>
          {page.sections.map((s) => (
            <section key={s.titre} className="mt-10">
              <h2 className="lp-titre lp-h3">{s.titre}</h2>
              {s.paragraphes.map((p, i) => (
                <p key={i} className="m-0 mt-3 text-[15px] leading-[1.65] text-[color:var(--board-slate-ink)]">
                  {p}
                </p>
              ))}
            </section>
          ))}
          <p className="m-0 mt-10 text-[15px] leading-[1.65] text-[color:var(--board-slate-ink)]">
            Une question sur cette page ?
          </p>
          <BoutonContact className="lp-btn-ink mt-4" />
        </article>
      </section>
      <SiteFooter compte={compte} />
    </main>
  );
}
