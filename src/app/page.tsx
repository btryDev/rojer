import Link from "next/link";
import { Cadran } from "@/components/landing/Cadran";
import { Etapes } from "@/components/landing/Etapes";
import { HeroBrief } from "@/components/landing/HeroBrief";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Manifeste } from "@/components/landing/Manifeste";
import { Questions } from "@/components/landing/Questions";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { TableauDeBord } from "@/components/landing/TableauDeBord";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
import { chiffresReferentielSuivi } from "@/lib/referentiels/conformite";

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
      />

      {/* ================================================================
         HERO — la promesse en titre, et le produit qui se montre en train
         de travailler. Pas de bandeau bleu : le ciel arrive plus bas.
         La phrase de marque, elle, a sa propre bande noire juste après —
         deux grands titres l'un sous l'autre ne se seraient pas servis.
         ================================================================ */}
      <section className="bg-[color:var(--board-card)] pb-24 pt-16 sm:pb-32 sm:pt-24 lg:pt-28">
        <div className="lp-shell grid grid-cols-1 items-center gap-14 lg:grid-cols-[0.92fr_1.08fr] lg:gap-24 xl:gap-32">
          <div className="lg:max-w-[540px]">
            <p className="inline-flex items-center gap-2.5 rounded-full bg-[color:var(--board-blue-pale)] px-4 py-2 font-mono text-[0.75rem] font-medium uppercase tracking-[0.14em] text-[color:var(--board-blue-ink)]">
              <span
                aria-hidden
                className="size-2 rounded-full bg-[color:var(--board-blue-ink)]"
              />
              Prévention des risques · TPE et PME
            </p>
            <h1 className="lp-titre lp-h1 mt-6 max-w-[11ch]">
              Votre copilote prévention.
            </h1>
            <p className="lp-lede mt-7 max-w-[46ch]">
              {/* Espace insécable avant le deux-points : sans elle, la ligne
                  peut casser juste avant, et le signe se retrouve seul en
                  début de ligne. */}
              Rojer coordonne la prévention des risques de votre
              structure&nbsp;: vérifications, rapports, registres, plan
              d&apos;actions. Vous gardez la main sur votre dossier — vous
              n&apos;en gardez plus la charge.
            </p>

            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href={ctaHref} className="lp-btn lp-btn-ink">
                {ctaLabel}
                <span className="lp-fleche" aria-hidden>
                  →
                </span>
              </Link>
              <a href="#documents" className="lp-btn lp-btn-clair">
                Voir les documents
              </a>
            </div>

          </div>

          <HeroBrief />
        </div>
      </section>

      <Manifeste />
      <Cadran chiffres={chiffres} />
      <TableauDeBord />
      <Etapes
        chiffres={chiffres}
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        connecte={Boolean(user)}
      />
      <Questions />
      <SiteFooter />
    </main>
  );
}
