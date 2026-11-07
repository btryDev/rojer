import { redirect } from "next/navigation";
import { Cadran } from "@/components/landing/Cadran";
import { Hero } from "@/components/landing/Hero";
import type { CompteLanding } from "@/components/landing/compte";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Manifeste } from "@/components/landing/Manifeste";
import { OutilSimple } from "@/components/landing/OutilSimple";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
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

  const user = await getOptionalUser();
  const etab = user ? await getOptionalUserEtablissement() : null;
  // Le compte connecté, s'il y en a un : où il reprend, et comment le bouton
  // le dit. Un compte peut porter plusieurs dossiers depuis l'ADR-028 : ce
  // n'est plus « son » établissement qu'on pointe, mais l'ACTIF — le dernier
  // commuté, à défaut le plus ancien. La page d'accueil n'a pas à choisir :
  // c'est `getOptionalUserEtablissement` qui porte le défaut, une fois pour
  // tout le produit. Sans aucun dossier, on aiguille vers /onboarding.
  // Personne de connecté : les sections mènent à /signup (la création d'un
  // dossier nécessite un compte, ADR-005) et à /login.
  const compte: CompteLanding | undefined = !user
    ? undefined
    : etab
      ? { href: `/etablissements/${etab.id}`, label: "Reprendre mon dossier" }
      : { href: "/onboarding", label: "Terminer la mise en place" };

  // Les chiffres du référentiel, calculés ICI — côté serveur — et passés en
  // props : `Cadran` est un composant client, qui ne doit pas embarquer le
  // référentiel. Ce sont les obligations SUIVIES au quotidien (total − niveau
  // audit), décision de la propriétaire du 2026-10-08.
  const chiffres = chiffresReferentielSuivi();

  return (
    <main className="bg-[color:var(--board-card)]">
      <RecoveryHashRedirect />
      <LandingHeader compte={compte} surPhoto />

      <Hero compte={compte} />

      {/* « Ce que Rojer tient à jour » passe avant « Concentrez-vous sur
          votre activité » (décision de la propriétaire du 2026-11-06) :
          ce que Rojer produit d'abord, ce qu'il apporte ensuite. */}
      <Cadran chiffres={chiffres} />
      <Manifeste />
      <OutilSimple />
      <Tarif compte={compte} />
      <SiteFooter />
    </main>
  );
}
