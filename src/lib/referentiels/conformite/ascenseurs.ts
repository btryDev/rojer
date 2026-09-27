/**
 * Obligations réglementaires — Ascenseurs (P2).
 *
 * Sources primaires :
 *   - Code de la construction et de l'habitation (CCH), articles R. 134-1
 *     à R. 134-13 (décret 2021-872) : R. 134-1 à 5 objectifs et dispositifs
 *     de sécurité, R. 134-6 à 10 entretien, R. 134-11 à 13 contrôle
 *     technique quinquennal.
 *   - Arrêté du 18 novembre 2004 modifié relatif à l'entretien des
 *     installations d'ascenseurs (visite toutes les six semaines, opérations
 *     semestrielles et annuelles en annexe).
 *   - Arrêté du 7 août 2012 relatif aux contrôles techniques (abroge
 *     l'arrêté du 18 novembre 2004 relatif aux contrôles techniques).
 *
 * Audit des sources 2026-08-25 : l'« arrêté du 13 août 2008 » cité
 * auparavant n'existe pas.
 *
 * Le champ d'application vise tout immeuble disposant d'un ascenseur au
 * sens du CCH (installations fixes desservant des niveaux définis,
 * équipées d'une cabine). Le flag `categoriesEquipement: ["ASCENSEUR"]`
 * assure que seule la déclaration explicite d'un ascenseur déclenche
 * ces obligations.
 *
 * Amendement 2026-08-25 — régime `habitation` ajouté aux six obligations.
 * Elles déclaraient `{ travail, erp, igh }` sans `habitation`, en
 * contradiction avec le paragraphe précédent et avec les textes relus ce
 * jour sur Légifrance : L. 134-1 (« applicables aux ascenseurs […] destinés à
 * desservir de manière permanente les bâtiments », sans exclusion par
 * destination du bâtiment), L. 134-3 (« Les ascenseurs font l'objet d'un
 * entretien ») et R. 134-11 (« Le propriétaire d'un ascenseur est tenu de
 * faire réaliser tous les cinq ans un contrôle technique »). Le seul texte
 * qui distingue les établissements employeurs est L. 134-4, dernier alinéa,
 * qui n'ajoute qu'un régime documentaire (registre L. 4711 CT) sans
 * restreindre l'obligation. Un immeuble d'habitation sans salarié, non-ERP,
 * non-IGH, équipé d'un ascenseur, reçoit donc désormais les six lignes.
 *
 * Même relecture : R. 134-6 (version en vigueur au 01/04/2026, décret
 * 2026-166) place l'examen **semestriel** sur le bon état des câbles, la
 * vérification **annuelle** sur les parachutes, et la vérification des
 * moyens d'alerte **toutes les six semaines**. Les libellés et descriptions
 * ci-dessous ont été réalignés sur ce texte.
 *   https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818737/
 */

import type { Obligation } from "./types";

export const obligationsAscenseurs: Obligation[] = [
  {
    id: "ascenseur-visite-six-semaines",
    domaine: "ascenseur",
    libelle: "Visite de l'ascenseur toutes les six semaines",
    description:
      "À intervalle maximum de six semaines, l'entreprise d'entretien vérifie la cabine, les verrouillages et contacts de fermeture des baies palières et de la porte de cabine, le dispositif limitant les possibilités d'actes de vandalisme, l'efficacité du dispositif de réouverture des portes, la précision d'arrêt et de nivelage au palier, les dispositifs de moyens d'alerte et de communication avec le service d'intervention, les commandes et indicateurs aux paliers, ainsi que le niveau et l'absence de fuites de la cuve hydraulique. C'est la visite qui vérifie qu'une porte palière ne peut pas s'ouvrir sur une gaine vide, et qu'une personne bloquée en cabine peut joindre quelqu'un.",
    referencesLegales: [
      {
        source: "CCH",
        reference:
          "CCH, art. R. 134-6 (prestations minimales du contrat d'entretien)",
        article: "CCH R. 134-6",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818737/",
        versionConstatee: "2026-04-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 18 novembre 2004 (entretien), annexe — colonne « intervalle maximum de six semaines »",
        article: "Arrêté 2004-11-18",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000254219",
        note: "Colonne « INTERVALLE maximum de six semaines » du tableau annexé, neuf lignes cochées. Relevé sur capture d'écran le 2026-08-26 : la conversion du tableau en texte perd la position des croix et l'avait rendu illisible à quatre reprises.",
        versionConstatee: "2026-04-01",
      },
    ],
    periodicite: "six_semaines",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true, erp: true, igh: true, habitation: true },
    categoriesEquipement: ["ASCENSEUR"],
    notesInternes:
      "Créée le 2026-08-26. La visite de base de l'ascenseur ne produisait AUCUNE échéance : `ascenseur-entretien-contrat` la mentionnait en prose et vaut `periodicite: \"autre\"`, avec une note qui la disait « à la charge de l'entreprise d'entretien, hors scope du générateur MVP ». C'était un raisonnement en cible, pas une lecture du texte : le propriétaire reste tenu de faire exécuter ces prestations, et le registre doit en porter la trace.\n\nL'énumération ne descendait pas à quarante-deux jours. La valeur `six_semaines` a été ajoutée à l'énumération et à l'enum Postgres pour cela — six semaines n'est pas un mois et demi, le texte compte en semaines et la conversion est exacte.\n\nRéalisateur `personne_qualifiee` : R. 134-6 impose que l'entretien soit exécuté par une entreprise spécialisée, l'exploitant ne peut pas s'en charger lui-même.\n\nFAMILLE D'HABITATION — EXAMINÉE LE 2026-09-01, AUCUNE RESTRICTION POSÉE. L'arrêté du 31 janvier 1986, qui définit les familles, a été dépouillé ce jour (`corpus/arrete-1986-habitation.ts`). Son SEUL article traitant des ascenseurs est le 97, et il ne prescrit que des degrés coupe-feu de parois de cages par famille, plus un dispositif d'appel prioritaire des pompiers en 4ᵉ famille : des règles de construction, dont aucune ne conditionne l'entretien, la visite ni le contrôle technique. Le régime de cette ligne vient du CCH, et L. 134-1, relu le même jour, énumère huit exclusions de champ — installations à câbles, ascenseurs militaires, puits de mine, machinerie de théâtre, moyens de transport, accès au poste de travail d'une machine, ascenseurs de chantier, appareils à 0,15 m/s au plus — dont AUCUNE ne vise les maisons individuelles. Poser `habitation: { familles }` ici serait une restriction inventée : la typologie reste inchangée.",
  },
  {
    id: "ascenseur-entretien-contrat",
    domaine: "ascenseur",
    libelle: "Contrat d'entretien avec prestations minimales (ascenseur)",
    description:
      "Le propriétaire fait exécuter l'entretien de l'ascenseur par une entreprise spécialisée dans le cadre d'un contrat écrit. Le contrat définit les prestations minimales fixées par R. 134-6 : une visite toutes les six semaines, la vérification toutes les six semaines des serrures de portes palières et des moyens d'alerte et de communication avec un service d'intervention, l'examen semestriel du bon état des câbles, la vérification annuelle des parachutes et le nettoyage annuel de la cuvette et du toit de cabine. Deux dispositions de R. 134-6 ne figurent pas parmi les clauses minimales du contrat (R. 134-7, I a) : le remplacement des moyens d'alerte et de communication avec un service d'intervention lorsqu'ils fonctionnent grâce au réseau téléphonique commuté fixe ou à un réseau de téléphonie mobile ouvert au public de troisième génération ou antérieur (2° d) ; et, lorsque des pièces importantes de l'installation, autres que les petites pièces du a du 2°, sont usées, leur réparation ou, si elles ne peuvent pas être réparées, leur remplacement, que le propriétaire fait faire (dernier alinéa). La description, établie contradictoirement, de l'état initial de l'installation ainsi que le plan d'entretien sont annexés au contrat ; lors de sa signature, le propriétaire remet à l'entreprise la description des caractéristiques de l'ensemble de l'installation, les éléments mentionnés aux 1°, 2° et 3° de R. 134-8 et la notice des instructions nécessaires à l'exécution des tâches d'entretien — à défaut, l'entreprise élabore cette notice (R. 134-7, I). En cas de changement de prestataire, un état des lieux initial et contradictoire de l'installation est dressé entre le propriétaire et le nouveau prestataire, et annexé au nouveau contrat (arrêté du 18 novembre 2004, art. 4).",
    referencesLegales: [
      {
        source: "CCH",
        reference: "CCH, art. R. 134-6 et R. 134-7 (ex R. 125-2 et R. 125-2-1)",
        article: "CCH R. 134-6",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818737/",
        versionConstatee: "2026-04-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 18 novembre 2004 relatif à l'entretien des installations d'ascenseurs, art. 2 et annexe",
        article: "Arrêté 2004-11-18",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000254219",
        versionConstatee: "2026-04-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "contrat d'entretien",
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true, erp: true, igh: true, habitation: true },
    categoriesEquipement: ["ASCENSEUR"],
    notesInternes:
      "Obligation permanente contractuelle — pas d'échéance propre dans le calendrier. Les visites concrètes toutes les six semaines sont désormais portées par `ascenseur-visite-six-semaines` (créée le 2026-08-26) : elles étaient jusque-là déclarées « hors scope du générateur MVP », ce qui était une décision de périmètre et non une lecture du texte.\n\nNATURE : ÉTAT PERMANENT, `pieceAttendue: \"contrat d'entretien\"` (ADR-026). R. 134-6 exige un CONTRAT ÉCRIT : l'écrit est l'obligation. Les visites qu'il définit ont leurs propres lignes, récurrentes, et ne se confondent pas avec celle-ci.\n\nFAMILLE D'HABITATION — EXAMINÉE LE 2026-09-01, AUCUNE RESTRICTION POSÉE. L'arrêté du 31 janvier 1986, qui définit les familles, a été dépouillé ce jour (`corpus/arrete-1986-habitation.ts`). Son SEUL article traitant des ascenseurs est le 97, et il ne prescrit que des degrés coupe-feu de parois de cages par famille, plus un dispositif d'appel prioritaire des pompiers en 4ᵉ famille : des règles de construction, dont aucune ne conditionne l'entretien, la visite ni le contrôle technique. Le régime de cette ligne vient du CCH, et L. 134-1, relu le même jour, énumère huit exclusions de champ — installations à câbles, ascenseurs militaires, puits de mine, machinerie de théâtre, moyens de transport, accès au poste de travail d'une machine, ascenseurs de chantier, appareils à 0,15 m/s au plus — dont AUCUNE ne vise les maisons individuelles. Poser `habitation: { familles }` ici serait une restriction inventée : la typologie reste inchangée.",
  },
  {
    id: "ascenseur-examen-semestriel-secours",
    domaine: "ascenseur",
    libelle: "Examen semestriel du bon état des câbles (ascenseur)",
    description:
      "Au moins une fois tous les six mois, l'entreprise d'entretien examine le bon état des câbles ou chaînes de suspension et de leurs extrémités, du frein, et du dispositif antidérive. Ce sont les trois seules lignes que l'annexe de l'arrêté du 18 novembre 2004 range en fréquence minimale semestrielle. Les moyens d'alerte et de communication avec le service d'intervention sont, eux, vérifiés à chaque visite, soit toutes les six semaines.",
    referencesLegales: [
      {
        source: "CCH",
        reference: "CCH, art. R. 134-6 (examen semestriel du bon état des câbles)",
        article: "CCH R. 134-6",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818737/",
        versionConstatee: "2026-04-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 18 novembre 2004 (entretien), annexe — opérations semestrielles",
        article: "Arrêté 2004-11-18",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000254219",
        versionConstatee: "2026-04-01",
      },
    ],
    periodicite: "semestrielle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true, erp: true, igh: true, habitation: true },
    categoriesEquipement: ["ASCENSEUR"],
    notesInternes:
      "Amendement 2026-08-25 : l'obligation s'intitulait « examen semestriel du dispositif de secours », périodicité qu'aucun texte relu ne fonde — R. 134-6 vérifie les moyens d'alerte toutes les six semaines et réserve le semestriel au bon état des câbles. L'identifiant est conservé (jamais réutilisé, et les Verification existantes y sont rattachées) ; libellé, description et référence fondatrice ont été réalignés sur R. 134-6.\n\nAmendement 2026-08-26, tableau de l'annexe lu à la source. La colonne « fréquence minimale semestrielle » ne comporte que TROIS lignes : câbles ou chaînes de suspension et leurs extrémités, frein, dispositif antidérive. Le frein et l'antidérive manquaient — le frein est ce qui retient la cabine, l'antidérive ce qui l'empêche de descendre seule en hydraulique. Ajoutés.\n\nFAMILLE D'HABITATION — EXAMINÉE LE 2026-09-01, AUCUNE RESTRICTION POSÉE. L'arrêté du 31 janvier 1986, qui définit les familles, a été dépouillé ce jour (`corpus/arrete-1986-habitation.ts`). Son SEUL article traitant des ascenseurs est le 97, et il ne prescrit que des degrés coupe-feu de parois de cages par famille, plus un dispositif d'appel prioritaire des pompiers en 4ᵉ famille : des règles de construction, dont aucune ne conditionne l'entretien, la visite ni le contrôle technique. Le régime de cette ligne vient du CCH, et L. 134-1, relu le même jour, énumère huit exclusions de champ — installations à câbles, ascenseurs militaires, puits de mine, machinerie de théâtre, moyens de transport, accès au poste de travail d'une machine, ascenseurs de chantier, appareils à 0,15 m/s au plus — dont AUCUNE ne vise les maisons individuelles. Poser `habitation: { familles }` ici serait une restriction inventée : la typologie reste inchangée.",
  },
  {
    id: "ascenseur-examen-annuel-securite",
    domaine: "ascenseur",
    libelle: "Examen annuel des dispositifs de sécurité (ascenseur)",
    description:
      "Au moins une fois par an, l'entreprise d'entretien vérifie le parachute et tout autre dispositif antichute — y compris le moyen de protection contre les mouvements incontrôlés de la cabine en montée, la soupape de rupture ou le réducteur de débit des ascenseurs hydrauliques —, les limiteurs de vitesse de cabine et de contrepoids et leur poulie de tension, la poulie de traction, les dispositifs hors course de sécurité, la pompe à main ou soupape de descente à commande manuelle, ainsi que la propreté et l'éclairage de la cuvette, du toit de cabine et du local des machines. Les câbles de suspension et les serrures de portes palières ne relèvent pas de cette échéance : les premiers sont semestriels, les secondes sont vérifiées toutes les six semaines.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 18 novembre 2004 (entretien), annexe — opérations annuelles",
        article: "Arrêté 2004-11-18",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000000254219",
        versionConstatee: "2026-04-01",
      },
      {
        source: "CCH",
        reference: "CCH, art. R. 134-6 (vérification annuelle des parachutes)",
        article: "CCH R. 134-6",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818737/",
        versionConstatee: "2026-04-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true, erp: true, igh: true, habitation: true },
    categoriesEquipement: ["ASCENSEUR"],
    notesInternes:
      "CORRIGÉ LE 2026-08-26, tableau de l'annexe lu à la source. La description rangeait « les câbles ou chaînes de suspension et leurs extrémités » dans l'ANNUEL. Le tableau les coche en SEMESTRIEL — et `ascenseur-examen-semestriel-secours` les portait déjà correctement. Le référentiel se contredisait donc lui-même sur la même ligne du même tableau, et la lecture la plus lâche des deux aurait pu l'emporter.\n\nQuatre lignes de la colonne annuelle manquaient par ailleurs : propreté et éclairage de la cuvette, du toit de cabine et du local des machines ; poulie de traction ; dispositifs hors course de sécurité ; pompe à main ou soupape de descente à commande manuelle. La colonne en compte six au total, toutes désormais nommées.\n\nVersion constatée : celle du 1er avril 2026, issue de l'arrêté du 4 mars 2026.\n\nFAMILLE D'HABITATION — EXAMINÉE LE 2026-09-01, AUCUNE RESTRICTION POSÉE. L'arrêté du 31 janvier 1986, qui définit les familles, a été dépouillé ce jour (`corpus/arrete-1986-habitation.ts`). Son SEUL article traitant des ascenseurs est le 97, et il ne prescrit que des degrés coupe-feu de parois de cages par famille, plus un dispositif d'appel prioritaire des pompiers en 4ᵉ famille : des règles de construction, dont aucune ne conditionne l'entretien, la visite ni le contrôle technique. Le régime de cette ligne vient du CCH, et L. 134-1, relu le même jour, énumère huit exclusions de champ — installations à câbles, ascenseurs militaires, puits de mine, machinerie de théâtre, moyens de transport, accès au poste de travail d'une machine, ascenseurs de chantier, appareils à 0,15 m/s au plus — dont AUCUNE ne vise les maisons individuelles. Poser `habitation: { familles }` ici serait une restriction inventée : la typologie reste inchangée.",

  },
  {
    id: "ascenseur-controle-technique-quinquennal",
    domaine: "ascenseur",
    libelle: "Contrôle technique quinquennal (ascenseur)",
    description:
      "Tous les cinq ans, le propriétaire fait réaliser un contrôle technique de l'ascenseur (R. 134-11) par un contrôleur technique agréé, un organisme habilité ou une personne certifiée (R. 134-12). Le rapport, remis au propriétaire dans le mois suivant la fin de l'intervention, est transmis par lui à l'entreprise d'entretien (R. 134-13) ; toute personne disposant d'un titre d'occupation dans l'immeuble peut en obtenir communication (L. 134-4). Pour le contrôle, le propriétaire met à la disposition du contrôleur technique les informations et documents en sa possession, nécessaires à la bonne exécution des contrôles, que liste l'arrêté du 7 août 2012 (art. 1er) — selon la date et le mode d'installation de l'ascenseur, la notice d'instructions et la déclaration CE de conformité, ou le dossier technique  ; et, pour tous (3°), la dernière étude spécifique de sécurité, le rapport de vérification établi le cas échéant après une transformation ou une modification importante, le carnet d'entretien et le dernier rapport annuel d'activité, le rapport du précédent contrôle technique, la typologie et la nature des moyens d'alerte et de communication avec le service d'intervention.",
    referencesLegales: [
      {
        source: "CCH",
        reference: "CCH, art. R. 134-11 à R. 134-13 (ex R. 125-2-4 et s.)",
        article: "CCH R. 134-11",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818747/",
        versionConstatee: "2026-05-15",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 7 août 2012 relatif aux contrôles techniques à réaliser dans les installations d'ascenseurs",
        article: "Arrêté 2012-08-07",
        url:
          "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000026286347",
        versionConstatee: "2026-05-15",
      },
      {
        // AJOUTÉE LE 2026-09-04 : le règlement de sécurité ERP impose le MÊME
        // contrôle quinquennal, et le référentiel ne le citait pas. C'est un
        // ajout de CONTEXTE, pas un second fondement — créer une ligne pour
        // AS 9 aurait donné deux rendez-vous quinquennaux pour un seul acte,
        // et le test anti-doublon ne l'aurait pas vu, les articles fondateurs
        // étant différents.
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. AS 9 (ERP des 4 premières catégories : vérification par un organisme agréé tous les cinq ans)",
        article: "AS 9",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020382882",
        note: "« Les ascenseurs doivent faire l'objet d'une vérification, fonctionnement compris, par un organisme agréé, dans les conditions prévues à la section II du chapitre Ier du présent titre tous les cinq ans et avant leur remise en service faisant suite à une transformation importante. » Article ouvert à la source le 2026-09-04. DEUX ÉCARTS AVEC LE RÉGIME DU CCH ENCODÉ ICI, tous deux relevés et non corrigés : (1) AS 9 exige un ORGANISME AGRÉÉ au sens de GE 6, là où R. 134-12 admet aussi une personne certifiée — dans un ERP des quatre premières catégories, le règlement est plus étroit que le CCH ; (2) la vérification avant remise en service après TRANSFORMATION IMPORTANTE n'est portée par aucune obligation, sa nature étant événementielle et cette nature n'ayant aucune surface. Le détail est dans la réserve d'AS 9 au corpus `arrete-1980-livre-2`.",
        versionConstatee: "2008-10-08",
      },
    ],
    periodicite: "quinquennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["bureau_controle", "personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true, erp: true, igh: true, habitation: true },
    categoriesEquipement: ["ASCENSEUR"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait un « arrêté du 13 août 2008 » introuvable. Le texte en vigueur est l'arrêté du 7 août 2012, qui abroge l'arrêté du 18 novembre 2004 relatif aux contrôles techniques.\n\nAmendement 2026-08-25 : R. 134-12 (https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818749/) énumère les contrôleurs admis — contrôleur technique agréé au sens de L. 125-1, organisme habilité d'un État de l'UE/EEE, personne morale à salariés certifiés, personne physique certifiée. Aucune notion d'« organisme accrédité » : `organisme_accredite` est remplacé par `bureau_controle` (contrôleur technique agréé), `personne_qualifiee` couvrant les personnes certifiées.\n\nFAMILLE D'HABITATION — EXAMINÉE LE 2026-09-01, AUCUNE RESTRICTION POSÉE. L'arrêté du 31 janvier 1986, qui définit les familles, a été dépouillé ce jour (`corpus/arrete-1986-habitation.ts`). Son SEUL article traitant des ascenseurs est le 97, et il ne prescrit que des degrés coupe-feu de parois de cages par famille, plus un dispositif d'appel prioritaire des pompiers en 4ᵉ famille : des règles de construction, dont aucune ne conditionne l'entretien, la visite ni le contrôle technique. Le régime de cette ligne vient du CCH, et L. 134-1, relu le même jour, énumère huit exclusions de champ — installations à câbles, ascenseurs militaires, puits de mine, machinerie de théâtre, moyens de transport, accès au poste de travail d'une machine, ascenseurs de chantier, appareils à 0,15 m/s au plus — dont AUCUNE ne vise les maisons individuelles. Poser `habitation: { familles }` ici serait une restriction inventée : la typologie reste inchangée.",
  },
  {
    id: "ascenseur-carnet-entretien",
    domaine: "ascenseur",
    libelle: "Tenue du carnet d'entretien de l'ascenseur",
    description:
      "Un carnet d'entretien est tenu à jour — par l'entreprise dans le régime du contrat d'entretien (R. 134-7 III), par le propriétaire lui-même s'il assure l'entretien par ses propres moyens (R. 134-10). L'entreprise remet en outre au propriétaire un rapport annuel d'activité où figurent les interventions d'entretien, les incidents, les visites et contrôles réalisés. Le carnet est conservé pendant toute la durée de vie de l'ascenseur.",
    referencesLegales: [
      {
        source: "CCH",
        reference: "CCH, art. R. 134-7 III (carnet d'entretien — régime du contrat)",
        article: "CCH R. 134-7",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053629120",
        note: "« Les visites, opérations et interventions effectuées en exécution du contrat d'entretien font l'objet de comptes rendus dans un carnet d'entretien tenu à jour, établi sous forme d'un registre physique ou électronique suivant le choix du propriétaire. En outre, l'entreprise remet au propriétaire un rapport annuel d'activité auquel est annexé le contenu du carnet d'entretien lorsque celui-ci est établi sous forme électronique. » Version réécrite par le décret n° 2026-166 du 4 mars 2026, en vigueur au 1er avril 2026. C'est le CAS ORDINAIRE : l'entretien confié à une entreprise.",
        versionConstatee: "2026-04-01",
      },
      {
        source: "CCH",
        reference:
          "CCH, art. R. 134-10 (carnet d'entretien — propriétaire assurant l'entretien par ses propres moyens)",
        article: "CCH R. 134-10",
        url:
          "https://www.legifrance.gouv.fr/codes/id/LEGISCTA000043818735/",
        note: "Cité pour le cas PARTICULIER, et pour lui seul : « Lorsque le propriétaire ne recourt pas à un prestataire de services mais décide d'assurer par ses propres moyens l'entretien de l'ascenseur […] Il tient à jour le carnet d'entretien et établit un rapport annuel d'activité dans les conditions fixées au III de l'article R. 134-7. »",
        versionConstatee: "2021-07-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "carnet d'entretien",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true, erp: true, igh: true, habitation: true },
    categoriesEquipement: ["ASCENSEUR"],
    notesInternes:
      "NATURE : ÉTAT PERMANENT, `pieceAttendue: \"carnet d'entretien\"` (ADR-026). R. 134-7 III et R. 134-10 imposent la tenue du carnet lui-même, conservé toute la vie de l'appareil.\n\nFONDEMENT RECALÉ LE 2026-09-01 (lot A). La `reference` citait bien « R. 134-7 et R. 134-10 », mais la clé `article` — la seule que le corpus et la veille savent lire — pointait R. 134-10, qui ne régit QUE le propriétaire assurant l'entretien par ses propres moyens. Le cas ordinaire, l'entretien confié à une entreprise, est à R. 134-7 III, et il n'était rattaché à aucun texte lu. Les deux sont désormais cités séparément, chacun pour son régime, et R. 134-7 est entré au corpus.\n\nCE QUI ÉTAIT NON PORTÉ L'EST DEPUIS LE 2026-09-01 (lot C) : le RAPPORT ANNUEL D'ACTIVITÉ a sa ligne, `ascenseur-rapport-annuel-activite`. La note disait « il est annuel, il a un réalisateur, il n'a pas de ligne » ; les trois restent vrais, le dernier ne l'est plus. Cette obligation-ci garde le seul carnet.\n\nFAMILLE D'HABITATION — EXAMINÉE LE 2026-09-01, AUCUNE RESTRICTION POSÉE. L'arrêté du 31 janvier 1986, qui définit les familles, a été dépouillé ce jour (`corpus/arrete-1986-habitation.ts`). Son SEUL article traitant des ascenseurs est le 97, et il ne prescrit que des degrés coupe-feu de parois de cages par famille, plus un dispositif d'appel prioritaire des pompiers en 4ᵉ famille : des règles de construction, dont aucune ne conditionne l'entretien, la visite ni le contrôle technique. Le régime de cette ligne vient du CCH, et L. 134-1, relu le même jour, énumère huit exclusions de champ dont AUCUNE ne vise les maisons individuelles. Poser `habitation: { familles }` ici serait une restriction inventée : la typologie reste inchangée.",
  },
  {
    id: "ascenseur-rapport-annuel-activite",
    domaine: "ascenseur",
    libelle: "Rapport annuel d'activité de l'entreprise d'entretien (ascenseur)",
    description:
      "Chaque année, l'entreprise titulaire du contrat d'entretien remet au propriétaire un rapport d'activité. Lorsque le carnet d'entretien est tenu sous forme électronique, son contenu est annexé à ce rapport. Le propriétaire qui assure l'entretien par ses propres moyens établit lui-même ce rapport, dans les mêmes conditions.",
    referencesLegales: [
      {
        source: "CCH",
        reference:
          "CCH, art. R. 134-7 III (rapport annuel d'activité — régime du contrat d'entretien)",
        article: "CCH R. 134-7",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000053629120",
        note: "« En outre, l'entreprise remet au propriétaire un rapport annuel d'activité auquel est annexé le contenu du carnet d'entretien lorsque celui-ci est établi sous forme électronique. » Article rouvert à la source le 2026-09-01 avant l'encodage — version réécrite par le décret n° 2026-166 du 4 mars 2026, en vigueur au 1er avril 2026. Le mot « annuel » est dans le texte : c'est un rythme, pas un plafond, et aucun tiers n'est autorisé à le déplacer.",
        versionConstatee: "2026-04-01",
      },
      {
        source: "CCH",
        reference:
          "CCH, art. R. 134-10 (rapport annuel d'activité — propriétaire assurant l'entretien par ses propres moyens)",
        article: "CCH R. 134-10",
        url:
          "https://www.legifrance.gouv.fr/codes/id/LEGISCTA000043818735/",
        note: "Cité pour le second régime, et pour lui seul : « Il tient à jour le carnet d'entretien et établit un rapport annuel d'activité dans les conditions fixées au III de l'article R. 134-7. » L'acte est le même, l'auteur change.",
        versionConstatee: "2021-07-01",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: "rapport annuel d'activité",
    // `personne_qualifiee` — c'est la valeur que porte déjà tout ce que
    // l'entreprise d'entretien fait sur cet appareil (`ascenseur-visite-six-
    // semaines`, `-examen-semestriel-secours`, `-examen-annuel-securite`).
    // `exploitant` couvrirait le seul cas de la régie et dirait au propriétaire
    // ordinaire qu'il rédige lui-même un rapport que son prestataire lui doit.
    realisateurs: ["personne_qualifiee"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true, erp: true, igh: true, habitation: true },
    categoriesEquipement: ["ASCENSEUR"],
    notesInternes:
      "AJOUTÉE LE 2026-09-01 (lot C). Le rapport était NOMMÉ dans la description de `ascenseur-carnet-entretien` et par les deux entrées de corpus R. 134-7 et R. 134-10, sans qu'aucune échéance ne le date. `ascenseur-carnet-entretien` porte un ÉTAT PERMANENT — le carnet est tenu ou il ne l'est pas —, et un état permanent ne peut pas dater un acte annuel : c'est exactement la distinction que l'ADR-026 a introduite le 2026-08-31. Les deux lignes se lisent ensemble et ne se recouvrent pas ; elles ne partagent pas de périodicité, ce qui est ce que le test anti-doublon compare.\n\nDEUX RÉGIMES, UNE LIGNE, ET C'EST VOULU. R. 134-7 III fait remettre le rapport par l'entreprise sous contrat ; R. 134-10 le fait établir par le propriétaire qui entretient en régie. L'acte, sa périodicité et sa pièce sont identiques — seul l'auteur change, et le produit ne détient pas le fait « entretien en régie » (aucune caractéristique d'équipement ne le porte). Scinder en deux lignes supposerait de deviner lequel des deux régimes s'applique : c'est précisément ce que l'ADR-023 interdit. Une ligne unique, dont la description nomme les deux cas, ne fait perdre au dirigeant que le nom de celui qui signe.\n\nCE QUE LE PRODUIT NE SAIT TOUJOURS PAS, et qui n'est pas résolu ici : `Etablissement` n'a pas de champ « ascenseur entretenu en régie ». Il commande aussi la formation du personnel d'entretien (Code du travail R. 4543-22 à R. 4543-24, ex-article 9 du décret n° 95-826 abrogé) — voir la réserve portée sur `CCH R. 134-10` au corpus.\n\nCRITICITÉ 3 : c'est une pièce à recevoir et à conserver, pas une vérification de sécurité. Son absence se constate à un contrôle, elle ne met personne en danger par elle-même.\n\nELLE FAIT MONTER `PERIODICITE_SANS_TEXTE_PORTEUR` DE DIX À ONZE, et c'est dit ici pour que personne ne le prenne pour un défaut. Le constat de `pnpm relecture` est mécanique — « périodicité récurrente, aucun arrêté ni décret cité » — et il ne sait pas qu'un code porte parfois le chiffre lui-même. C'est le cas de trois des onze : `incendie-travail-exercice-semestriel` (« au moins tous les six mois »), `elec-salarie-attestation-medicale-voisinage` (« d'une validité de cinq ans ») et celle-ci (« un rapport ANNUEL d'activité »). Les trois sont inscrites à `PERIODICITE_SUR_CODE_JUSTIFIEE` avec leur verbatim, qui est la garde prévue pour cette classe. Le cadrage du 2026-09-01 attend que ce compte baisse ; il monte d'un, sur un cas qui a sa justification écrite, et le reste du lot n'en ajoute aucun.",
  },
  {
    id: "ascenseur-telealarme-liaison",
    domaine: "ascenseur",
    libelle: "Liaison permanente avec un service d'intervention (téléalarme ascenseur)",
    description:
      "L'ascenseur doit être équipé d'un dispositif permettant à une personne enfermée dans la cabine de donner l'alerte et de recevoir une réponse d'un service d'intervention disponible en permanence (24 h/24, 7 j/7).",
    referencesLegales: [
      {
        source: "CCH",
        reference:
          "CCH, art. R. 134-2, 6° (objectif de sécurité : moyens d'alerte et de communication avec un service d'intervention)",
        article: "CCH R. 134-2",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043818727",
        note: "« La sécurité d'un ascenseur consiste à assurer : […] 6° La mise à la disposition des utilisateurs de moyens d'alerte et de communication avec un service d'intervention […] » Verbatim lu sur Légifrance le 2026-09-01.",
        versionConstatee: "2021-07-01",
      },
      {
        source: "CCH",
        reference:
          "CCH, art. R. 134-1 (champ d'application de la section : ce qu'est un ascenseur)",
        article: "CCH R. 134-1",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006074096/LEGISCTA000043818721/",
        note: "Article de champ, cité pour lui seul : il définit l'ascenseur au sens de la section et en écarte les appareils dont la vitesse n'excède pas 0,15 m/s. Il ne dit rien des moyens d'alerte.",
        versionConstatee: "2021-07-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true, erp: true, igh: true, habitation: true },
    categoriesEquipement: ["ASCENSEUR"],
    notesInternes:
      "Obligation permanente de moyens (contrat d'astreinte), non planifiée dans le calendrier.\n\nFONDEMENT RECALÉ LE 2026-09-01 (lot A). La clé `article` pointait R. 134-1, qui est un article de CHAMP : il dit ce qu'est un ascenseur au sens de la section et n'écrit rien des moyens d'alerte. L'objectif de sécurité est au 6° de R. 134-2, entré au corpus à cette occasion. La `reference` annonçait « R. 134-1 à R. 134-5 » — un intervalle qui contenait bien le bon article sans le désigner, et c'est le terme cité qui décidait de l'ancre.\n\nAmendement 2026-08-25 : R. 134-6 (version au 01/04/2026, décret 2026-166) impose la vérification des moyens d'alerte et de communication à chaque visite (six semaines) et un volet sur l'obsolescence des réseaux RTC/3G ; R. 134-11 a) vise la compatibilité de ces moyens avec les autres réseaux. Non modélisé comme échéance propre : couvert par le contrat d'entretien.\n\nNATURE : ÉTAT PERMANENT (ADR-026). Un dispositif d'alerte disponible 24 h/24 : l'état est l'obligation, il n'y a aucun acte à refaire à date. `pieceAttendue` est nulle — le texte exige un dispositif, pas un écrit.\n\nFAMILLE D'HABITATION — EXAMINÉE LE 2026-09-01, AUCUNE RESTRICTION POSÉE. L'arrêté du 31 janvier 1986, qui définit les familles, a été dépouillé ce jour (`corpus/arrete-1986-habitation.ts`). Son SEUL article traitant des ascenseurs est le 97, et il ne prescrit que des degrés coupe-feu de parois de cages par famille, plus un dispositif d'appel prioritaire des pompiers en 4ᵉ famille : des règles de construction, dont aucune ne conditionne l'entretien, la visite ni le contrôle technique. Le régime de cette ligne vient du CCH, et L. 134-1, relu le même jour, énumère huit exclusions de champ — installations à câbles, ascenseurs militaires, puits de mine, machinerie de théâtre, moyens de transport, accès au poste de travail d'une machine, ascenseurs de chantier, appareils à 0,15 m/s au plus — dont AUCUNE ne vise les maisons individuelles. Poser `habitation: { familles }` ici serait une restriction inventée : la typologie reste inchangée.",
  },
];
