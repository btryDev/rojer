/**
 * Le dessin de chaque titre du catalogue salarié (refonte de la fiche, 2026-10-24).
 *
 * Module pur. Il ne décide que d'un dessin et d'un fond : l'état d'un titre,
 * son échéance, restent ceux de `etat-titre.ts`. Les dessins sont ceux de « Ce
 * qui doit être en place » (`public/illustrations/en-place/`), plus trois de
 * la planche 3 (`personne`, `chariot-elevateur`, `casque-securite`), décoratifs
 * (`alt=""`) — tout ce qu'ils évoquent est écrit à côté.
 *
 * `illustration-titre.test.ts` tient la table : chaque titre du catalogue a son
 * dessin, et chaque dessin a son fichier.
 */
import {
  DOSSIER_ILLUSTRATIONS,
  FOND_TEINTE,
  type TeinteIllustration,
} from "@/lib/etats-permanents/illustrations";

type DessinTitre = { sujet: string; teinte: TeinteIllustration };

/**
 * Les teintes suivent celles de l'écran « en place » : le soin et les secours
 * en menthe, le geste au poste en bleu ciel, la représentation en lilas.
 */
export const DESSIN_PAR_TITRE: Readonly<Record<string, DessinTitre>> = {
  // Les visites et attestations médicales.
  "sante-travail-salarie-vip": { sujet: "sante-travail", teinte: "secours" },
  "sante-travail-salarie-vip-adaptee": { sujet: "sante-travail", teinte: "secours" },
  "sante-travail-salarie-sir": { sujet: "sante-travail", teinte: "secours" },
  "sante-travail-salarie-sir-categorie-a": { sujet: "sante-travail", teinte: "secours" },
  "sante-travail-salarie-sir-visite-intermediaire": { sujet: "sante-travail", teinte: "secours" },
  "conduite-salarie-attestation-medicale": { sujet: "sante-travail", teinte: "secours" },
  "elec-salarie-attestation-medicale-voisinage": { sujet: "sante-travail", teinte: "secours" },
  // Les formations et habilitations au poste.
  "formation-securite-salarie-accueil": { sujet: "casque-securite", teinte: "quotidien" },
  "elec-salarie-habilitation": { sujet: "badge-electrique", teinte: "quotidien" },
  "conduite-salarie-formation": { sujet: "chariot-elevateur", teinte: "quotidien" },
  "conduite-salarie-autorisation": { sujet: "chariot-elevateur", teinte: "quotidien" },
  "secours-salarie-secouriste": { sujet: "trousse-secours", teinte: "secours" },
  // La prévention organisée.
  "formation-securite-salarie-cse-sst": { sujet: "cse", teinte: "organisation" },
  "formation-securite-salarie-designe-competent": { sujet: "salarie-designe", teinte: "organisation" },
};

/** Le repli d'un titre absent de la table — le test l'interdit, l'écran survit. */
const REPLI: DessinTitre = { sujet: "registre", teinte: "organisation" };

export function dessinDuTitre(obligationId: string): { src: string; fond: string } {
  const d = DESSIN_PAR_TITRE[obligationId] ?? REPLI;
  return { src: `${DOSSIER_ILLUSTRATIONS}/${d.sujet}.png`, fond: FOND_TEINTE[d.teinte] };
}
