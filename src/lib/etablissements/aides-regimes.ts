/**
 * LES MOTS DES QUESTIONS DE RÉGIME, UNE SEULE FOIS (2026-10-12).
 *
 * Le parcours de création (`onboarding/StepTypologie.tsx`) et la fiche
 * (`etablissements/EtablissementForm.tsx`) posent les mêmes deux questions —
 * immeuble de grande hauteur, immeuble d'habitation — et chacun avait écrit
 * son aide. L'audit du 2026-10-12 (B1) les a trouvées fausses toutes deux, et
 * pas de la même façon :
 *
 *  · IGH. La fiche disait « Hauteur > 28 m (habitation) ou > 50 m (autres
 *    activités) » — l'inverse du texte. Le parcours demandait « Votre bâtiment
 *    fait-il plus de 28 mètres de hauteur ? », « environ 9 étages » : il
 *    mesurait le bâtiment jusqu'au toit, quand R. 146-3 mesure le plancher bas
 *    du dernier niveau, et il ignorait les 50 mètres de l'habitation. Selon
 *    l'écran, un dirigeant se faisait refuser à tort ou évitait le refus.
 *  · Habitation. Les deux aides promettaient ramonage, VMC-Gaz, paratonnerres,
 *    ascenseurs ; « oui » n'ajoute que trois lignes d'établissement, plus deux
 *    de VMC-Gaz si l'installation est déclarée. Les ascenseurs sont dus quel
 *    que soit le régime ; ramonage et paratonnerres n'ont aucune ligne.
 *
 * Module pur, sans le référentiel : il se charge dans un composant client.
 * Deux tests le confrontent à ses sources — `aides-regimes.test.ts` relit la
 * citation dans le corpus de R. 146-3, et dérive du référentiel la liste des
 * obligations que la réponse « habitation » déclenche.
 */

/* ─── Immeuble de grande hauteur — CCH R. 146-3 ────────────────────────── */

export const QUESTION_IGH =
  "Votre établissement est-il situé dans un immeuble de grande hauteur (IGH) ?";

/**
 * Le texte, cité et non reformulé. Les deux coupures `[…]` retirent le renvoi
 * à R. 111-1 et la ponctuation de liste ; chaque fragment entre elles figure
 * mot pour mot dans la `citationCle` de R. 146-3 (corpus
 * `cch-classement-erp-igh`), et le test le vérifie.
 */
export const CITATION_R146_3 =
  "dont le plancher bas du dernier niveau est situé, par rapport au niveau du sol le plus haut utilisable pour les engins des services publics de secours et de lutte contre l'incendie : à plus de 50 mètres pour les immeubles à usage d'habitation […] ; à plus de 28 mètres pour tous les autres immeubles";

export const AIDE_IGH =
  `Le code de la construction et de l'habitation (art. R. 146-3) appelle immeuble de grande hauteur tout corps de bâtiment « ${CITATION_R146_3} ». ` +
  "C'est le plancher du dernier niveau qui se mesure, pas le toit. Entre 28 et 50 mètres, un immeuble à usage principal d'habitation en est un aussi lorsque ses locaux autres que d'habitation ne répondent pas aux conditions d'isolement fixées par arrêté (même article ; classe GHZ, art. R. 146-4). " +
  "Ce cas est rare en TPE/PME : en cas de doute, demandez-le au propriétaire ou au gestionnaire de l'immeuble.";

/* ─── Immeuble d'habitation ────────────────────────────────────────────── */

/**
 * Ce que la réponse « oui » ajoute au calendrier, obligation par obligation.
 *
 * C'est une LISTE DE PRODUCTION, pas une liste de test : l'aide se compose
 * d'elle, et `aides-regimes.test.ts` vérifie qu'elle est exactement l'ensemble
 * des obligations du référentiel dont la seule typologie est l'habitation —
 * une obligation ajoutée ou retirée là-bas fait tomber le test ici, au lieu
 * de laisser l'aide promettre ce qui n'existe plus.
 */
export const CE_QUE_DECLENCHE_HABITATION: readonly {
  obligationId: string;
  quoi: string;
  /** L'équipement à déclarer pour que la ligne naisse ; `null` = dès la réponse. */
  siEquipement: "VMC-Gaz" | null;
}[] = [
  {
    obligationId: "habitation-verification-annuelle-installations-securite",
    quoi: "la vérification annuelle des installations de sécurité de l'immeuble",
    siEquipement: null,
  },
  {
    obligationId: "habitation-registre-securite",
    quoi: "la tenue de son registre de sécurité",
    siEquipement: null,
  },
  {
    obligationId: "habitation-consignes-plans-intervention",
    quoi: "l'affichage des consignes d'incendie et des plans d'intervention",
    siEquipement: null,
  },
  {
    obligationId: "aeration-habitation-vmc-gaz-annuelle",
    quoi: "son entretien et sa vérification annuels",
    siEquipement: "VMC-Gaz",
  },
  {
    obligationId: "aeration-habitation-vmc-gaz-quinquennale",
    quoi: "son contrôle quinquennal",
    siEquipement: "VMC-Gaz",
  },
];

function enumerer(items: readonly string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

const dEmblee = CE_QUE_DECLENCHE_HABITATION.filter((c) => c.siEquipement === null);
const avecVmcGaz = CE_QUE_DECLENCHE_HABITATION.filter((c) => c.siEquipement === "VMC-Gaz");

export const AIDE_HABITATION =
  "Uniquement si vous êtes propriétaire ou syndic d'un immeuble de logements collectifs ; rare pour les commerces et restaurants. " +
  `Répondre « oui » ajoute à votre calendrier ${enumerer(dEmblee.map((c) => c.quoi))} (arrêté du 31 janvier 1986)` +
  (avecVmcGaz.length > 0
    ? ` et, si vous déclarez une installation collective de VMC-Gaz, ${enumerer(avecVmcGaz.map((c) => c.quoi))} (arrêté du 23 février 2018).`
    : ".");
