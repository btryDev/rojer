import { Cadran } from "@/components/landing/Cadran";
import { Hero } from "@/components/landing/Hero";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Manifeste } from "@/components/landing/Manifeste";
import { OutilSimple } from "@/components/landing/OutilSimple";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
import { chiffresReferentielSuivi } from "@/lib/referentiels/conformite";
import { Tarif } from "@/components/landing/Tarif";

// ~~Les liens e-mail Supabase (`?code=…`, `#type=recovery`) étaient relayés
// d'ici vers `/auth/callback`~~ [2026-10-30, ADR-052 : les liens de Better Auth
// mènent directement à `/auth/verification` et `/auth/reinitialisation`.]
export default async function Home() {
  const user = await getOptionalUser();
  const etab = user ? await getOptionalUserEtablissement() : null;
  // Quand l'utilisateur n'est pas connecté, le CTA principal l'envoie sur
  // /signup : la création d'un dossier nécessite un compte (ADR-005), le
  // proxy redirigerait de toute façon /onboarding vers /login.
  // Un compte peut porter plusieurs dossiers depuis l'ADR-028 : ce n'est plus
  // « son » établissement qu'on pointe, mais l'ACTIF — le dernier commuté, à
  // défaut le plus ancien. La page d'accueil n'a pas à choisir : c'est
  // `getOptionalUserEtablissement` qui porte le défaut, une fois pour tout le
  // produit. Sans aucun dossier, on aiguille vers /onboarding.
  const ctaHref = !user
    ? "/signup"
    : etab
      ? `/etablissements/${etab.id}`
      : "/onboarding";
  const ctaLabel = !user
    ? "Créer mon compte"
    : etab
      ? "Reprendre mon dossier"
      : "Terminer la mise en place";

  // Les chiffres du référentiel, calculés ICI — côté serveur — et passés en
  // props : `Cadran` est un composant client, qui ne doit pas embarquer le
  // référentiel. Ce sont les obligations SUIVIES au quotidien (total − niveau
  // audit), décision de la propriétaire du 2026-10-08.
  const chiffres = chiffresReferentielSuivi();

  return (
    <main className="bg-[color:var(--board-card)]">
      <LandingHeader
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        connecte={Boolean(user)}
        surPhoto
      />

      <Hero ctaHref={ctaHref} ctaLabel={ctaLabel} />

      {/* « Ce que Rojer tient à jour » passe avant « Concentrez-vous sur
          votre activité » (décision de la propriétaire du 2026-11-06) :
          ce que Rojer produit d'abord, ce qu'il apporte ensuite. */}
      <Cadran chiffres={chiffres} />
      <Manifeste />
      <OutilSimple />
      <Tarif ctaHref={ctaHref} ctaLabel={ctaLabel} connecte={Boolean(user)} />
      <SiteFooter />
    </main>
  );
}
