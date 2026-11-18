import Link from "next/link";

import { BoutonEnvoi } from "@/components/abonnements/BoutonEnvoi";
import { CarteAbonnement, OffreFermee, TEXTE_AIDE } from "@/components/abonnements/CarteAbonnement";
import { MenuAbonnement } from "@/components/compte/MenuInterne";
import { Recap, RecapPaiement } from "@/components/abonnements/RecapPaiement";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { PageDuCompte } from "@/components/compte/PageDuCompte";
import { buttonVariants } from "@/components/ui/button";
import { ouvrirPortailAction } from "@/lib/abonnements/actions";
import { PAGE_ESSAI } from "@/lib/abonnements/essai";
import { FORMULE_D_ESSAI, FORMULES } from "@/lib/abonnements/formules";
import { etatDeLAbonnement } from "@/lib/abonnements/page-abonnement";
import { formaterDateLongueFr } from "@/lib/dates";
import { PAGE_FORMULES } from "@/lib/abonnements/sous-pages";
import { CE_QUE_FAIT_LE_PORTAIL, GESTE_DU_PORTAIL } from "@/lib/abonnements/vue-abonnement";

export const metadata = {
  title: "Paiement et factures — Rojer",
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
  const { compteId, ligne, formule, droits, vue, phase } = await etatDeLAbonnement();
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
          ) : phase.type === "essai" ? (
            <>
              {/* L'essai se lit comme un abonnement qui court (retour de
                  test du 2026-11-17) : pour le dirigeant, il a Essentiel.
                  Rien à payer ni à saisir pendant l'essai : la carte se
                  donne en s'abonnant, à sa fin (ADR-053 § 9). */}
              <Recap
                lignes={[
                  ["Formule", `${FORMULES[FORMULE_D_ESSAI].libelle}, gratuite jusqu'au ${formaterDateLongueFr(phase.fin)}`],
                  ["Prochain prélèvement", "Aucun pendant l'essai"],
                ]}
              />
              <p className={TEXTE_AIDE}>
                À la fin de l&apos;essai, abonnez-vous pour continuer. Valider ou exporter un document officiel demande
                d&apos;être abonné : vous pouvez le faire dès maintenant, votre essai s&apos;arrête alors.
              </p>
              <Link href={PAGE_FORMULES} className={`${buttonVariants({ variant: "boardClair", size: "board" })} w-fit`}>
                Voir les offres
              </Link>
            </>
          ) : vue.cas === "essai" ? (
            // L'essai n'est pas encore démarré : c'est le premier geste, pas
            // « M'abonner » (relecture du 2026-11-17).
            <>
              <p className={TEXTE_AIDE}>
                Aucune carte enregistrée : l&apos;essai gratuit se démarre sans carte, et rien ne vous est prélevé.
              </p>
              <Link href={PAGE_ESSAI} className={`${buttonVariants({ variant: "board", size: "board" })} w-fit`}>
                Démarrer mon essai gratuit
              </Link>
            </>
          ) : (
            <>
              <p className={TEXTE_AIDE}>
                Aucune carte enregistrée et aucune facture en cours : rien ne vous est prélevé tant que vous ne vous abonnez pas.
              </p>
              <Link href={PAGE_FORMULES} className={`${buttonVariants({ variant: "board", size: "board" })} w-fit`}>
                M&apos;abonner
              </Link>
            </>
          )}
        </CarteAbonnement>
      )}
    </PageDuCompte>
  );
}
