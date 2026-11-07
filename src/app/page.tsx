import { Cadran } from "@/components/landing/Cadran";
import { Hero } from "@/components/landing/Hero";
import { compteDeLaSession } from "@/components/landing/compte-session";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Manifeste } from "@/components/landing/Manifeste";
import { OutilSimple } from "@/components/landing/OutilSimple";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { chiffresReferentielSuivi } from "@/lib/referentiels/conformite";
import { Tarif } from "@/components/landing/Tarif";

// ~~Les liens e-mail Supabase (`?code=…`, `#type=recovery`) étaient relayés
// d'ici vers `/auth/callback`~~ [2026-10-30, ADR-052 : les liens de Better Auth
// mènent directement à `/auth/verification` et `/auth/reinitialisation`.]
export default async function Home() {
  const compte = await compteDeLaSession();

  // Les chiffres du référentiel, calculés ICI — côté serveur — et passés en
  // props : `Cadran` est un composant client, qui ne doit pas embarquer le
  // référentiel. Ce sont les obligations SUIVIES au quotidien (total − niveau
  // audit), décision de la propriétaire du 2026-10-08.
  const chiffres = chiffresReferentielSuivi();

  return (
    <main className="bg-[color:var(--board-card)]">
      <LandingHeader compte={compte} surPhoto />

      <Hero compte={compte} />

      {/* « Ce que Rojer tient à jour » passe avant « Concentrez-vous sur
          votre activité » (décision de la propriétaire du 2026-11-06) :
          ce que Rojer produit d'abord, ce qu'il apporte ensuite. */}
      <Cadran chiffres={chiffres} />
      <Manifeste />
      <OutilSimple />
      <Tarif compte={compte} />
      <SiteFooter compte={compte} />
    </main>
  );
}
