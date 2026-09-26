/**
 * Ce que la page « Connecter » dit de chaque outil du serveur MCP, côté
 * produit. La liste des outils n'est PAS tenue ici : elle se lit dans
 * `OUTILS_MCP`, ce que le serveur enregistre réellement. La page disait
 * « Cinq outils » au-dessus d'une liste recopiée à la main qui n'en avait
 * que trois ; le test voisin exige une description pour chaque outil servi,
 * et aucune pour un outil qui ne l'est pas.
 */
export const DETAIL_OUTIL_PRODUIT: Readonly<Record<string, string>> = {
  fiche_etablissement:
    "Raison sociale, adresse, régimes réglementaires, effectifs, et le volume du dossier (équipements, vérifications, actions).",
  etat_duerp:
    "Ancienneté de la dernière version validée, échéance de mise à jour annuelle, unités de travail et risques cotés.",
  plan_actions:
    "Actions correctives avec leur statut, criticité, échéance et retard éventuel — filtrables.",
  equipements:
    "Équipements déclarés avec leur catégorie, leur localisation, leur date de mise en service et le nombre de vérifications en retard ou à planifier pour chacun.",
  verifications:
    "Vérifications du calendrier, par équipement, avec leur périodicité, leur échéance et leur état (en retard, à planifier, à venir, réalisée).",
};
