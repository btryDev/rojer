import Link from "next/link";

import { BoutonEnvoi } from "@/components/abonnements/BoutonEnvoi";
import { CarteAbonnement, OffreFermee, TEXTE_AIDE } from "@/components/abonnements/CarteAbonnement";
import { MenuAbonnement } from "@/components/abonnements/MenuAbonnement";
import { RecapPaiement } from "@/components/abonnements/RecapPaiement";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { PageDuCompte } from "@/components/compte/PageDuCompte";
import { buttonVariants } from "@/components/ui/button";
import { ouvrirPortailAction } from "@/lib/abonnements/actions";
import { etatDeLAbonnement } from "@/lib/abonnements/page-abonnement";
import { PAGE_FORMULES } from "@/lib/abonnements/sous-pages";
import { GESTE_DU_PORTAIL, type SituationPortail } from "@/lib/abonnements/vue-abonnement";

export const metadata = {
  title: "Paiement et factures — Rojer",
};

/** Ce que fait le portail, dit avant le clic, selon la situation (`vueAbonnement`). */
const CE_QUE_FAIT_LE_PORTAIL: Record<SituationPortail, string> = {
  "a-regler": "Changez de carte, ou confirmez le paiement si votre banque le demande : il est relancé aussitôt.",
  "fin-prevue": "Reprendre l'abonnement annule la fin prévue ; rien n'est prélevé avant la date de renouvellement.",
  "a-jour": "Changer de carte, télécharger vos factures, modifier l'adresse de facturation ou résilier.",
};

/**
 * Paiement et factures (2026-11-17, sous-page de l'abonnement). La carte, les
 * factures et la résiliation se gèrent sur le portail de Stripe (ADR-053
 * § 12) : la page ne lit rien chez Stripe — décision de la propriétaire du
 * même jour, le portail montre déjà carte et factures. Elle dit ce que la
 * copie locale sait (rythme, prochain prélèvement, fin prévue), et ouvre le
 * portail au clic (`ouvrirPortailAction`, qui seul crée la session).
 */
export default async function PaiementPage() {
  const { compteId, ligne, formule, droits, vue } = await etatDeLAbonnement();
  const aRegler = vue.cas === "portail" && vue.situation === "a-regler";

  return (
    <PageDuCompte
      titre="Paiement et factures"
      description="Votre carte, vos factures et la résiliation, sur la page sécurisée de Stripe, notre prestataire de paiement."
      menu={<MenuAbonnement />}
    >
      {vue.cas === "fermee" ? (
        <OffreFermee />
      ) : (
        <CarteAbonnement titre={aRegler ? "Un paiement à régler" : "Votre paiement"}>
          {vue.cas === "membre" ? (
            <p className={TEXTE_AIDE}>
              Réservé au propriétaire du compte : la carte, les factures et la résiliation se gèrent depuis son accès.
            </p>
          ) : vue.cas === "portail" && ligne ? (
            <>
              <RecapPaiement ligne={ligne} formule={formule} situation={vue.situation} />
              {/* Un impayé : le portail de Stripe, où la carte se change (il
                  l'enregistre et la met par défaut) et la facture se paie ou
                  se confirme. La page de la facture, elle, n'enregistre pas
                  une carte saisie sans la case « sauvegarder » : la carte
                  refusée restait celle du mois suivant (répétition du
                  2026-11-17). */}
              <form action={ouvrirPortailAction} className="flex flex-col items-start gap-4">
                <ChampCompteAttendu compteId={compteId} />
                <p className={TEXTE_AIDE}>
                  {CE_QUE_FAIT_LE_PORTAIL[vue.situation]}
                  {aRegler && !droits.saisie ? " La saisie se rouvre dès qu'il est passé." : null}
                </p>
                <BoutonEnvoi variant="board">{GESTE_DU_PORTAIL[vue.situation]}</BoutonEnvoi>
              </form>
            </>
          ) : (
            <>
              <p className={TEXTE_AIDE}>
                Aucune carte enregistrée et aucune facture en cours : rien ne vous est prélevé tant que vous ne vous abonnez pas.
              </p>
              <Link href={PAGE_FORMULES} className={`${buttonVariants({ variant: "board", size: "board" })} w-fit`}>
                Choisir une formule
              </Link>
            </>
          )}
        </CarteAbonnement>
      )}
    </PageDuCompte>
  );
}
