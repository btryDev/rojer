import Link from "next/link";
import illustrationOuverture from "@/assets/landing/bientot-ouverture.jpg";
import { compteDeLaSession } from "@/components/landing/compte-session";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PhotoCadre } from "@/components/landing/PhotoCadre";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { FormulaireBientot } from "./FormulaireBientot";

export const metadata = {
  title: "Rojer ouvre très bientôt — Rojer",
};

// « Rojer ouvre bientôt » (2026-11-23, décision de la propriétaire) : là où
// mènent les boutons d'inscription de la page publique tant que les
// inscriptions sont fermées (`lib/ouverture.ts`). Publique (`/bientot` dans
// les préfixes ouverts du proxy), habillée comme la page publique. Aucune
// date promise, et rien sur la raison de l'attente : le visiteur n'a pas à
// la connaître (2026-11-23, décision de la propriétaire). La page reste
// servie une fois les inscriptions rouvertes — plus rien n'y mène, et
// l'adresse laissée vaut toujours.
//
// Mise en page (2026-11-23, décision de la propriétaire) : le texte et le
// champ à gauche, l'illustration à droite, dans le cadre et le trait de
// « Transparent sur ses sources » (`OutilSimple`). Au téléphone, le champ
// passe avant l'illustration.

export default async function PageBientot() {
  const compte = await compteDeLaSession();

  return (
    <main className="flex min-h-svh flex-col bg-[color:var(--board-card)]">
      <LandingHeader compte={compte} />
      <section className="lp-shell flex flex-1 items-center py-12 sm:py-20 lg:min-h-[calc(100svh-var(--lp-entete))] lg:py-16">
        <div className="grid w-full items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:gap-20">
          <div className="max-w-[560px]">
            <h1 className="lp-titre lp-h1">Rojer ouvre très bientôt.</h1>
            <p className="lp-lede mt-6 max-w-[40ch]">
              Laissez votre adresse : nous vous écrirons le jour où vous pourrez commencer.
            </p>

            <div className="mt-10">
              <FormulaireBientot />
            </div>

            <p className="m-0 mt-4 max-w-[52ch] text-[0.8125rem] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Votre adresse ne sert qu&apos;à cet e-mail : elle est effacée après l&apos;envoi, et sur simple demande
              avant.{" "}
              <Link
                href="/legal/confidentialite"
                className="font-medium text-[color:var(--board-ink)] underline decoration-[color:var(--board-slate-line)] underline-offset-4 transition-colors hover:decoration-[color:var(--board-ink)]"
              >
                Confidentialité
              </Link>
            </p>
          </div>

          {/* Décorative : la page dit déjà tout. L'enveloppe de l'e-mail
              d'ouverture, au trait de `transparence-sources.jpg` (Krea, Nano
              Banana Pro, 2026-11-23 ; fond rendu uni à la main, les ronds
              retirés — décision de la propriétaire). Le cadre prend la
              couleur exacte du fond de l'image : l'aperçu flou du chargement
              ne change pas de teinte. */}
          <PhotoCadre
            photo={{ src: illustrationOuverture, alt: "" }}
            fond="#cfe3fc"
            ratio="4 / 3"
            sizes="(max-width: 1023px) 92vw, (max-width: 1600px) 52vw, 820px"
          />
        </div>
      </section>
      <SiteFooter compte={compte} />
    </main>
  );
}
