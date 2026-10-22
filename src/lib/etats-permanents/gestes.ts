/**
 * La seconde découpe de « Ce qui doit être en place » : par GESTE (2026-10-20,
 * recherche UI, à trancher par la propriétaire et son équipe).
 *
 * La découpe par famille (`familles.ts`, `usageEcran`) range selon le
 * référentiel : incendie et secours, quotidien, organisation, registres. Celle-ci
 * range selon ce que le dirigeant FAIT : afficher, installer, rédiger, désigner,
 * former. Même lignes, même compte, même fiche — seul le regroupement change.
 *
 * UNE TABLE D'AFFICHAGE, PAS UN CHAMP DU RÉFÉRENTIEL. Le geste n'entre ni à
 * l'empreinte ni au moteur : il ne décide d'aucune obligation, il dit seulement
 * où ranger une ligne à l'écran. Si la découpe est retenue, il pourra rejoindre
 * `usageEcran` ; d'ici là, `gestes.test.ts` tient la table complète — une
 * obligation neuve de l'écran sans geste le fait échouer.
 */

import type { FamilleEtatsPermanents, LigneEtatPermanent } from "./queries";

export type Geste = "afficher" | "installer" | "rediger" | "designer" | "former";

export const ORDRE_GESTES: readonly Geste[] = [
  "afficher",
  "installer",
  "rediger",
  "designer",
  "former",
];

export const LIBELLE_GESTE: Record<Geste, string> = {
  afficher: "À afficher",
  installer: "À installer ou aménager",
  rediger: "À rédiger et tenir à jour",
  designer: "À désigner ou souscrire",
  former: "À former et informer",
};

export const SOUS_TITRE_GESTE: Record<Geste, string> = {
  afficher: "Panneaux, consignes et plans au mur",
  installer: "Matériel et locaux",
  rediger: "Documents écrits, registres et dossiers",
  designer: "Une personne, un organisme, un contrat",
  former: "Ce que vos salariés doivent savoir",
};

export const GESTE_PAR_OBLIGATION: Readonly<Record<string, Geste>> = {
  // À afficher
  "incendie-erp-5-consignes-affichees": "afficher",
  "incendie-erp-modalites-appel-pompiers-affichees": "afficher",
  "incendie-travail-consigne-affichee": "afficher",
  "signalisation-erp-5-extincteurs-identification": "afficher",
  "signalisation-erp-extincteurs-identification": "afficher",
  "signalisation-incendie-moyens-lutte": "afficher",
  "habitation-consignes-plans-intervention": "afficher",
  "incendie-erp-5-sommeil-consigne-chambres": "afficher",
  "incendie-erp-5-sommeil-plans-affiches": "afficher",
  "incendie-erp-hotel-consigne-chambres": "afficher",
  "incendie-erp-hotel-plans-evacuation-niveaux": "afficher",
  "incendie-erp-plan-intervention-entrees": "afficher",
  "signalisation-etablissement-cheminements-evacuation": "afficher",
  "cuisson-erp-consignes-arret-urgence": "afficher",
  "incendie-erp-interdiction-fumer-affichee": "afficher",
  "incendie-erp-5-sommeil-avis-controle-affiche": "afficher",
  "incendie-erp-avis-controle-affiche": "afficher",
  "signalisation-etablissement-risques-residuels": "afficher",
  "signalisation-stockage-substances-dangereuses": "afficher",
  "information-etablissement-affichages-obligatoires": "afficher",
  "information-etablissement-avis-acces-duerp": "afficher",
  "signalisation-interdiction-fumer-csp": "afficher",
  // À installer ou aménager
  "incendie-travail-alarme-sonore": "installer",
  "incendie-travail-extincteurs-dotation": "installer",
  "dae-erp-detention": "installer",
  "secours-etablissement-materiel": "installer",
  "sport-etablissement-secours-r322-4": "installer",
  "ascenseur-telealarme-liaison": "installer",
  "porte-auto-maintien-en-etat": "installer",
  "locaux-etablissement-eau-potable": "installer",
  "locaux-etablissement-emplacement-restauration": "installer",
  "locaux-etablissement-installations-sanitaires": "installer",
  "locaux-etablissement-local-restauration": "installer",
  // À rédiger et tenir à jour
  "incendie-travail-instructions-evacuation": "rediger",
  "secours-etablissement-mesures": "rediger",
  "secours-etablissement-signalement-chaleur-intense": "rediger",
  "aeration-erp-filtres-livret-entretien": "rediger",
  "ascenseur-carnet-entretien": "rediger",
  "elec-travail-consignation-registre": "rediger",
  "habitation-registre-securite": "rediger",
  "incendie-erp-eclairage-securite-notice-registre": "rediger",
  "incendie-registre-securite": "rediger",
  "levage-registre-securite-consignation": "rediger",
  "porte-auto-dossier-maintenance": "rediger",
  "sport-etablissement-buts-plan-verification": "rediger",
  "incendie-erp-schema-organisation-securite": "rediger",
  "prevention-etablissement-evaluation-chaleur-intense": "rediger",
  "prevention-etablissement-reglement-interieur": "rediger",
  "stockage-dangereux-fiches-donnees": "rediger",
  "epi-etablissement-consigne-utilisation": "rediger",
  // À désigner ou souscrire
  "incendie-erp-personnel-designe-moyens-secours": "designer",
  "elec-erp-presence-personne-qualifiee": "designer",
  "elec-erp-presence-personne-qualifiee-scene-n3": "designer",
  "incendie-erp-exploitant-present-public": "designer",
  "incendie-erp-personnel-qualifie-detection": "designer",
  "prevention-etablissement-cse": "designer",
  "prevention-etablissement-salarie-designe": "designer",
  "sante-travail-etablissement-adhesion-spst": "designer",
  "ascenseur-entretien-contrat": "designer",
  "incendie-erp-ssi-contrat-entretien": "designer",
  "porte-auto-erp-contrat-entretien": "designer",
  // À former et informer
  "incendie-erp-5-instruction-personnel": "former",
  "elec-travail-habilitation-personnel": "former",
  "elec-travail-carnet-prescriptions": "former",
  "formation-securite-etablissement-manutention": "former",
};

/** Le geste d'une ligne. Une ligne inconnue de la table se range à « rédiger » — le test l'interdit. */
export function gesteDe(obligationId: string): Geste {
  return GESTE_PAR_OBLIGATION[obligationId] ?? "rediger";
}

/** Le dessin d'en-tête de chaque geste (un fichier de `illustrations/en-place`). */
export const DESSIN_GESTE: Record<Geste, string> = {
  afficher: "/illustrations/en-place/consigne-incendie.png",
  installer: "/illustrations/en-place/extincteur.png",
  rediger: "/illustrations/en-place/registre.png",
  designer: "/illustrations/en-place/salarie-designe.png",
  former: "/illustrations/en-place/formation-incendie.png",
};

/** Les lignes d'état de l'écran, rangées par geste, dans l'ordre de la lecture. */
export function lignesParGeste(
  familles: FamilleEtatsPermanents[],
): { geste: Geste; lignes: LigneEtatPermanent[] }[] {
  const lignes = familles.flatMap((f) => f.blocs.flatMap((b) => b.lignes));
  return ORDRE_GESTES.map((geste) => ({
    geste,
    lignes: lignes.filter((l) => gesteDe(l.obligation.id) === geste),
  })).filter((x) => x.lignes.length > 0);
}
