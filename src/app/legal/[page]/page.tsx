import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { BoutonContact } from "@/components/landing/BoutonContact";
import { PAGES_LEGALES } from "@/components/landing/pages-legales";

// Les pages d'information (mentions légales, confidentialité…). Publiques
// (`/legal` dans les préfixes ouverts du proxy). Leur texte n'est pas encore
// écrit : la page le dit, plutôt qu'un lien du pied de page qui mènerait à
// une erreur.

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

  return (
    <main className="flex min-h-svh flex-col bg-[color:var(--board-card)]">
      <LandingHeader />
      <section className="lp-shell flex-1 py-20 sm:py-28">
        <h1 className="lp-titre lp-h2">{page.titre}</h1>
        <p className="lp-lede mt-6 max-w-[var(--board-mesure)]">
          Cette page est en cours de rédaction. Pour toute question d&apos;ici
          là, écrivez-nous.
        </p>
        <BoutonContact className="lp-btn-ink mt-8" />
      </section>
      <SiteFooter />
    </main>
  );
}
