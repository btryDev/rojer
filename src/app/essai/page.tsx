import Link from "next/link";
import { redirect } from "next/navigation";
import { FormulaireEssai, type OffreAffichee } from "@/components/abonnements/FormulaireEssai";
import { aiguillageSansCompte } from "@/lib/auth/compte";
import { requireUser } from "@/lib/auth/require-user";
import { aiguillageEssai } from "@/lib/abonnements/essai";
import { CLES_FORMULES, FORMULES, PERIODICITES, lookupKey, pointsDeFormule } from "@/lib/abonnements/formules";
import { LogOut } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { clientStripe } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { DUREE_ESSAI_JOURS, prixDesFormules } from "@/lib/stripe/parcours";
import { ajouterJours, formaterDateLongueFr } from "@/lib/dates";
import { instantDuRendu } from "@/lib/dates/instant-du-rendu";

export const metadata = {
  title: "Votre essai gratuit — Rojer",
};

/**
 * L'essai gratuit (ADR-053 § 8) : entre la confirmation de l'adresse et
 * l'onboarding, une fois par compte, pour le propriétaire. Une personne
 * invitée rejoint d'abord son compte (`aiguillageSansCompte`) ; quiconque n'a
 * plus d'essai à démarrer est renvoyé à l'onboarding.
 */
export default async function EssaiPage() {
  await requireUser();
  const invitation = await aiguillageSansCompte();
  if (invitation) redirect(invitation);
  if ((await aiguillageEssai()) === null) redirect("/onboarding");

  const config = configurationStripe();
  // `aiguillageEssai` n'envoie ici que si l'offre est lancée, donc Stripe actif.
  if (!config.active) redirect("/onboarding");
  let prix: Awaited<ReturnType<typeof prixDesFormules>> = new Map();
  try {
    prix = await prixDesFormules(clientStripe(config));
  } catch {
    // Stripe ne répond pas : l'écran le dit, le bouton reste fermé.
  }

  const offres: OffreAffichee[] = CLES_FORMULES.map((f) => ({
    formule: f,
    libelle: FORMULES[f].libelle,
    pourQui: FORMULES[f].pourQui,
    points: pointsDeFormule(f),
    prix: Object.fromEntries(
      PERIODICITES.map((p) => {
        const cle = lookupKey(f, p);
        return [p, { cle, centimes: prix.get(cle)?.montantCentimes ?? null }];
      }),
    ) as OffreAffichee["prix"],
  }));
  // Le jour civil, pas 30 × 24 h : un changement d'heure ne décale pas la date.
  const fin = ajouterJours(instantDuRendu(), DUREE_ESSAI_JOURS);

  return (
    <div className="grid min-h-screen grid-cols-1 bg-[color:var(--board-canvas)] text-[color:var(--board-ink)] lg:grid-cols-[320px_1fr]">
      {/* Le même rail que la mise en place : l'essai en est l'étape d'avant. */}
      <aside className="hidden flex-col gap-8 bg-[color:var(--board-ink)] px-7 py-8 text-white lg:flex">
        <Link
          href="/"
          className="text-[17px] font-semibold leading-none tracking-[-0.025em] text-white transition-colors hover:text-white/75"
        >
          Rojer
        </Link>
        <h2 className="board-titre m-0 text-[26px] text-white">Votre essai gratuit</h2>
        <ul className="m-0 flex list-none flex-col gap-4 p-0 text-[13px] leading-[1.5] text-white/75">
          <li>{DUREE_ESSAI_JOURS} jours, toutes les fonctions de la formule choisie.</li>
          <li>Aucune carte bancaire demandée.</li>
          <li>Votre dossier se crée pendant l&apos;essai : vous passez ensuite à sa mise en place.</li>
        </ul>
      </aside>

      <main className="flex flex-col px-[var(--board-gutter)] py-10">
        {/* Le rail est replié sur téléphone : la marque et la sortie y sont
            redonnées, comme dans la mise en place (`WizardShell`). */}
        <div className="mb-8 flex items-center justify-between lg:hidden">
          <Link href="/" className="text-[16px] font-semibold leading-none tracking-[-0.025em]">
            Rojer
          </Link>
          <form action={signOutAction}>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-[12.5px] text-[color:var(--board-slate-mid)] underline decoration-[color:var(--board-slate)] decoration-dotted underline-offset-4 transition-colors hover:text-[color:var(--board-ink)]"
            >
              <LogOut aria-hidden className="size-3.5" />
              Déconnexion
            </button>
          </form>
        </div>
        <div className="w-full max-w-[760px]">
          <h1 className="board-titre m-0 text-[clamp(30px,3.4vw,44px)] leading-[1.08]">
            Essayez Rojer jusqu&apos;au {formaterDateLongueFr(fin)}.
          </h1>
          <p className="m-0 mt-4 max-w-[var(--board-mesure)] text-[15px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            {DUREE_ESSAI_JOURS} jours pour mettre votre dossier en place, sans carte bancaire. Choisissez la
            formule à essayer : vous pourrez en changer à tout moment.
          </p>
          <FormulaireEssai offres={offres} />
        </div>
      </main>
    </div>
  );
}
