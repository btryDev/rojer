/**
 * La question posée par la fiche de chaque ligne de « Ce qui doit être en
 * place » (2026-10-20, recherche UI de la page).
 *
 * Une reformulation du LIBELLÉ de l'obligation en question fermée, dans les
 * mots du dirigeant — jamais une obligation de plus ni de moins : le libellé
 * officiel reste affiché sous la question, avec le texte qui le fonde. Écrites
 * à la main, une par une (règle 7 : pas de LLM sur un contenu à valeur légale).
 *
 * `questions.test.ts` tient la table complète : une ligne de l'écran sans
 * question le fait échouer. À défaut, la fiche affiche le libellé.
 */

export const QUESTION_PAR_OBLIGATION: Readonly<Record<string, string>> = {
  // Incendie et secours — prévenir
  "cuisson-erp-consignes-arret-urgence":
    "Une consigne est-elle affichée près de l'arrêt d'urgence des appareils de cuisson ?",
  "incendie-erp-interdiction-fumer-affichee":
    "L'interdiction de fumer est-elle affichée dans l'établissement ?",
  // alerter
  "incendie-erp-5-consignes-affichees":
    "Les consignes incendie sont-elles affichées bien en vue, avec le numéro des pompiers et l'adresse du centre de secours ?",
  "incendie-erp-modalites-appel-pompiers-affichees":
    "La façon d'appeler les pompiers est-elle affichée près du moyen d'alerte ?",
  "incendie-travail-alarme-sonore":
    "Avez-vous une alarme sonore qui prévient tout le monde en cas d'incendie ?",
  "incendie-travail-consigne-affichee":
    "Une consigne incendie est-elle établie et affichée, avec qui appeler et quoi faire ?",
  // éteindre
  "incendie-erp-5-instruction-personnel":
    "Votre personnel sait-il quoi faire en cas d'incendie, et s'est-il entraîné à se servir des extincteurs ?",
  "incendie-erp-personnel-designe-moyens-secours":
    "Avez-vous désigné des membres du personnel pour mettre en œuvre les moyens de secours ?",
  "incendie-travail-extincteurs-dotation":
    "Avez-vous assez d'extincteurs pour vos locaux ?",
  "signalisation-erp-5-extincteurs-identification":
    "L'emplacement de chaque extincteur est-il signalé quand l'appareil n'est pas visible ?",
  "signalisation-erp-extincteurs-identification":
    "Vos moyens d'extinction sont-ils identifiés et signalés ?",
  "signalisation-incendie-moyens-lutte":
    "Vos équipements de lutte contre l'incendie sont-ils de couleur rouge et signalés par un panneau ?",
  // évacuer
  "habitation-consignes-plans-intervention":
    "Les consignes incendie et les plans d'intervention sont-ils affichés dans l'immeuble ?",
  "incendie-erp-5-sommeil-consigne-chambres":
    "Une consigne incendie est-elle affichée dans chaque chambre ?",
  "incendie-erp-5-sommeil-plans-affiches":
    "Les plans de l'établissement, d'orientation et de repérage sont-ils affichés ?",
  "incendie-erp-hotel-consigne-chambres":
    "La consigne incendie réglementaire est-elle affichée dans chaque chambre ou appartement ?",
  "incendie-erp-hotel-plans-evacuation-niveaux":
    "Un plan d'évacuation est-il affiché à chaque étage, près du passage habituel ?",
  "incendie-erp-plan-intervention-entrees":
    "Un plan d'intervention pour les pompiers est-il affiché à chaque entrée du bâtiment ?",
  "incendie-travail-instructions-evacuation":
    "Avez-vous établi les instructions d'évacuation : par où sortir, et où se retrouver ?",
  "signalisation-etablissement-cheminements-evacuation":
    "Le chemin vers la sortie la plus proche est-il balisé ?",
  // secourir
  "dae-erp-detention":
    "Avez-vous un défibrillateur visible, signalé et accessible en permanence ?",
  "secours-etablissement-materiel":
    "Avez-vous du matériel de premiers secours sur les lieux de travail ?",
  "secours-etablissement-mesures":
    "Avez-vous écrit comment les premiers secours sont organisés ?",
  "secours-etablissement-signalement-chaleur-intense":
    "Vos salariés savent-ils comment signaler un malaise lié à la chaleur, et comment les secours sont organisés ?",
  "sport-etablissement-secours-r322-4":
    "Avez-vous une trousse de secours, un moyen d'alerter les secours et le tableau d'organisation des secours affiché ?",
  // Installations et registres
  "aeration-erp-filtres-livret-entretien":
    "Tenez-vous le livret d'entretien de l'installation de filtration de l'air ?",
  "ascenseur-carnet-entretien":
    "Tenez-vous le carnet d'entretien de l'ascenseur ?",
  "ascenseur-entretien-contrat":
    "Avez-vous un contrat d'entretien pour l'ascenseur ?",
  "ascenseur-telealarme-liaison":
    "L'ascenseur est-il relié en permanence à un service d'intervention ?",
  "elec-travail-consignation-registre":
    "Les rapports de vérification électrique sont-ils consignés au registre ?",
  "habitation-registre-securite":
    "Tenez-vous le registre de sécurité de l'immeuble ?",
  "incendie-erp-eclairage-securite-notice-registre":
    "La notice de maintenance de l'éclairage de sécurité est-elle jointe au registre de sécurité ?",
  "incendie-erp-ssi-contrat-entretien":
    "Avez-vous un contrat d'entretien pour le système de sécurité incendie, joint au registre de sécurité ?",
  "incendie-registre-securite":
    "Tenez-vous un registre de sécurité ?",
  "levage-registre-securite-consignation":
    "Les vérifications des appareils de levage sont-elles consignées au registre de sécurité ?",
  "porte-auto-dossier-maintenance":
    "Tenez-vous le dossier de maintenance de la porte automatique ?",
  "porte-auto-erp-contrat-entretien":
    "Avez-vous un contrat d'entretien pour les portes automatiques ?",
  "porte-auto-maintien-en-etat":
    "La porte automatique est-elle maintenue en état et réparée sans attendre ?",
  "sport-etablissement-buts-plan-verification":
    "Avez-vous un plan de vérification des buts et paniers, et un registre de leurs contrôles ?",
  // Qui s'occupe de quoi
  "elec-erp-presence-personne-qualifiee":
    "Une personne qualifiée est-elle présente pendant l'ouverture au public ?",
  "elec-erp-presence-personne-qualifiee-scene-n3":
    "Une personne qualifiée est-elle présente pendant l'ouverture au public de la salle ?",
  "elec-travail-habilitation-personnel":
    "Les salariés qui travaillent sur ou près d'installations électriques sont-ils habilités ?",
  "incendie-erp-5-sommeil-avis-controle-affiche":
    "L'avis sur le contrôle de la sécurité est-il affiché près de l'entrée principale ?",
  "incendie-erp-avis-controle-affiche":
    "L'avis sur le contrôle de la sécurité est-il affiché près de l'entrée principale ?",
  "incendie-erp-exploitant-present-public":
    "Vous-même ou votre représentant êtes-vous présent tant que le public est là ?",
  "incendie-erp-personnel-qualifie-detection":
    "Du personnel qualifié est-il présent pendant l'ouverture au public ?",
  "incendie-erp-schema-organisation-securite":
    "Le schéma d'organisation de la sécurité est-il joint au registre de sécurité ?",
  "prevention-etablissement-cse":
    "Avez-vous mis en place le comité social et économique (CSE) ?",
  "prevention-etablissement-salarie-designe":
    "Avez-vous désigné quelqu'un pour s'occuper de la prévention des risques ?",
  "sante-travail-etablissement-adhesion-spst":
    "Êtes-vous adhérent d'un service de prévention et de santé au travail ?",
  // Le quotidien de vos salariés — conditions de travail
  "locaux-etablissement-eau-potable":
    "Vos salariés ont-ils accès à de l'eau potable et fraîche ?",
  "locaux-etablissement-emplacement-restauration":
    "Vos salariés ont-ils un endroit pour prendre leur repas ?",
  "locaux-etablissement-installations-sanitaires":
    "Vos salariés ont-ils des vestiaires, des lavabos et des toilettes ?",
  "locaux-etablissement-local-restauration":
    "Avez-vous un local de restauration pour vos salariés ?",
  "prevention-etablissement-evaluation-chaleur-intense":
    "Avez-vous évalué le risque lié aux fortes chaleurs, et prévu des mesures ?",
  "signalisation-etablissement-risques-residuels":
    "Les risques qui subsistent malgré vos mesures sont-ils signalés par des panneaux ?",
  "signalisation-stockage-substances-dangereuses":
    "Les zones de stockage de produits dangereux sont-elles signalées ?",
  // informer et former
  "elec-travail-carnet-prescriptions":
    "Avez-vous remis à chaque salarié habilité son carnet de prescriptions électriques ?",
  "epi-etablissement-consigne-utilisation":
    "Avez-vous une consigne d'utilisation des équipements de protection individuelle ?",
  "formation-securite-etablissement-manutention":
    "Vos salariés sont-ils formés aux gestes et postures de manutention ?",
  "information-etablissement-affichages-obligatoires":
    "Les coordonnées de la médecine du travail, des secours et de l'inspection du travail sont-elles affichées ?",
  "information-etablissement-avis-acces-duerp":
    "Un avis dit-il à vos salariés comment consulter le document unique (DUERP) ?",
  "prevention-etablissement-reglement-interieur":
    "Votre règlement intérieur comprend-il un volet santé et sécurité ?",
  "signalisation-interdiction-fumer-csp":
    "L'interdiction de fumer est-elle signalée dans vos locaux fermés et couverts ?",
  "stockage-dangereux-fiches-donnees":
    "Les fiches de données de sécurité sont-elles à jour et accessibles ?",
};

/** La question d'une ligne, ou son libellé quand aucune n'est écrite. */
export function questionDe(obligationId: string, libelle: string): string {
  return QUESTION_PAR_OBLIGATION[obligationId] ?? libelle;
}
