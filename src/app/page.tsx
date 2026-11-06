import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cadran } from "@/components/landing/Cadran";
import { Etapes } from "@/components/landing/Etapes";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { Manifeste } from "@/components/landing/Manifeste";
import { Questions } from "@/components/landing/Questions";
import { SiteFooter } from "@/components/landing/SiteFooter";
import { TableauDeBord } from "@/components/landing/TableauDeBord";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getOptionalUserEtablissement } from "@/lib/auth/scope";
import { chiffresReferentielSuivi } from "@/lib/referentiels/conformite";
import { RecoveryHashRedirect } from "./RecoveryHashRedirect";

/**
 * La photo du hero. Un seul endroit à changer pour la remplacer.
 *
 * Une patronne de bistrot, dans sa salle avant le service, qui lit son
 * téléphone ; la hotte de la cuisine au fond. Cadrage attendu : 16/9, sujet
 * dans le tiers droit, la salle vide à gauche pour le texte. Cf.
 * `public/photos/README.md`.
 */
const PHOTO_HERO = {
  src: "/photos/hero-restauratrice.jpg",
  alt: "Une restauratrice en tablier marine consulte son téléphone dans la salle de son bistrot avant le service",
  // Sur téléphone, le cadre se resserre : on garde son visage, en haut.
  position: "68% 20%",
};

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
      <RecoveryHashRedirect />
      <LandingHeader
        ctaHref={ctaHref}
        ctaLabel={ctaLabel}
        connecte={Boolean(user)}
      />

      {/* ================================================================
         HERO — une photo de terrain sur toute la largeur, et la promesse
         posée en blanc sur la salle vide, à gauche. Rien d'autre sur
         l'image : le produit se montre dans les sections suivantes.
         Photo et cadrage : `public/photos/README.md`.
         ================================================================ */}
      <section className="px-3 pt-2 sm:px-4">
        <div className="relative isolate flex min-h-[680px] overflow-hidden rounded-[30px] bg-[color:var(--board-ink)] sm:min-h-[560px] lg:aspect-[16/9] lg:max-h-[860px] lg:min-h-0 lg:rounded-[38px]">
          <Image
            src={PHOTO_HERO.src}
            alt={PHOTO_HERO.alt}
            fill
            priority
            sizes="100vw"
            className="-z-10 object-cover"
            style={{ objectPosition: PHOTO_HERO.position }}
          />
          {/* Le voile : de bas en haut sur téléphone, où le texte passe
              sous son visage ; de gauche à droite dès que la salle vide
              laisse la place au texte. */}
          <div
            aria-hidden
            className="absolute inset-0 -z-10 bg-gradient-to-t from-[rgba(8,12,20,0.85)] via-[rgba(8,12,20,0.55)] via-55% to-transparent lg:bg-gradient-to-r lg:from-[rgba(8,12,20,0.72)] lg:via-[rgba(8,12,20,0.5)] lg:via-32% lg:to-[rgba(8,12,20,0)] lg:to-50%"
          />

          <div className="lp-shell flex flex-col justify-end py-10 sm:py-14 lg:justify-center lg:py-16">
            <div className="max-w-[540px]">
              <h1 className="lp-titre lp-h1 max-w-[11ch] text-white">
                Votre copilote prévention.
              </h1>
              <p className="lp-lede mt-7 max-w-[46ch] text-white/85">
                {/* Espace insécable avant le deux-points : sans elle, la ligne
                    peut casser juste avant, et le signe se retrouve seul en
                    début de ligne. */}
                Rojer coordonne la prévention des risques de votre
                structure&nbsp;: vérifications, rapports, registres, plan
                d&apos;actions. Vous gardez la main sur votre dossier — vous
                n&apos;en gardez plus la charge.
              </p>

              <div className="mt-10 flex flex-wrap items-center gap-4">
                <Link href={ctaHref} className="lp-btn lp-btn-blanc">
                  {ctaLabel}
                  <span className="lp-fleche" aria-hidden>
                    →
                  </span>
                </Link>
                <a href="#documents" className="lp-btn lp-btn-verre">
                  Voir les documents
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* « Ce que Rojer tient à jour » passe avant « Concentrez-vous sur
          votre activité » (décision de la propriétaire du 2026-11-06) :
          ce que Rojer produit d'abord, la charge qu'il retire ensuite. */}
      <Cadran chiffres={chiffres} />
      <Manifeste />
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
