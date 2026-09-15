import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { estSansRendezVous } from "@/lib/etats-permanents/regle";

/**
 * FUSIBLE — ce que la réconciliation ne sait pas réaligner (ADR-034, N4 point 6,
 * relecture NB4). Posé le 2026-09-15.
 *
 * LE DÉFAUT, TEL QU'IL EST. Une ligne dont l'obligation s'applique encore mais
 * n'engendre plus de rendez-vous n'arrive jamais par `aMettreAJour` : elle
 * passe par la boucle finale de `reconcilierCalendrier`, qui la compte
 * « inchangée » ou la rouvre par `aDesarchiver`. Dans les deux cas, SEUL
 * `archiveLe` est écrit. Sa périodicité, son échéance et son statut restent
 * ceux de sa dernière génération. Si c'était un rythme — triennale, semestrielle
 * —, les prédicats de `retard.ts`, qui lisent la périodicité DE LA LIGNE, la
 * liront en retard dès que sa date passe, sur une obligation qui n'a plus de
 * rythme du tout.
 *
 * POURQUOI CE N'EST PAS CORRIGÉ ICI. Réaligner exige de connaître la
 * périodicité EFFECTIVE de la ligne — celle du référentiel, sauf surcharge
 * d'une prescription sur cet appareil (ADR-035). L'ensemble
 * `obligationsEncoreApplicables` n'en porte que la clé ; pour les lignes de
 * salarié il est même délibérément plus large que la génération (titres de
 * personnes sorties). Le faire porter l'obligation et non sa clé est une
 * refonte du contrat de la réconciliation, pas une garde de trois lignes.
 * Déduire « non générée, donc `autre` » marcherait pour l'équipement et
 * l'établissement et serait faux pour le salarié.
 *
 * CE QUE CE FUSIBLE TIENT, ET CE QU'IL NE TIENT PAS.
 *
 *  · Il tient le chemin du RÉFÉRENTIEL : une obligation qui PASSE à `autre`.
 *    Ses lignes déjà en base gardent leur ancien rythme. C'est déjà arrivé une
 *    fois — l'habilitation électrique, de triennale à `autre` (ADR-023 § 6).
 *    La liste ci-dessous est l'ensemble des obligations sans rendez-vous au
 *    2026-09-15 ; toute entrée neuve fait rougir le test, et la personne qui
 *    l'ajoute doit dire si l'obligation est NOUVELLE (sans ligne en base : il
 *    suffit de l'ajouter) ou si elle AVAIT UN RYTHME (ses lignes existantes
 *    garderont ce rythme : il faut une reprise ou la correction ci-dessus).
 *
 *  · Il NE TIENT PAS le chemin des PRESCRIPTIONS, qui est ouvert aujourd'hui,
 *    mesuré le 2026-09-15 en appelant les fonctions réelles : une prescription
 *    `renforce_periodicite` sur `porte-auto-maintien-en-etat` donne une ligne
 *    semestrielle ; un rapport la fait rouler ; la prescription levée,
 *    l'obligation retombe à `autre`, la ligne n'est plus générée et reste
 *    « inchangée » — semestrielle, `prescriptionId` compris, en retard dès sa
 *    date passée. Archivée entre-temps (appareil retiré puis réactivé), elle est
 *    rouverte par `aDesarchiver` dans le même état. Aucun test unitaire ne peut
 *    le rendre impossible : ce sont des données saisies. L'ADR dit « cas
 *    hypothétique » ; il ne l'est pas.
 */

// Ordre alphabétique. Toute modification de cette liste se justifie dans le
// message de commit : entrée neuve ou changement de rythme (voir l'en-tête).
const SANS_RENDEZ_VOUS_AU_2026_09_15 = [
  "ascenseur-carnet-entretien",
  "ascenseur-entretien-contrat",
  "ascenseur-telealarme-liaison",
  "co-activite-etablissement-protocole-securite",
  "conduite-salarie-autorisation",
  "conduite-salarie-formation",
  "eclairage-etablissement-regles-entretien",
  "elec-erp-presence-personne-qualifiee",
  "elec-salarie-habilitation",
  "elec-travail-carnet-prescriptions",
  "elec-travail-consignation-registre",
  "elec-travail-habilitation-personnel",
  "epi-etablissement-consigne-utilisation",
  "esp-dossier-suivi",
  "esp-personnel-formation",
  "formation-securite-etablissement-information",
  "formation-securite-etablissement-manutention",
  "formation-securite-etablissement-organisation",
  "formation-securite-etablissement-travail-sur-ecran",
  "formation-securite-salarie-accueil",
  "formation-securite-salarie-designe-competent",
  "froid-controle-etancheite-apres-modification",
  "habitation-consignes-plans-intervention",
  "habitation-registre-securite",
  "incendie-erp-5-sommeil-consigne-chambres",
  "incendie-erp-5-sommeil-plans-affiches",
  "incendie-registre-securite",
  "incendie-travail-consigne-affichee",
  "incendie-travail-moyens-lutte",
  "information-etablissement-affichages-obligatoires",
  "information-etablissement-avis-acces-duerp",
  "levage-registre-securite-consignation",
  "locaux-etablissement-eau-potable",
  "locaux-etablissement-emplacement-restauration",
  "locaux-etablissement-installations-sanitaires",
  "locaux-etablissement-local-restauration",
  "porte-auto-dossier-maintenance",
  "porte-auto-maintien-en-etat",
  "prevention-etablissement-cse",
  "prevention-etablissement-liste-personnes-qualifiees",
  "prevention-etablissement-reglement-interieur",
  "prevention-etablissement-salarie-designe",
  "sante-travail-etablissement-adhesion-spst",
  "sante-travail-etablissement-fiche-entreprise",
  "secours-etablissement-materiel",
  "secours-etablissement-mesures",
  "secours-salarie-secouriste",
  "signalisation-etablissement-alimentation-secours-presence",
  "signalisation-etablissement-cheminements-evacuation",
  "signalisation-etablissement-entretien",
  "signalisation-etablissement-obstacles-zones-dangereuses",
  "signalisation-etablissement-risques-residuels",
  "signalisation-incendie-moyens-lutte",
  "signalisation-stockage-substances-dangereuses",
  "stockage-dangereux-declaration-icpe",
  "stockage-dangereux-fiches-donnees",
  "stockage-dangereux-formation-personnel",
  "stockage-dangereux-retention",
  "stockage-dangereux-verification-etancheite",
];

describe("fusible NB4 — une ligne rouverte ne réaligne pas sa périodicité", () => {
  const connues = new Set(SANS_RENDEZ_VOUS_AU_2026_09_15);
  // Le filtre est celui du générateur, pas une recopie : c'est `estSansRendezVous`
  // qui décide qu'une obligation n'engendre plus de ligne.
  const actuelles = obligationsConformite
    .filter((o) => estSansRendezVous(o.periodicite))
    .map((o) => o.id);

  it("aucune obligation ne passe à « sans rendez-vous » sans qu'on l'ait regardée", () => {
    const nouvelles = actuelles.filter((id) => !connues.has(id));
    expect(
      nouvelles,
      "Obligation(s) désormais sans rendez-vous et absente(s) de la liste. " +
        "Si elle AVAIT UN RYTHME, ses lignes en base le garderont : " +
        "`reconcilierCalendrier` ne réécrit qu'`archiveLe` sur une ligne " +
        "applicable non générée (ADR-034, N4 point 6). Si elle est neuve, " +
        "ajoutez-la à la liste.",
    ).toEqual([]);
  });

  it("la liste ne garde pas une obligation qui a retrouvé un rythme", () => {
    // Sans ce second sens, une obligation passée à un rythme puis revenue à
    // `autre` traverserait le fusible en silence : son identifiant serait
    // toujours dans la liste, alors que ses lignes, entre-temps, auraient été
    // générées avec un rythme.
    const presentes = new Set(actuelles);
    const perimees = SANS_RENDEZ_VOUS_AU_2026_09_15.filter(
      (id) => !presentes.has(id),
    );
    expect(
      perimees,
      "Obligation(s) de la liste qui ont un rythme ou ont quitté le " +
        "référentiel : retirez-les.",
    ).toEqual([]);
  });
});
