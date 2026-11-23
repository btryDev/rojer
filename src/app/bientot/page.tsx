import Link from "next/link";
import { compteDeLaSession } from "@/components/landing/compte-session";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { FormulaireBientot } from "./FormulaireBientot";

export const metadata = {
  title: "Rojer ouvre très bientôt — Rojer",
};

// « Rojer ouvre bientôt » (2026-11-23, décision de la propriétaire) : là où
// mènent les boutons d'inscription de la page publique tant que les
// inscriptions sont fermées (`lib/ouverture.ts`). Publique (`/bientot` dans
// les préfixes ouverts du proxy), habillée comme les pages légales. Aucune
// date promise. La page reste servie une fois les inscriptions rouvertes —
// plus rien n'y mène, et l'adresse laissée vaut toujours.

export default async function PageBientot() {
  const compte = await compteDeLaSession();

  return (
    <main className="flex min-h-svh flex-col bg-[color:var(--board-card)]">
      <LandingHeader compte={compte} />
      <section className="lp-shell flex-1 py-20 sm:py-28">
        <h1 className="lp-titre lp-h2">Rojer ouvre très bientôt.</h1>
        <p className="lp-lede mt-6 max-w-[var(--board-mesure)]">
          Nous terminons l&apos;ouverture des abonnements. Laissez votre adresse : nous vous écrirons le jour où vous
          pourrez commencer, une seule fois.
        </p>

        <div className="lp-carte mt-10 max-w-[480px] px-7 py-6 sm:px-8">
          <FormulaireBientot />
        </div>

        <p className="mt-6 max-w-[var(--board-mesure)] text-[0.85rem] leading-[1.55] text-[color:var(--board-slate-mid)]">
          Votre adresse ne sert qu&apos;à cet e-mail : elle est effacée après l&apos;envoi, et sur simple demande
          avant.{" "}
          <Link
            href="/legal/confidentialite"
            className="underline decoration-[color:var(--board-slate-line)] underline-offset-4 transition-colors hover:text-[color:var(--board-ink)]"
          >
            Confidentialité
          </Link>
        </p>
      </section>
      <SiteFooter compte={compte} />
    </main>
  );
}
