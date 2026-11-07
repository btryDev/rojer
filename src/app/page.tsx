import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Cadran } from "@/components/landing/Cadran";
import { Hero } from "@/components/landing/Hero";
import { compteDeLaSession } from "@/components/landing/compte-session";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Manifeste } from "@/components/landing/Manifeste";
import { OutilSimple } from "@/components/landing/OutilSimple";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { chiffresReferentielSuivi } from "@/lib/referentiels/conformite";
import { Tarif } from "@/components/landing/Tarif";
import { RecoveryHashRedirect } from "./RecoveryHashRedirect";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  // Les liens e-mail Supabase envoyés depuis le dashboard redirigent vers la
  // Site URL racine avec ?code=… : on l'échange contre une session via la
  // route callback, puis direction la page de choix du nouveau mot de passe.
  const { code } = await searchParams;
  if (code) {
    redirect(
      `/auth/callback?code=${encodeURIComponent(code)}&next=/auth/reinitialisation`,
    );
  }

  const compte = await compteDeLaSession();
  // Chrome, Firefox et Edge sur iPhone (`CriOS`, `FxiOS`, `EdgiOS`) gardent
  // leurs barres fixes : le hero s'y ajuste (`Hero`, `barresFixes`).
  const barresFixes = /CriOS|FxiOS|EdgiOS/.test((await headers()).get("user-agent") ?? "");

  // Les chiffres du référentiel, calculés ICI — côté serveur — et passés en
  // props : `Cadran` est un composant client, qui ne doit pas embarquer le
  // référentiel. Ce sont les obligations SUIVIES au quotidien (total − niveau
  // audit), décision de la propriétaire du 2026-10-08.
  const chiffres = chiffresReferentielSuivi();

  return (
    <main className="bg-[color:var(--board-card)]">
      <RecoveryHashRedirect />
      <LandingHeader compte={compte} surPhoto />

      <Hero compte={compte} barresFixes={barresFixes} />

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
