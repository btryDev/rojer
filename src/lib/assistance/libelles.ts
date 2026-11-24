import type { CategorieAssistance } from "@prisma/client";

/**
 * Les mots de l'assistance (ADR-050, amendée le 2026-11-24). Une seule
 * entrée « Assistance » pour toutes les formules ; les questions de
 * prévention sont réservées à la formule Pro, les sujets de l'application
 * ouverts à tous. Le formulaire ne nomme personne : la réponse part par
 * e-mail, au nom de Rojer (décision de la propriétaire du 2026-11-24 — ni
 * BTRY, ni « l'expert »). Module pur : composants clients et action serveur
 * le lisent.
 */

/** Les questions de prévention : formule Pro seulement. */
const SUJETS_PREVENTION = [
  "rapport",
  "commission_securite",
  "duerp",
  "prestataire",
  "hors_couverture",
] as const satisfies readonly CategorieAssistance[];

/** Une visite ou un accompagnement sur place, sur devis : ouvert à tous (les encarts qui le proposent). */
const SUJET_SUR_DEVIS = "diagnostic" satisfies CategorieAssistance;

/** Les sujets de l'application : toutes les formules. */
const SUJETS_APPLICATION = ["ecran", "connexion", "abonnement", "autre"] as const satisfies readonly CategorieAssistance[];

export const CATEGORIES_ASSISTANCE = [
  ...SUJETS_PREVENTION,
  SUJET_SUR_DEVIS,
  ...SUJETS_APPLICATION,
] as const satisfies readonly CategorieAssistance[];

export const LABEL_CATEGORIE_ASSISTANCE: Record<CategorieAssistance, string> = {
  rapport: "Un rapport de contrôle",
  commission_securite: "Une commission de sécurité",
  duerp: "Le DUERP",
  prestataire: "Un prestataire, une correction",
  hors_couverture: "Un sujet que Rojer ne suit pas",
  diagnostic: "Une visite sur place, sur devis",
  ecran: "Un écran ne fonctionne pas",
  connexion: "Connexion ou compte",
  abonnement: "Abonnement ou facture",
  autre: "Autre chose",
};

/** Une question de prévention demande la formule Pro. */
export function exigeLaFormulePro(c: CategorieAssistance): boolean {
  return (SUJETS_PREVENTION as readonly CategorieAssistance[]).includes(c);
}

/** Un problème de l'application : le message emporte la page et le navigateur. */
export function estUnSujetDeLApplication(c: CategorieAssistance): boolean {
  return (SUJETS_APPLICATION as readonly CategorieAssistance[]).includes(c);
}

type GroupeDeSujets = { titre: string | null; sujets: readonly CategorieAssistance[] };

/**
 * Les sujets proposés. En Pro : la prévention (et la visite sur devis),
 * puis l'application. Sinon, l'application seule — et la visite sur devis
 * quand un encart l'a proposée.
 */
export function groupesDeSujets(pro: boolean, initial?: CategorieAssistance | null): GroupeDeSujets[] {
  if (pro) {
    return [
      { titre: "La prévention", sujets: [...SUJETS_PREVENTION, SUJET_SUR_DEVIS] },
      { titre: "L'application", sujets: SUJETS_APPLICATION },
    ];
  }
  if (initial === SUJET_SUR_DEVIS) {
    return [
      { titre: "Votre demande", sujets: [SUJET_SUR_DEVIS] },
      { titre: "L'application", sujets: SUJETS_APPLICATION },
    ];
  }
  return [{ titre: null, sujets: SUJETS_APPLICATION }];
}

/** Le sujet coché à l'ouverture : celui de l'encart s'il est proposé, sinon le premier. */
export function sujetInitial(pro: boolean, initial?: CategorieAssistance | null): CategorieAssistance {
  const proposes = groupesDeSujets(pro, initial).flatMap((g) => g.sujets);
  return initial && proposes.includes(initial) ? initial : proposes[0];
}

export const LIBELLE_BESOIN_AIDE = "Besoin d'aide ?";

/** La valeur du choix « Tout le compte » : aucun établissement, et pas celui de la page. */
export const TOUT_LE_COMPTE = "compte";

/** La page « Assistance » d'un établissement : le rail, le tableau de bord, les encarts y mènent. */
export const cheminAssistance = (etablissementId: string) => `/etablissements/${etablissementId}/assistance`;

/** Ce que voit un compte sans la formule Pro devant une question de prévention. */
export const MESSAGE_FORMULE_PRO =
  "Les questions de prévention viennent avec la formule Pro : la réponse arrive par e-mail, et vous réservez un rendez-vous par an.";

export const MESSAGE_MAX = 2000;
export const CONTEXTE_MAX = 300;
// Le plafond des demandes par jour : `LIMITES.assistanceCompte` (`securite/limite-debit.ts`).
