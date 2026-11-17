import { Marque } from "@/components/marque/Marque";
import { redirect } from "next/navigation";
import { FormulaireEssai } from "@/components/abonnements/FormulaireEssai";
import { aiguillageSansCompte, compteDeLaPage } from "@/lib/auth/compte";
import { requireUser } from "@/lib/auth/require-user";
import { aiguillageEssai, PRIX_D_ESSAI } from "@/lib/abonnements/essai";
import { CLES_FORMULES, FORMULES } from "@/lib/abonnements/formules";
import { prixTTC } from "@/lib/abonnements/affichage";
import { ConnecteAvec } from "@/components/compte/ConnecteAvec";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { lireOffreChoisie } from "@/lib/abonnements/offre-choisie";
import { clientStripeLecture } from "@/lib/stripe/client";
import { configurationStripe } from "@/lib/stripe/config";
import { prixDesFormules } from "@/lib/stripe/parcours";
import { DUREE_ESSAI_JOURS } from "@/lib/abonnements/formules";
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
  const user = await requireUser();
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
    prix = await prixDesFormules(clientStripeLecture(config));
  } catch {
    // Stripe ne répond pas : l'écran le dit, le bouton reste fermé.
  }

  const essentiel = FORMULES[CLES_FORMULES[0]];
  // L'offre choisie sur la page publique : l'essai reste sur Essentiel, on le dit.
  const offre = await lireOffreChoisie();
  const autreFormule = offre && offre.formule !== CLES_FORMULES[0] ? FORMULES[offre.formule].libelle : null;
  const mensuel = prix.get(PRIX_D_ESSAI)?.montantCentimes;
  // Le jour civil, pas 30 × 24 h : un changement d'heure ne décale pas la date.
  const fin = ajouterJours(instantDuRendu(), DUREE_ESSAI_JOURS);

  const finTexte = formaterDateLongueFr(fin);
  const filet = <hr className="m-0 border-0 border-t border-[color:var(--board-slate-line)]" />;

  // 2026-11-16, décision de la propriétaire (piste A) : plus de rail d'encre.
  // Une carte centrée, un seul geste : le récapitulatif de l'essai, sa frise
  // datée (aujourd'hui, le rappel, la fin), les conditions et le bouton.
  return (
    <div className="flex min-h-screen flex-col bg-[color:var(--board-canvas)] text-[color:var(--board-ink)]">
      <header className="flex flex-wrap items-center justify-between gap-3 px-[var(--board-gutter)] py-5">
        <Marque />
        {user.email && <ConnecteAvec email={user.email} className="justify-end" />}
      </header>

      <main className="flex flex-1 justify-center px-[var(--board-gutter)] pb-16 pt-4">
        <div className="carte-board flex w-full max-w-[560px] flex-col gap-6 self-start px-7 py-8 sm:px-8">
          <h1 className="board-titre m-0 text-[clamp(28px,3vw,34px)]">Votre essai gratuit</h1>

          <dl className="m-0 grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2.5 text-[14px] leading-[1.45]">
            <Ligne terme="Formule">{essentiel.libelle}</Ligne>
            <Ligne terme="Durée">{`${DUREE_ESSAI_JOURS} jours, jusqu'au ${finTexte}`}</Ligne>
            <Ligne terme="Carte bancaire">Non demandée</Ligne>
            {mensuel ? <Ligne terme="Ensuite">{`À partir de ${prixTTC(mensuel, "mensuel")}`}</Ligne> : null}
          </dl>

          {filet}

          <FriseEssai
            etapes={[
              { quand: "Aujourd'hui", quoi: "Votre essai commence. Vous mettez votre établissement en place." },
              // S'abonner se fait à tout moment, sans date ; les rappels (J-7,
              // veille) ne sont pas promis ici (garde `sans-qualification`).
              { quand: "Quand vous voulez", quoi: "Abonnez-vous depuis la page Abonnement : l'essai s'arrête et ses limites sont levées." },
              {
                quand: finTexte,
                quoi: "Fin de l'essai. Pour continuer à saisir, abonnez-vous ; sinon, rien n'est prélevé et vos dossiers restent consultables douze mois.",
              },
            ]}
          />

          {autreFormule && (
            <MessageFormulaire ton="info">
              Vous avez choisi {autreFormule}. L&apos;essai se fait sur {essentiel.libelle} ; pour passer à{" "}
              {autreFormule}, abonnez-vous depuis la page Abonnement, où elle sera présélectionnée.
            </MessageFormulaire>
          )}

          {filet}

          {/* L'essai ne touche pas Stripe : sans prix lisible, seule la ligne
              « Ensuite » manque, le bouton reste (revue du 2026-11-17). */}
          <FormulaireEssai compteId={compteId} />
        </div>
      </main>
    </div>
  );
}

/** Une ligne du récapitulatif : le terme en gris, la valeur en encre. */
function Ligne({ terme, children }: { terme: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-[color:var(--board-slate-mid)]">{terme}</dt>
      <dd className="m-0 font-medium">{children}</dd>
    </>
  );
}

/**
 * La frise de l'essai : trois jalons datés, une vraie suite. Le point de
 * 12 px est centré sur la première ligne (20 px) ; le trait part 4 px sous un
 * point et s'arrête 4 px avant le suivant. Le jalon en cours est plein.
 */
function FriseEssai({ etapes }: { etapes: readonly { quand: string; quoi: string }[] }) {
  return (
    <ol aria-label="Comment se passe l'essai" className="m-0 flex list-none flex-col p-0">
      {etapes.map((e, i) => {
        const derniere = i === etapes.length - 1;
        return (
          <li key={e.quand} className={`relative grid grid-cols-[12px_minmax(0,1fr)] gap-x-4 ${derniere ? "" : "pb-[22px]"}`}>
            {!derniere && (
              <span
                aria-hidden
                className="absolute bottom-0 left-[5px] top-5 w-0.5 rounded-full bg-[color:var(--board-slate-line)]"
              />
            )}
            <span
              aria-hidden
              className={`mt-1 size-3 rounded-full ${
                i === 0
                  ? "bg-[color:var(--board-ink)]"
                  : "bg-[color:var(--board-card)] shadow-[inset_0_0_0_2px_var(--board-blue-soft)]"
              }`}
            />
            <div>
              <p className="m-0 text-[14px] font-semibold leading-5">{e.quand}</p>
              <p className="m-0 mt-0.5 text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">{e.quoi}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
