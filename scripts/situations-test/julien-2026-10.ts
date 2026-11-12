// Situations de test remplies par le préventeur (Julien), classeur
// « Rojer-situations-de-test-rempli.xlsx », reçu le 2026-10-27 — fiches 1 à 5,
// les fiches 6 à 10 sont vides.
//
// RÈGLE DE TRANSCRIPTION (décision de la propriétaire du 2026-10-27) : on s'en
// tient à ce qu'il a rempli, rien de plus. Une case vide reste inconnue. Trois
// ajouts seulement, imposés par l'app et non par la fiche :
//   · le code NAF — le mode d'emploi du classeur dit « nous choisirons le code NAF » ;
//   · un SIRET fictif à clé valide (préfixe 9990000), l'onboarding l'exige ;
//   · une adresse manifestement fictive, l'onboarding l'exige aussi.
//
// CE QUI EST LU DE LA FICHE ET NON SAISI, parce que l'onboarding ne pose pas la
// question à cet établissement (le schéma refuserait la réponse) — sans effet
// sur ce que Rojer calcule :
//   · « locaux à sommeil : Non » hors type O (question posée aux seuls types
//     où le sommeil est plausible) ;
//   · le nombre de personnes présentes là où il n'est pas demandé : 1 à
//     Parpaing + (travail seul, l'effectif est le total), 134 à Couche tard
//     (type O de 4ᵉ catégorie, seuil atteint par le type — 2026-11-12) ;
//   · les chiffons imprégnés (R. 4227-26) : question retirée le 2026-10-08.
//
// LES DATES DE GLAGLA ne donnent que l'année (2015, 2020, 2021, 2025, 2026) :
// laissées vides plutôt que d'inventer un jour. Son « dernier contrôle 2026,
// Conforme » sur les extincteurs n'est donc pas saisi.
//
// LES QUESTIONS D'ÉQUIPEMENT sans réponse restent sans réponse (option 1 de la
// propriétaire, 2026-10-27), y compris celles que l'écran exige — levage,
// groupe électrogène en ERP, désenfumage mécanique en ERP 1-4 : l'app les
// relance à l'ouverture (`appareilsMuets`).
//
// [2026-11-12, report sur `cc` : catégories de l'ADR-057 lot C, comme la
// migration `20261107120000_categories_jumelles` les a converties — VMC → VENTILATION, PORTE_AUTO →
// PORTE_PORTAIL_MOTORISE (porte), EPI_ANTICHUTE → EPI (antichute), EPI → EPI
// (autre).]

import type { CategorieEquipement } from "@/lib/referentiels/types-communs";
import type { TypeEpi, TypePorte } from "@/lib/equipements/type-appareil";

export type EquipementSituation = {
  categorie: CategorieEquipement;
  /** Le libellé de la fiche ; vide, le libellé de la catégorie. */
  libelle?: string;
  nombre?: number;
  /** Le type que la catégorie exige (ADR-057 § 5) ; la fiche disait « porte automatique ». */
  typePorte?: TypePorte;
  /** Idem ; la fiche disait « EPI antichute » ou « EPI ». */
  typeEpi?: TypeEpi;
};

export type Situation = {
  /** Le numéro de l'onglet du classeur. */
  fiche: number;
  /** Ce que Julien veut tester, mot pour mot (vide si vide). */
  aTester?: string;
  /**
   * Le nombre de personnes présentes est EXIGÉ par l'onboarding pour cet
   * établissement, et la fiche n'en donne pas : il reste vide (option 1 de la
   * propriétaire, 2026-10-27). Le moteur retient alors « à confirmer », et la
   * fiche établissement redemande le nombre. Seul ce refus-là est passé outre.
   */
  nombreDePersonnesNonDonne?: true;
  /** Les champs du parcours d'onboarding, sous la forme que le schéma lit. */
  onboarding: Record<string, unknown>;
  equipements: EquipementSituation[];
};

const ADRESSE_FICTIVE = (n: number) => `${n} rue de l'Exemple, 75001 Paris`;

export const SITUATIONS: Situation[] = [
  {
    fiche: 1,
    aTester: "erp 5ème",
    // « Personnes présentes » : « aucun intérêt : effectif maximal autorisé ».
    nombreDePersonnesNonDonne: true,
    onboarding: {
      raisonSociale: "Magasin Dupont",
      siret: "99900001100018",
      adresse: ADRESSE_FICTIVE(1),
      // Magasin de bricolage — petite surface, faute de surface indiquée.
      codeNaf: "47.52A",
      effectifEntreprise: 6,
      effectifSurSite: 6,
      estEtablissementTravail: true,
      estERP: true,
      typeErp: "M",
      // La fiche coche la 4ᵉ catégorie ; « erp 5ème » dans « Ce que vous
      // voulez tester » la contredit — la case cochée fait foi, l'écart va
      // dans la note à Julien.
      categorieErp: "N4",
      manipuleMatieresR422722: "non",
      estIGH: false,
      estHabitation: false,
    },
    equipements: [],
  },
  {
    fiche: 2,
    onboarding: {
      raisonSociale: "Entreprise Glagla",
      siret: "99900002900010",
      adresse: ADRESSE_FICTIVE(2),
      // Pose de climatisation.
      codeNaf: "43.22B",
      effectifEntreprise: 10,
      effectifSurSite: 5,
      estEtablissementTravail: true,
      estERP: false,
      manipuleMatieresR422722: "non",
      estIGH: false,
      estHabitation: false,
    },
    equipements: [
      { categorie: "EXTINCTEUR", nombre: 14 },
      { categorie: "INSTALLATION_ELECTRIQUE" },
      { categorie: "BAES", nombre: 8 },
      { categorie: "VENTILATION", nombre: 1 },
      { categorie: "EQUIPEMENT_LEVAGE", libelle: "Chariot", nombre: 1 },
    ],
  },
  {
    fiche: 3,
    onboarding: {
      raisonSociale: "Coif cailloux",
      siret: "99900003700013",
      adresse: ADRESSE_FICTIVE(3),
      // Coiffure.
      codeNaf: "96.02A",
      effectifEntreprise: 5,
      effectifSurSite: 5,
      estEtablissementTravail: true,
      estERP: true,
      typeErp: "M",
      categorieErp: "N5",
      personnesPresentesHabituellement: 5,
      manipuleMatieresR422722: "non",
      estIGH: false,
      estHabitation: false,
    },
    equipements: [
      { categorie: "INSTALLATION_ELECTRIQUE", nombre: 1 },
      { categorie: "EXTINCTEUR", nombre: 3 },
      { categorie: "VENTILATION", nombre: 1 },
      { categorie: "PORTE_PORTAIL_MOTORISE", typePorte: "porte", nombre: 1 },
      { categorie: "BAES", nombre: 3 },
    ],
  },
  {
    fiche: 4,
    onboarding: {
      raisonSociale: "Parpaing +",
      siret: "99900004500016",
      adresse: ADRESSE_FICTIVE(4),
      // Maçonnerie générale et gros œuvre.
      codeNaf: "43.99C",
      effectifEntreprise: 4,
      effectifSurSite: 4,
      estEtablissementTravail: true,
      estERP: false,
      manipuleMatieresR422722: "non",
      estIGH: false,
      estHabitation: false,
    },
    equipements: [
      { categorie: "INSTALLATION_ELECTRIQUE", nombre: 1 },
      { categorie: "EXTINCTEUR", nombre: 4 },
      { categorie: "EQUIPEMENT_LEVAGE", libelle: "Minipelle", nombre: 1 },
      { categorie: "EQUIPEMENT_LEVAGE", libelle: "nacelle de personne", nombre: 1 },
      { categorie: "EPI", typeEpi: "antichute", nombre: 5 },
      { categorie: "EPI", typeEpi: "autre", nombre: 5 },
    ],
  },
  {
    fiche: 5,
    onboarding: {
      raisonSociale: "Couche tard",
      siret: "99900005200012",
      adresse: ADRESSE_FICTIVE(5),
      // Hôtel-restaurant : l'hôtellerie, l'activité que le type O déclare.
      codeNaf: "55.10Z",
      effectifEntreprise: 8,
      effectifSurSite: 6,
      estEtablissementTravail: true,
      estERP: true,
      // Type O seul, comme coché — pas de N ajouté pour le restaurant.
      typeErp: "O",
      categorieErp: "N4",
      comporteLocauxSommeilPublic: "oui",
      // « 134 personnes présentes » : lu de la fiche, non saisi. Le parcours ne
      // le demande plus à un type O de 4ᵉ catégorie, qui franchit le seuil de
      // R. 4227-34 par son type (moteur 7, 2026-10-27) — le schéma refuse la
      // réponse (report sur `cc`, 2026-11-12).
      manipuleMatieresR422722: "non",
      estIGH: false,
      estHabitation: false,
    },
    equipements: [
      { categorie: "INSTALLATION_ELECTRIQUE" },
      { categorie: "EXTINCTEUR" },
      { categorie: "BAES" },
      { categorie: "ALARME_INCENDIE" },
      { categorie: "DESENFUMAGE" },
      { categorie: "ASCENSEUR" },
      { categorie: "VENTILATION" },
      { categorie: "PORTE_PORTAIL_MOTORISE", typePorte: "porte" },
      { categorie: "APPAREIL_CUISSON_ERP" },
      { categorie: "HOTTE_PRO" },
    ],
  },
];
