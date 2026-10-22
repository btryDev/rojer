/**
 * L'illustration et la teinte de chaque ligne de « Ce qui doit être en place »
 * (2026-10-20, recherche UI de la page).
 *
 * Module pur : ni Prisma ni React. Il ne décide de rien d'autre que d'un dessin
 * et d'un fond — l'état d'une ligne, son rang, son compte restent ceux de
 * `queries.ts`. Une illustration est décorative (`alt=""`) : tout ce qu'elle
 * évoque est écrit à côté d'elle.
 *
 * DEUX TABLES, ET POURQUOI. `SUJET_PAR_OBLIGATION` dit ce qu'on veut montrer
 * pour chaque ligne de l'écran ; `SUJETS_DESSINES` dit quels dessins existent
 * déjà dans `public/illustrations/en-place/`. Un sujet sans dessin retombe sur
 * celui de sa sous-catégorie, puis de sa famille : on peut donc annoncer le
 * sujet juste avant que le dessin n'arrive, sans montrer une image cassée. Les
 * deux tables sont tenues par `illustrations.test.ts` — chaque ligne de l'écran
 * a un sujet, chaque dessin annoncé a son fichier.
 */

import type { GroupeAffichage, SousCategorie } from "./familles";

/** Les sujets prévus. Le nom est celui du fichier, sans extension. */
export type SujetIllustration =
  // planche du 2026-10-20 (première série)
  | "interdiction-fumer"
  | "alarme"
  | "consigne-incendie"
  | "extincteur"
  | "porte-evacuation"
  | "balisage"
  | "trousse-secours"
  | "organisation-secours"
  | "sanitaires"
  | "eau-potable"
  | "avis-duerp"
  | "tableau-affichage"
  | "salarie-designe"
  | "sante-travail"
  | "registre"
  // planches 1 et 2 du 2026-10-20
  | "appel-pompiers"
  | "badge-incendie"
  | "formation-incendie"
  | "panneau-extincteur"
  | "arret-urgence"
  | "centrale-incendie"
  | "plan-intervention"
  | "porte-chambre"
  | "plan-evacuation"
  | "defibrillateur"
  | "chaleur"
  | "ventilation"
  | "ascenseur"
  | "tableau-electrique"
  | "eclairage-securite"
  | "porte-automatique"
  | "panier-sport"
  | "badge-electrique"
  | "avis-controle"
  | "exploitant"
  | "organigramme"
  | "cse"
  | "restauration"
  | "panneau-danger"
  | "stockage-dangereux"
  | "carnet-electrique"
  | "epi"
  | "manutention"
  | "reglement-interieur"
  | "fiches-securite";

/** Les sujets dont le fichier est déposé. Ajouter un dessin = l'ajouter ici. */
export const SUJETS_DESSINES: ReadonlySet<SujetIllustration> = new Set<SujetIllustration>([
  "interdiction-fumer",
  "alarme",
  "consigne-incendie",
  "extincteur",
  "porte-evacuation",
  "balisage",
  "trousse-secours",
  "organisation-secours",
  "sanitaires",
  "eau-potable",
  "avis-duerp",
  "tableau-affichage",
  "salarie-designe",
  "sante-travail",
  "registre",
  "appel-pompiers",
  "badge-incendie",
  "formation-incendie",
  "panneau-extincteur",
  "arret-urgence",
  "centrale-incendie",
  "plan-intervention",
  "porte-chambre",
  "plan-evacuation",
  "defibrillateur",
  "chaleur",
  "ventilation",
  "ascenseur",
  "tableau-electrique",
  "eclairage-securite",
  "porte-automatique",
  "panier-sport",
  "badge-electrique",
  "avis-controle",
  "exploitant",
  "organigramme",
  "cse",
  "restauration",
  "panneau-danger",
  "stockage-dangereux",
  "carnet-electrique",
  "epi",
  "manutention",
  "reglement-interieur",
  "fiches-securite",
]);

/**
 * Ce qu'on montre pour chaque ligne de l'écran (`usageEcran` non nul). La clé
 * est l'identifiant de l'obligation ; une ligne absente d'ici fait échouer le
 * test, pour qu'une obligation neuve ne passe pas sans qu'on ait choisi son
 * dessin.
 */
export const SUJET_PAR_OBLIGATION: Readonly<Record<string, SujetIllustration>> = {
  // Incendie et secours — prévenir
  "cuisson-erp-consignes-arret-urgence": "arret-urgence",
  "incendie-erp-interdiction-fumer-affichee": "interdiction-fumer",
  // alerter
  "incendie-erp-5-consignes-affichees": "consigne-incendie",
  "incendie-erp-modalites-appel-pompiers-affichees": "appel-pompiers",
  "incendie-travail-alarme-sonore": "alarme",
  "incendie-travail-consigne-affichee": "consigne-incendie",
  // éteindre
  "incendie-erp-5-instruction-personnel": "formation-incendie",
  "incendie-erp-personnel-designe-moyens-secours": "badge-incendie",
  "incendie-travail-extincteurs-dotation": "extincteur",
  "signalisation-erp-5-extincteurs-identification": "panneau-extincteur",
  "signalisation-erp-extincteurs-identification": "panneau-extincteur",
  "signalisation-incendie-moyens-lutte": "panneau-extincteur",
  // évacuer
  "habitation-consignes-plans-intervention": "plan-intervention",
  "incendie-erp-5-sommeil-consigne-chambres": "porte-chambre",
  "incendie-erp-5-sommeil-plans-affiches": "plan-evacuation",
  "incendie-erp-hotel-consigne-chambres": "porte-chambre",
  "incendie-erp-hotel-plans-evacuation-niveaux": "plan-evacuation",
  "incendie-erp-plan-intervention-entrees": "plan-intervention",
  "incendie-travail-instructions-evacuation": "porte-evacuation",
  "signalisation-etablissement-cheminements-evacuation": "balisage",
  // secourir
  "dae-erp-detention": "defibrillateur",
  "secours-etablissement-materiel": "trousse-secours",
  "secours-etablissement-mesures": "organisation-secours",
  "secours-etablissement-signalement-chaleur-intense": "chaleur",
  "sport-etablissement-secours-r322-4": "trousse-secours",
  // Installations et registres
  "aeration-erp-filtres-livret-entretien": "ventilation",
  "ascenseur-carnet-entretien": "ascenseur",
  "ascenseur-entretien-contrat": "ascenseur",
  "ascenseur-telealarme-liaison": "ascenseur",
  "elec-travail-consignation-registre": "tableau-electrique",
  "habitation-registre-securite": "registre",
  "incendie-erp-eclairage-securite-notice-registre": "eclairage-securite",
  "incendie-erp-ssi-contrat-entretien": "centrale-incendie",
  "incendie-registre-securite": "registre",
  "levage-registre-securite-consignation": "registre",
  "porte-auto-dossier-maintenance": "porte-automatique",
  "porte-auto-erp-contrat-entretien": "porte-automatique",
  "porte-auto-maintien-en-etat": "porte-automatique",
  "sport-etablissement-buts-plan-verification": "panier-sport",
  // Qui s'occupe de quoi
  "elec-erp-presence-personne-qualifiee": "badge-electrique",
  "elec-erp-presence-personne-qualifiee-scene-n3": "badge-electrique",
  "elec-travail-habilitation-personnel": "badge-electrique",
  "incendie-erp-5-sommeil-avis-controle-affiche": "avis-controle",
  "incendie-erp-avis-controle-affiche": "avis-controle",
  "incendie-erp-exploitant-present-public": "exploitant",
  "incendie-erp-personnel-qualifie-detection": "badge-incendie",
  "incendie-erp-schema-organisation-securite": "organigramme",
  "prevention-etablissement-cse": "cse",
  "prevention-etablissement-salarie-designe": "salarie-designe",
  "sante-travail-etablissement-adhesion-spst": "sante-travail",
  // Le quotidien de vos salariés — conditions
  "locaux-etablissement-eau-potable": "eau-potable",
  "locaux-etablissement-emplacement-restauration": "restauration",
  "locaux-etablissement-installations-sanitaires": "sanitaires",
  "locaux-etablissement-local-restauration": "restauration",
  "prevention-etablissement-evaluation-chaleur-intense": "chaleur",
  "signalisation-etablissement-risques-residuels": "panneau-danger",
  "signalisation-stockage-substances-dangereuses": "stockage-dangereux",
  // informer
  "elec-travail-carnet-prescriptions": "carnet-electrique",
  "epi-etablissement-consigne-utilisation": "epi",
  "formation-securite-etablissement-manutention": "manutention",
  "information-etablissement-affichages-obligatoires": "tableau-affichage",
  "information-etablissement-avis-acces-duerp": "avis-duerp",
  "prevention-etablissement-reglement-interieur": "reglement-interieur",
  "signalisation-interdiction-fumer-csp": "interdiction-fumer",
  "stockage-dangereux-fiches-donnees": "fiches-securite",
};

/** Le dessin de repli d'une sous-catégorie, puis d'une famille. Tous dessinés. */
const REPLI_SOUS: Record<SousCategorie, SujetIllustration> = {
  prevenir: "interdiction-fumer",
  alerter: "alarme",
  eteindre: "extincteur",
  evacuer: "porte-evacuation",
  secourir: "trousse-secours",
  conditions: "eau-potable",
  informer: "tableau-affichage",
};
const REPLI_GROUPE: Record<GroupeAffichage, SujetIllustration> = {
  incendie_secours: "extincteur",
  // La table de repas, pas les toilettes (2026-10-20, décision de la propriétaire).
  quotidien: "restauration",
  organisation: "salarie-designe",
  installations: "registre",
  autres: "registre",
};

export const DOSSIER_ILLUSTRATIONS = "/illustrations/en-place";

/** Le chemin public du dessin d'une ligne. Toujours un fichier déposé. */
export function illustrationDe(
  obligationId: string,
  groupe: GroupeAffichage,
  sous: SousCategorie | null,
): string {
  const voulu = SUJET_PAR_OBLIGATION[obligationId];
  const sujet =
    voulu && SUJETS_DESSINES.has(voulu)
      ? voulu
      : sous
        ? REPLI_SOUS[sous]
        : REPLI_GROUPE[groupe];
  return `${DOSSIER_ILLUSTRATIONS}/${sujet}.png`;
}

/** Le dessin d'une étape (sous-catégorie) ou d'une famille entière. */
export function illustrationDuBloc(
  groupe: GroupeAffichage,
  sous: SousCategorie | null,
): string {
  return `${DOSSIER_ILLUSTRATIONS}/${sous ? REPLI_SOUS[sous] : REPLI_GROUPE[groupe]}.png`;
}

/**
 * La teinte de fond d'une ligne. Elle suit le code des panneaux de sécurité,
 * adouci : le matériel incendie en corail, l'évacuation et les secours en
 * menthe, le quotidien en bleu ciel, l'organisation et les registres en lilas.
 * Ces teintes ne colorent que des fonds d'illustration — jamais un état, une
 * pastille ou un bouton (les états gardent `etats.ts`).
 */
export type TeinteIllustration = "feu" | "secours" | "quotidien" | "organisation";

export function teinteDe(groupe: GroupeAffichage, sous: SousCategorie | null): TeinteIllustration {
  if (groupe === "incendie_secours") {
    return sous === "evacuer" || sous === "secourir" ? "secours" : "feu";
  }
  if (groupe === "quotidien") return "quotidien";
  return "organisation";
}

/**
 * Le fond de chaque teinte. En valeurs et non en variables CSS : Tailwind ne
 * garde dans le CSS servi que les variables qu'une classe emploie, et ces fonds
 * ne sont posés qu'en style en ligne — `var(--illu-feu)` arrivait vide au
 * navigateur (relevé au contrôle visuel du 2026-10-20). Ici est leur seule
 * définition.
 */
export const FOND_TEINTE: Record<TeinteIllustration, string> = {
  feu: "#fbeae5",
  secours: "#e2f2ec",
  quotidien: "#e3f0f8",
  organisation: "#ecebfa",
};
