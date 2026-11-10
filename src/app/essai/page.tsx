import Link from "next/link";
import { redirect } from "next/navigation";
import { FormulaireEssai } from "@/components/abonnements/FormulaireEssai";
import { aiguillageSansCompte, compteDeLaPage } from "@/lib/auth/compte";
import { requireUser } from "@/lib/auth/require-user";
import { aiguillageEssai, PRIX_D_ESSAI } from "@/lib/abonnements/essai";
import { CLES_FORMULES, FORMULES, lookupKey } from "@/lib/abonnements/formules";
import { eurosHT } from "@/lib/abonnements/affichage";
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

  // Le compte de la personne, s'il existe déjà : l'essai partira sur lui seul.
  const { compteId } = await compteDeLaPage();

  const config = configurationStripe();
  // `aiguillageEssai` n'envoie ici que si l'offre est lancée, donc Stripe actif.
  if (!config.active) redirect("/onboarding");
  let prix: Awaited<ReturnType<typeof prixDesFormules>> = new Map();
  try {
    prix = await prixDesFormules(clientStripe(config));
  } catch {
    // Stripe ne répond pas : l'écran le dit, le bouton reste fermé.
  }

  const essentiel = FORMULES[CLES_FORMULES[0]];
  const mensuel = prix.get(PRIX_D_ESSAI)?.montantCentimes;
  const annuel = prix.get(lookupKey(CLES_FORMULES[0], "annuel"))?.montantCentimes;
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
          <li>{DUREE_ESSAI_JOURS} jours de la formule {essentiel.libelle}.</li>
          <li>Aucune carte bancaire demandée.</li>
          <li>Votre dossier se crée pendant l&apos;essai : vous passez ensuite à sa mise en place.</li>
        </ul>
      </aside>

      <main className="flex flex-col px-[var(--board-gutter)] py-10">
        {/* La sortie, à toutes les tailles ; la marque, sur téléphone seulement,
            où le rail est replié (comme `WizardShell`). */}
        <div className="mb-8 flex items-center justify-between">
          <Link href="/" className="text-[16px] font-semibold leading-none tracking-[-0.025em] lg:hidden">
            Rojer
          </Link>
          <form action={signOutAction} className="ml-auto">
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
            {DUREE_ESSAI_JOURS} jours pour mettre votre dossier en place avec la formule {essentiel.libelle},
            sans carte bancaire.
          </p>

          <section className="mt-8 max-w-[var(--board-mesure)]" aria-labelledby="titre-ensuite">
            <h2 id="titre-ensuite" className="m-0 text-[14px] font-semibold">
              Ensuite
            </h2>
            <p className="m-0 mt-2 text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)]">
              {mensuel && annuel
                ? `${essentiel.libelle} : ${eurosHT(mensuel)} HT par mois, ou ${eurosHT(annuel)} HT par an. `
                : null}
              Vous choisissez votre formule et le paiement mensuel ou annuel au moment de vous abonner. Rien
              n&apos;est prélevé sans que vous l&apos;ayez demandé ; sans abonnement à la fin de l&apos;essai, vos
              dossiers restent consultables et la saisie s&apos;arrête.
            </p>
          </section>

          <FormulaireEssai disponible={mensuel !== undefined} compteId={compteId} />
        </div>
      </main>
    </div>
  );
}
