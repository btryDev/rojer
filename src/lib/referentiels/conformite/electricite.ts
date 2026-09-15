/**
 * Obligations réglementaires — Électricité (P1).
 *
 * Sources primaires :
 *   - Code du travail, Section 5 « Utilisation des installations électriques »,
 *     articles R. 4226-1 à R. 4226-21 (vérifications), R. 4544-1 à R. 4544-11
 *     (habilitation électrique du personnel).
 *   - Arrêté du 26 décembre 2011 relatif aux vérifications ou processus de
 *     vérification des installations électriques en milieu de travail.
 *   - Arrêté du 25 juin 1980 modifié (règlement de sécurité ERP) — section EL
 *     (articles EL 3 à EL 20).
 *   - Arrêté du 22 juin 1990 modifié (règles PE pour ERP 5ᵉ catégorie).
 *   - Arrêté du 30 décembre 2011 (règlement IGH) — article GH 50.
 *
 * Aucune norme privée (APSAD, NF C 15-100) n'est citée comme obligation : ces
 * normes définissent des règles de l'art, mais l'opposabilité vient du texte
 * réglementaire qui les vise.
 */

import type { Obligation } from "./types";

export const obligationsElectricite: Obligation[] = [
  // ---------------------------------------------------------------------------
  // Travail (Code du travail)
  // ---------------------------------------------------------------------------
  {
    id: "elec-travail-mise-en-service",
    domaine: "electricite",
    libelle: "Vérification initiale des installations électriques à la mise en service ou après modification",
    description:
      "À la mise en service et après toute modification de structure, l'employeur fait procéder à une vérification des installations électriques. Le rapport doit être transmis à l'inspection du travail sur demande.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4226-14",
        article: "R. 4226-14",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765072/",
        versionConstatee: "2011-07-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 26 décembre 2011 (vérifications des installations électriques), art. 2 et 6",
        article: "Arrêté 2011-12-26 art. 2",
        url:
          "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000025046978",
        versionConstatee: "2011-12-30",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "evenementielle",
    pieceAttendue: null,
    realisateurs: ["organisme_accredite"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes: "NATURE : ÉVÉNEMENTIELLE (ADR-026). R. 4226-14 porte deux titres : la mise en service, que le produit date, et « toute modification de structure », qu'il n'observe pas. La règle de résolution retient le second. Conséquence à ne pas manquer : la ligne se solde au premier contrôle, alors que l'obligation, elle, redevient due à chaque modification — et rien dans le produit ne le dira.",
  },
  {
    id: "elec-travail-periodique-annuelle",
    domaine: "electricite",
    libelle: "Vérification périodique annuelle des installations électriques (travail)",
    description:
      "Vérification annuelle par un organisme accrédité ou une personne qualifiée désignée par l'employeur. Les modalités sont fixées par l'arrêté du 26 décembre 2011.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4226-16",
        article: "R. 4226-16",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765070/",
        versionConstatee: "2011-07-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 26 décembre 2011 (vérifications des installations électriques), art. 3",
        article: "Arrêté 2011-12-26 art. 3",
        note: "L'article 3 fixe la périodicité à un an, puis ouvre une faculté que le référentiel ne portait pas : « Toutefois, le délai entre deux vérifications peut être porté à deux ans par le chef d'établissement si le rapport précédent ne présente aucune observation ou si, avant l'échéance, le chef d'établissement a fait réaliser les travaux de mise en conformité de nature à répondre aux observations contenues dans le rapport de vérification. » Le texte ne la subordonne pas à une autorisation : « Le chef d'établissement informe l'inspecteur du travail par lettre recommandée avec accusé de réception, accompagnée des éléments prouvant qu'il n'y a pas de non-conformité ou que les non-conformités ont été levées. Cet envoi doit comprendre, le cas échéant, l'avis des membres du CHSCT ou des délégués du personnel. » Constaté le 2026-08-26.",
        url:
          "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000025046978",
        versionConstatee: "2011-12-30",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_accredite", "personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
  },
  {
    id: "elec-travail-consignation-registre",
    domaine: "electricite",
    libelle: "Consignation des rapports de vérification électrique au registre",
    description:
      "Les résultats des vérifications électriques et les justifications des travaux menés pour remédier aux anomalies relevées sont consignés sur un registre. Lorsque la vérification est réalisée par un organisme accrédité, son rapport est annexé à ce registre.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4226-19",
        article: "R. 4226-19",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765064/",
        versionConstatee: "2011-07-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "L. 4711-5",
        article: "L. 4711-5",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903389/",
        versionConstatee: "2008-05-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "registre de sécurité",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes: "NATURE : ÉTAT PERMANENT, `pieceAttendue` NON NULLE (ADR-026). R. 4226-19 n'impose pas de vérifier — d'autres lignes le font — il impose que les résultats soient CONSIGNÉS SUR UN REGISTRE. L'écrit est ici l'obligation, pas la trace d'un acte : c'est la distinction que porte `pieceAttendue`, et elle décide qu'une case à cocher seule ne suffit pas sur cette ligne.",
  },
  {
    id: "elec-travail-habilitation-personnel",
    domaine: "electricite",
    libelle: "Habilitation électrique du personnel opérant sur ou à proximité d'installations électriques",
    description:
      "L'employeur s'assure que les travailleurs qui effectuent des opérations sur ou à proximité d'installations électriques sont titulaires d'une habilitation adaptée au type d'opération. C'est un état à maintenir en permanence, pas un rendez-vous : le Code ne fixe aucune périodicité de renouvellement, il renvoie aux modalités des normes homologuées, qu'il qualifie lui-même de recommandées.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4544-9 à R. 4544-11",
        article: "R. 4544-10",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051500368",
        versionConstatee: "2025-10-01",
      },
      {
        source: "INRS",
        reference: "INRS ED 6127 « Habilitation électrique »",
        article: "INRS ED 6127",
        url:
          "https://www.inrs.fr/media.html?refINRS=ED%206127",
      },
    ],
    // « autre » = état permanent, pas d'échéance datée (ADR-023 § 6).
    //
    // Cette ligne annonçait « triennale ». AUCUN texte ne porte ce chiffre —
    // relu en première main le 2026-08-27 : R. 4544-9 (01/07/2011) n'énonce
    // aucune périodicité ; R. 4544-10 (01/10/2025) dit que l'employeur
    // « délivre, maintient ou renouvelle l'habilitation selon les modalités
    // contenues dans les normes mentionnées à l'article R. 4544-3 » ; et
    // R. 4544-3 (01/07/2011) précise que ces normes contiennent « les
    // modalités RECOMMANDÉES pour leur exécution ». Le Code prescrit donc de
    // suivre des modalités qu'il qualifie de recommandées, et n'écrit aucune
    // durée. Le triennal vient de la NF C 18-510 — une norme, que le
    // référentiel exclut comme source opposable.
    //
    // Une échéance inventée dans un outil de conformité est pire qu'une
    // échéance absente : elle se présente à un contrôle. Ce que l'outil dit
    // désormais est ce que dit le droit — l'habilitation est un état à
    // maintenir —, et ce qu'il DATE est l'attestation médicale quinquennale
    // de R. 4544-11-1, dont les cinq ans sont écrits noir sur blanc.
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [
      {
        vers: "salarie_designe",
        // Ce champ a valu `null` jusqu'au 2026-09-01, et son commentaire
        // d'alors disait vrai sur le constat, faux sur la conclusion : « le
        // catalogue des titres ne porte pas l'habilitation elle-même —
        // seulement l'attestation médicale qui la conditionne ». Le constat
        // tenait, mais il faisait du manque une fatalité. Or ce qui bloquait
        // l'encodage n'était pas l'absence de lecture — R. 4544-10 est lu et
        // au corpus depuis le 2026-08-26 —, c'était la croyance qu'un titre
        // suppose une durée. Il n'en suppose pas : `TitreSalarie.echeanceLe`
        // est nullable, et `periodicite: "autre"` empêche le générateur de
        // rien calculer. Le titre encode donc l'habilitation SANS lui
        // inventer de rythme.
        //
        // Ce que le `null` coûtait, et qui justifie de le retirer : l'écran
        // annonçait au dirigeant « cette obligation suppose une personne
        // nommée, aucune n'est déclarée » et ne lui laissait pas répondre.
        // Une question fermée dans un outil de conformité se lit comme un
        // reproche sans issue.
        titre: "elec-salarie-habilitation",
        motif:
          "R. 4544-10 fait délivrer l'habilitation à un travailleur désigné : l'obligation suppose une personne nommée. Le produit ne peut pas deviner qui opère sur ou à proximité des installations — ce serait le cinquième déclencheur, non implémenté (ADR-023) — mais il peut dire qu'aucune personne n'est déclarée.",
      },
    ],
    typologies: { travail: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes:
      "Périodicité passée de `triennale` à `autre` le 2026-08-27 (ADR-023 § 6) : voir le commentaire au-dessus du champ. Le précédent est celui du Kbis d'un prestataire, suivi sans statut d'expiration au motif que « le texte n'assortit pas la pièce d'une périodicité citable […] le produit informe, il ne décrète pas ».\n\nCe que l'utilisateur perd : une ligne d'échéance à trois ans. Ce qu'il gagne : une échéance réelle à sa place — l'attestation médicale — et un état permanent qui dit ce que le droit dit.\n\nLimite connue, non corrigée ici : la clé d'article est `R. 4544-10` alors que la citation couvre R. 4544-9 à R. 4544-11. Les deux bornes ne sont donc ni déclarées lues par cette ligne, ni surveillées par la veille à ce titre. (La dernière phrase de ce paragraphe disait « R. 4544-9 et R. 4544-11 n'ont d'ailleurs aucune entrée de corpus » : c'est faux depuis le 2026-08-31, où les deux sont entrées au corpus `code-travail-electricite` — R. 4544-9 en `sans_objet`, R. 4544-11 en `obligation_manquante`. Corrigé le 2026-09-01 plutôt que laissé : une limite qui a cessé d'exister et qui continue de s'annoncer envoie le prochain lecteur dépouiller ce qui l'est déjà.)\n\nTRANSMISSION BRANCHÉE LE 2026-09-01. `transmet[0].titre` ne vaut plus `null` : le catalogue porte désormais `elec-salarie-habilitation`. Voir le commentaire au-dessus du champ pour ce que le `null` coûtait.\n\nAmendement 2026-08-26 : L. 4711-5 était en refs[0], c'est-à-dire présenté comme l'article FONDATEUR (convention ADR-003). Or il n'institue aucun registre — il autorise à en réunir plusieurs en un seul, ce que le CLAUDE.md du dépôt écrit noir sur blanc. La contradiction était interne. R. 4226-19 passe en premier : c'est lui qui impose la consignation des résultats de vérification. Ce n'est pas cosmétique : le test anti-doublon compare les obligations sur leur article fondateur, donc un refs[0] faux le rend aveugle — le mécanisme même qui masquait le doublon des portails.\n\nNATURE : ÉTAT PERMANENT (ADR-026). La description le dit déjà — « un état à maintenir en permanence, pas un rendez-vous » — et le champ le porte désormais. C'est la ligne qui a fait passer la périodicité de `triennale` à `autre` le 2026-08-27 ; le couple nature + périodicité dit maintenant pourquoi, sans qu'on ait à lire la note.",
  },

  {
    id: "elec-travail-carnet-prescriptions",
    domaine: "electricite",
    libelle:
      "Remise d'un carnet de prescriptions à chaque travailleur habilité",
    description:
      "L'employeur remet à chaque travailleur habilité un carnet de prescriptions, établi sur la base des prescriptions pertinentes des normes auxquelles renvoie l'article R. 4544-3 et complété, le cas échéant, par les instructions de sécurité particulières au travail effectué. C'est une pièce à remettre et à tenir à jour, pas un rendez-vous : le Code ne l'assortit d'aucune durée de validité ni d'aucun renouvellement daté.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference:
          "R. 4544-10, quatrième alinéa (carnet de prescriptions remis à chaque travailleur)",
        article: "R. 4544-10",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051500368",
        note: "« L'employeur remet à chaque travailleur un carnet de prescriptions établi sur la base des prescriptions pertinentes de ces normes, complété, le cas échéant, par des instructions de sécurité particulières au travail effectué. » Article rouvert à la source le 2026-09-01 avant l'encodage, version en vigueur du 01/10/2025. Chemin : Quatrième partie > Livre V > Titre IV > Chapitre IV « Opérations sur les installations électriques » > SECTION 4 « Travailleurs autorisés à effectuer des opérations » — c'est le chemin qui dit qui est « chaque travailleur » : celui que l'employeur habilite, pas tout l'effectif.",
        versionConstatee: "2025-10-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: "carnet de prescriptions",
    realisateurs: ["exploitant"],
    criticite: 3,
    transmet: [
      {
        vers: "salarie_designe",
        // Rattaché à l'habilitation À L'INTÉGRATION DU 2026-09-02, et l'écart
        // vaut d'être gardé : ce champ portait `null` avec pour raison que
        // « le catalogue des titres ne porte pas l'habilitation électrique ».
        // C'était vrai sur la branche qui l'a écrit, et faux le jour même —
        // un autre lot venait d'ajouter `elec-salarie-habilitation`. Deux
        // branches qui ne se voyaient pas, une raison juste à l'écriture et
        // périmée au merge.
        //
        // Le rattachement est le bon : le carnet se remet « à chaque
        // travailleur » HABILITÉ, donc à qui détient précisément ce titre-là.
        titre: "elec-salarie-habilitation",
        motif:
          "Le carnet se remet « à chaque travailleur » habilité : la pièce est nominative, il y en a autant que de personnes habilitées. Le produit ne peut pas deviner qui opère sur les installations — ce serait le cinquième déclencheur, non implémenté (ADR-023) — mais il peut dire qu'aucune personne n'est déclarée.",
      },
    ],
    typologies: { travail: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes:
      "AJOUTÉE LE 2026-09-01 (lot C). Le corpus le déclarait en réserve sur R. 4544-10 depuis le relevé du matin : « Le carnet de prescriptions du quatrième alinéa, remis à CHAQUE travailleur, n'est encodé nulle part. » L'article met QUATRE actes à la charge de l'employeur — délivrer l'habilitation, s'assurer de la formation préalable, remettre le carnet, subordonner la validité à l'attestation médicale pour le voisinage — et le référentiel en portait trois.\n\nCE QUI LA DISTINGUE DE `elec-travail-habilitation-personnel`, avec laquelle elle partage l'article fondateur. L'habilitation est une DÉCISION de l'employeur — il autorise, dans les limites d'attributions qu'il fixe ; le carnet est une PIÈCE qu'il remet, et qui existe indépendamment : un employeur peut avoir habilité sans avoir remis, et c'est le manquement ordinaire. Elles ne se cochent pas de la même façon et ne se prouvent pas par la même chose — `pieceAttendue` est nulle sur l'une, nommée sur l'autre. Le couple est déclaré dans `PAIRES_DECLAREES` du test anti-doublon, qui ne compare que la clé d'article et ne sait pas distinguer deux alinéas ; c'est le même motif que `R. 4412-38` (fiches de données de sécurité contre formation).\n\n« CHAQUE TRAVAILLEUR » N'EST PAS TOUT L'EFFECTIF, et le chemin de l'article le dit : section 4, « Travailleurs autorisés à effectuer des opérations ». Le carnet est dû à qui est habilité. Le produit ne sait pas qui l'est — le déclencheur reste donc l'installation électrique déclarée, comme pour l'habilitation elle-même, et `transmet` nomme le trou plutôt que de le combler.\n\nAUCUNE PÉRIODICITÉ, ET C'EST UNE LECTURE. R. 4544-10 ne porte aucune durée : ni pour l'habilitation, ni pour le carnet. Le renouvellement est renvoyé aux « modalités contenues dans les normes mentionnées à l'article R. 4544-3 » — la NF C 18-510, que R. 4544-3 qualifie lui-même de recommandée et que ce dépôt n'accepte pas comme source opposable. Le carnet suit donc l'habilitation : `etat_permanent`, pas d'échéance inventée.\n\nCRITICITÉ 3 : l'absence de carnet ne met personne sous tension, elle prive d'un support de prescriptions. Ce qui protège est l'habilitation, qui porte la criticité 4.",
  },
  // ---------------------------------------------------------------------------
  // Porteur : le salarié (ADR-023)
  // ---------------------------------------------------------------------------
  {
    id: "elec-salarie-habilitation",
    domaine: "electricite",
    libelle: "Habilitation électrique du travailleur désigné",
    description:
      "L'employeur délivre à un travailleur désigné une habilitation adaptée aux opérations qu'il lui confie sur des installations électriques ou dans leur voisinage, puis la maintient ou la renouvelle. Aucune durée de validité n'est écrite dans le Code : il renvoie aux modalités de normes qu'il qualifie lui-même de recommandées. La date de fin que porte le titre est donc celle de qui l'a délivré, pas celle du droit — c'est à ce titre-là qu'elle se saisit ici, et Rojer n'en calcule aucune.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4544-10 (habilitation délivrée à un travailleur désigné)",
        article: "R. 4544-10",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051500368",
        versionConstatee: "2025-10-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    typologies: { travail: true },
    porteur: "salarie",
    exclut: [],
    pieceMedicale: false,
    transmet: [],
    notesInternes:
      "CETTE LIGNE EXISTE POUR QUE LE DIRIGEANT PUISSE RÉPONDRE. `elec-travail-habilitation-personnel` transmettait vers `salarie_designe` avec `titre: null` : l'écran annonçait « cette obligation suppose une personne nommée, aucune n'est déclarée » et ne laissait aucun moyen d'en déclarer une. C'était le seul renvoi du référentiel resté sans titre — les neuf autres transmissions `salarie_designe` en portaient un. Le trou n'était pas dans le droit, il était dans le catalogue, et son effet était de poser au dirigeant une question fermée.\n\nPÉRIODICITÉ « AUTRE », ET C'EST LA MÊME RÉPONSE QU'AU 2026-08-27. Aucune durée n'est écrite. `R. 4544-10`, dans sa version en vigueur au 2025-10-01, fait « délivrer, maintenir ou renouveler l'habilitation selon les modalités contenues dans les normes mentionnées à l'article R. 4544-3 », et `R. 4544-3` précise que ces normes contiennent « les modalités RECOMMANDÉES pour leur exécution ». Le recyclage triennal que l'on rencontre partout vient de la NF C 18-510 : une norme, que le référentiel n'accepte pas comme source opposable (ADR-003). La ligne d'établissement a porté « triennale » et l'a perdue pour ce motif le 2026-08-27 ; le titre ne la réintroduit pas par la porte de derrière.\n\nCONSÉQUENCE MÉCANIQUE, ET C'EST ELLE QUI PROTÈGE L'UTILISATEUR : `PERIODICITE_EN_JOURS.autre` vaut `null`, donc `prochaineDate` ne rend rien et le générateur ne calcule aucune échéance (`calendrier/generateur.ts`). La seule date affichée est celle que le dirigeant saisit, et `TitreSalarie.echeanceLe` est nullable précisément pour ce cas — `formation-securite-salarie-accueil` le dit déjà, en désignant cette habilitation-ci. Un titre sans terme écrit se classe `aPlanifier`, jamais `enRetard` (`salaries/queries.ts`).\n\nPOURQUOI DEUX LIGNES SUR `R. 4544-10`, ET PAS UNE. La paire est déclarée au test anti-doublon, avec sa raison. En deux mots : la ligne d'établissement est due dès qu'une installation électrique est déclarée, MÊME si personne n'est déclaré — c'est elle qui dit « aucune personne n'est habilitée ici » —, tandis que ce titre-ci ne produit de ligne que par personne déclarée. Les fondre aurait forcé un choix entre deux erreurs : une obligation qui disparaît quand personne n'est déclaré, ou une obligation qui ne se solde jamais nominativement. C'est mot pour mot l'arbitrage rendu pour `formation-securite-etablissement-organisation` et `formation-securite-salarie-accueil`.\n\n`pieceMedicale: false` — une habilitation n'est pas une pièce médicale. Celle qui l'est est `elec-salarie-attestation-medicale-voisinage`, fondée sur `R. 4544-11-1`, et elle reste une obligation distincte : ses cinq ans sont écrits noir sur blanc, ceux-là. NE PAS CONFONDRE LES DEUX — c'est la confusion qui avait fait écrire « triennale » ici.\n\n`exclut: []` — l'attestation médicale ne s'oppose pas à l'habilitation, elle la conditionne pour les travaux sous tension (`R. 4544-11` I). Conditionner n'est pas exclure : le champ ne porte que les cumuls que le droit interdit sur une même personne.\n\nNATURE : ÉTAT PERMANENT (ADR-026), comme la ligne d'établissement et pour la même raison. Le texte fait délivrer, maintenir ou renouveler, sans nommer ni rythme ni fait déclencheur ; la règle de résolution de l'ADR-026 range sur le titre qui oblige à REFAIRE l'acte, et aucun n'y oblige ici.\n\nCE QUE CE LOT N'A PAS OUVERT. Aucun article n'a été relu : la lecture de `R. 4544-9` à `R. 4544-11` est datée des 2026-08-26, 2026-08-27 et 2026-08-31 et vit au corpus `code-travail-electricite`. Ce lot branche un titre sur une lecture existante, il n'en produit aucune. L'habilitation SPÉCIFIQUE aux travaux sous tension de `R. 4544-11` reste `obligation_manquante` au corpus, avec son `bloquePar` : elle n'entre pas ici, et l'encoder demanderait de trancher ce que « selon les modalités contenues dans les normes » veut dire pour l'outil.",
  },

  {
    id: "elec-salarie-attestation-medicale-voisinage",
    domaine: "electricite",
    libelle:
      "Attestation médicale d'absence de contre-indication au travail sous tension",
    description:
      "L'habilitation à opérer sous tension ou au voisinage de pièces nues sous tension est subordonnée à une attestation d'absence de contre-indication médicale, délivrée par le médecin du travail pour une durée de cinq ans. Le travailleur la présente à son employeur, qui en conserve une copie pendant toute sa durée de validité.",
    referencesLegales: [
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4544-11-1",
        article: "R. 4544-11-1",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051496288",
        versionConstatee: "2025-10-01",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4544-10 (habilitation délivrée à un travailleur désigné)",
        article: "R. 4544-10",
        url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051500368",
        versionConstatee: "2025-10-01",
      },
    ],
    periodicite: "quinquennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    // `medecin_travail` depuis le 2026-08-31, et `exploitant` était une
    // contre-vérité que la note ci-dessous relevait elle-même : le verbatim dit
    // « est délivrée PAR LE MÉDECIN DU TRAVAIL à l'issue d'un examen médical
    // qu'il réalise ». L'écran annonçait donc à un dirigeant qu'il délivre
    // lui-même une attestation médicale — un acte qu'il lui est interdit de
    // réaliser.
    //
    // La valeur n'existait pas quand cette obligation a été écrite ; elle a été
    // ajoutée avec le suivi médical, et son jumeau `R. 4323-56` — issu du MÊME
    // décret n° 2025-355 — la porte. Le référentiel se contredisait sur deux
    // obligations nées le même jour du même texte.
    //
    // Pourquoi maintenant, alors que la correction avait été écartée : l'argument
    // qui la retenait était qu'elle déplace l'empreinte d'une obligation publiée
    // sur des dossiers vivants. Il valait tant que le lot n'était qu'un ajout ;
    // l'intégration en cours déplace l'empreinte massivement de toute façon.
    // Laisser une contre-vérité pour éviter un déplacement qui a lieu quand même,
    // c'est en payer le coût sans en acheter le bénéfice.
    //
    // Le DOMAINE reste `electricite`, délibérément : c'est l'habilitation
    // électrique que cette attestation conditionne, et le déplacer changerait
    // son rangement au calendrier sans rien corriger. Un seul déplacement
    // d'empreinte, pas deux.
    realisateurs: ["medecin_travail"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    porteur: "salarie",
    exclut: [],
    pieceMedicale: true,
    notesInternes:
      "Première obligation à porteur salarié du référentiel (ADR-023).\n\nVerbatim relevé en première main le 2026-08-27 : « L'attestation mentionnée aux articles R. 4544-10 et R. 4544-11, d'une validité de cinq ans, est délivrée par le médecin du travail à l'issue d'un examen médical qu'il réalise. Elle est présentée par le travailleur à l'employeur, qui en conserve une copie pendant toute sa durée de validité. » Les cinq ans sont donc ÉCRITS, contrairement au triennal de l'habilitation elle-même.\n\nCe que l'outil stocke : que l'attestation existe, sa date, son échéance. RIEN d'autre — ni motif, ni sens, ni pièce. C'est plus strict que le texte, qui autorise expressément l'employeur à en conserver copie ; le choix est motivé dans docs/rgpd.md § 2.3. Le drapeau `pieceMedicale` existe pour que l'interface ne propose jamais de téléverser le document : ce serait défaire la décision sans que personne ne la rouvre.\n\nSes lignes naissent d'un `TitreSalarie` déclaré, pas du moteur : rien ne dit qui, dans l'effectif, opère au voisinage de pièces nues sous tension — ce serait le cinquième déclencheur, non implémenté. Aucun titre déclaré, aucune ligne, et c'est juste.\n\nLe décret n° 2025-355 du 18 avril 2025, qui crée l'article et fixe son entrée en vigueur au 1er octobre 2025, n'est PAS cité en référence : il n'est pas dépouillé au corpus, et le cliquet de `corpus.test.ts` interdit d'encoder sur un texte que personne n'a lu. Son contenu est ici, en note, jusqu'à ce qu'il le soit.\n\nTRANSITION À NE PAS RATER : R. 4544-10 prévoit que les attestations d'aptitude délivrées sous le régime antérieur restent valides jusqu'au 2030-10-01. Une échéance calculée sur le régime nouveau chez un salarié couvert par l'ancien serait fausse de plusieurs années. Le modèle le permet : `TitreSalarie.echeanceLe` est déclaré par l'employeur et prime sur tout calcul.",
  },

  // ---------------------------------------------------------------------------
  // ERP (arrêté du 25 juin 1980 et arrêté du 22 juin 1990)
  // ---------------------------------------------------------------------------
  {
    id: "elec-erp-mise-en-service",
    relectureDue: {
      le: "2027-06-01",
      motif:
        "GE 6, cité en premier par cette obligation, affiche « Version en vigueur du 19/11/2007 au 01/06/2027 » : l'arrêté du 19 février 2026 le réécrit à cette date, en même temps que GE 2 et GE 7 (JORFTEXT000053525217, lu au JO le 2026-09-01). GE 6 est l'article de RÉGIME — il dit qui vérifie, organisme agréé ou technicien compétent — et c'est de lui que le réalisateur `organisme_agree` de cette ligne est tiré, par son § 2. Relire GE 6 dans sa version au 1er juin 2027, et avec lui GE 7 et GE 8, cités dans la même `reference` et absents du corpus. Vérifier au passage si le renvoi du § 1 vers « l'article R. 123-43 du code de la construction et de l'habitation » — numérotation disparue à la recodification de 2021 — est enfin corrigé. Le texte modificateur ne s'appliquant qu'aux demandes d'autorisation de travaux déposées à compter de cette date, regarder aussi ce qu'il advient du parc existant.",
    },
    domaine: "electricite",
    libelle: "Vérification électrique à la mise en service ou après travaux (ERP)",
    description:
      "Les installations électriques des ERP sont vérifiées à la mise en service et après travaux par un organisme agréé, qui établit le rapport de vérification réglementaire après travaux (RVRAT).",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. GE 6 à GE 8 (vérifications par organismes agréés, rapport RVRAT)",
        article: "GE 6",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020303884/",
        versionConstatee: "2007-11-19",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EL 19 § 2 (installations neuves ou modifiées)",
        article: "EL 19",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021231068/",
        note: "« § 2. Les installations neuves ou ayant fait l'objet de travaux doivent être vérifiées dans les conditions prévues aux articles GE 7 et GE 8 (§ 1). » Le § 2 est bien le paragraphe de cet acte-ci : c'est `elec-erp-cat1-4-annuelle` qui le citait à tort, et elle a été recalée sur le § 3 le 2026-09-01.",
        versionConstatee: "2010-01-23",
      },
    ],
    periodicite: "mise_en_service_uniquement",
    nature: "evenementielle",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait EL 5, qui définit les locaux de service électrique. La vérification avant ouverture et après travaux relève des articles GE 6 à GE 8 (rapport RVRAT), auxquels EL 19 § 2 renvoie.\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26). L'article cité relève du Livre II du règlement de sécurité, écarté en 5ᵉ catégorie par PE 1 § 1 ; le dépouillement intégral du Livre III a établi qu'il n'en rouvre que MS 39 et MS 70. GE 7 § 1 le confirme en propre : il ne vise que les établissements des 1ʳᵉ à 4ᵉ catégories. Ce qui traite le même objet en N5 est PE 4 § 1, plus étroit — vérification à la construction et avant ouverture par personnes ou organismes agréés, et seulement « dans les établissements avec locaux à sommeil ». La ligne est MAINTENUE : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible reste corrigeable. À reprendre quand le référentiel saura porter l'attribut « locaux à sommeil ».\n\nNATURE : ÉVÉNEMENTIELLE (ADR-026). Même configuration que `elec-travail-mise-en-service` : EL 19 § 2 vise les installations « neuves OU MODIFIÉES ». Le second titre commande, et le produit n'observe pas les travaux.",
  },
  {
    id: "elec-erp-cat1-4-annuelle",
    domaine: "electricite",
    libelle: "Vérification électrique annuelle (ERP 1ʳᵉ à 4ᵉ catégorie)",
    description:
      "Les installations électriques des ERP des quatre premières catégories font l'objet d'une vérification annuelle par un organisme agréé. Le rapport est consigné au registre de sécurité.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. EL 19 § 3 (vérifications périodiques des installations non modifiées)",
        article: "EL 19",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021231068/",
        note: "« § 3. Les vérifications périodiques des installations non modifiées doivent être effectuées annuellement dans les conditions prévues à l'article GE 10. » Verbatim relevé en première main le 2026-09-01. Le § 1 n'est qu'un renvoi de régime à la section II du chapitre Ier, et le § 2 vise les installations neuves ou ayant fait l'objet de travaux — c'est l'objet de `elec-erp-mise-en-service`, l'acte inverse.",
        versionConstatee: "2010-01-23",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: {
      erp: { categories: ["N1", "N2", "N3", "N4"] },
    },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes:
      "FONDEMENT RECALÉ LE 2026-09-01 (lot A). L'obligation citait « EL 19 § 1 et § 2 » pour fonder une ANNUELLE. Aucun des deux ne la porte : le § 1 renvoie le régime à la section II du chapitre Ier (GE 6 et suivants), et le § 2 vise les installations neuves ou ayant fait l'objet de travaux — donc exactement l'objet de `elec-erp-mise-en-service`. Les deux lignes citaient le même paragraphe pour deux actes opposés, et celle qui l'avait juste était l'autre. L'annuelle est au § 3, qui vise « les installations NON MODIFIÉES » et renvoie à GE 10.\n\nCE QUE LE § 3 AJOUTE ET QUI N'EST PAS ENCODÉ : il énumère une liste CLOSE des articles couverts par l'annuelle — EL 4 § 4, EL 5 § 1, 4 et 5, EL 8 § 3, EL 10 § 4, EL 11 § 3, 4 et 7, EL 15 § 3, EL 17 et EL 18, puis EC 5 § 5, EC 6 § 5 et 6, EC 7, EC 9 § 1, EC 13 et EC 14 § 3 —, et c'est par EC 13 et EC 14 § 3 que l'éclairage de sécurité entre dans cette annuelle (`incendie-erp-baes-annuelle`). Relevé, non modélisé : le référentiel ne sait pas porter une liste d'articles couverts.\n\nSur-application assumée en 5ᵉ catégorie, comme `elec-erp-mise-en-service` : voir ses notes internes. Le § 3 relève du même Livre II, écarté par PE 1 § 1. La typologie restreint déjà aux catégories N1 à N4, ce qui borne le cas ici.",
  },
  // `elec-erp-cat5-quinquennale` a été RETIRÉ le 2026-08-27 (ADR-022).
  //
  // Il n'avait pas de fondement propre : son article fondateur était PE 4 § 2,
  // et il n'en projetait qu'un fragment — « les installations électriques » —
  // sur une catégorie d'équipement. Ce découpage n'existait que parce que le
  // modèle exigeait un déclencheur d'équipement. Depuis que le référentiel
  // porte PE 4 § 2 entier
  // (`incendie-erp-pe4-entretien-installations-techniques`), le garder ferait
  // deux lignes triennales pour un seul acte, et maintiendrait la
  // décomposition que ce chantier existe pour écarter.
  //
  // Ce que le retrait ne détruit pas : la réconciliation ne supprime
  // physiquement qu'une ligne SANS rapport, sans action et sans date de
  // réalisation ; toute ligne porteuse d'une preuve est archivée, libellé
  // marqué (ADR-012). Constaté en base au 2026-08-27 avant le retrait : trois
  // lignes, aucune preuve, aucune réalisation.
  //
  // L'id ne doit JAMAIS être réemployé (cf. `Obligation.id`) — il est
  // enregistré dans `OBLIGATIONS_RETIREES`, et un test le vérifie.
  {
    id: "elec-erp-groupe-electrogene-quinzaine",
    domaine: "electricite",
    libelle:
      "Vérification des niveaux du groupe électrogène de sécurité (ERP)",
    description:
      "Tous les quinze jours, l'exploitant vérifie le niveau d'huile, d'eau et de combustible du groupe électrogène de sécurité, le dispositif de réchauffage du moteur et l'état de la source utilisée pour le démarrage (batterie ou air comprimé). Les interventions et leurs résultats sont consignés dans un registre d'entretien tenu à la disposition de la commission de sécurité.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. EL 18 § 4 (première périodicité)",
        article: "EL 18",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038485456/",
        note: "« Les groupes électrogènes de sécurité doivent faire l'objet d'un entretien régulier et d'essais selon la périodicité minimale suivante : ― tous les quinze jours, vérification du niveau d'huile, d'eau et de combustible, du dispositif de réchauffage du moteur et de l'état de la source utilisée pour le démarrage (batterie ou air comprimé) […]. » Verbatim confirmé par relecture indépendante le 2026-08-26.",
        versionConstatee: "2019-07-01",
      },
    ],
    periodicite: "bimensuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes:
      "Créée le 2026-08-26. EL 18 § 4 fixe DEUX périodicités minimales, et le référentiel n'en portait qu'une : l'obligation unique était encodée « mensuelle », si bien que la vérification des niveaux tous les quinze jours ne produisait aucune échéance. Elle ne vivait que dans la prose d'une description — sur un matériel dont le seul rôle est de démarrer quand tout le reste a lâché.\n\nLa valeur `bimensuelle` a été ajoutée à l'énumération et à la base pour cela : le choix se réduisait auparavant à `hebdomadaire`, qui double la charge réelle, ou `mensuelle`, qui tait l'obligation. Conversion à quatorze jours et non quinze — un multiple de sept fait retomber l'échéance le même jour de la semaine.\n\nSur-application assumée en 5ᵉ catégorie, comme les autres obligations de ce fichier fondées sur le Livre II : EL 18 relève du Livre II, écarté par PE 1 § 1, et ce qui traite du même objet en N5 est PE 4 § 2. La ligne est maintenue pour ne pas créer un faux négatif muet.",
  },
  {
    id: "elec-erp-presence-personne-qualifiee",
    domaine: "electricite",
    libelle:
      "Présence d'une personne qualifiée pendant l'ouverture au public (ERP 1ʳᵉ et 2ᵉ catégorie)",
    description:
      "Dans un établissement de 1ʳᵉ ou de 2ᵉ catégorie, la présence physique d'une personne qualifiée est requise pendant toute la présence du public, pour assurer, conformément aux consignes données, l'exploitation et l'entretien quotidien des installations électriques. Ce n'est pas une vérification à date : c'est un état à tenir chaque jour d'ouverture.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. EL 18 § 2 (présence physique d'une personne qualifiée)",
        article: "EL 18",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038485456/",
        note: "« Dans tout établissement de 1re ou 2e catégorie, la présence physique d'une personne qualifiée est requise pendant la présence du public pour, conformément aux consignes données, assurer l'exploitation et l'entretien quotidien. Une telle mesure peut être imposée après avis de la commission de sécurité dans les établissements de 3e et de 4e catégorie si l'importance ou l'état des installations électriques le justifie. » Article rouvert à la source le 2026-09-01 avant l'encodage, version en vigueur du 01/07/2019. La seconde phrase n'est PAS encodée : elle décrit une mesure qu'une commission peut imposer sur un dossier donné — une prescription particulière (ADR-035), pas une règle générale.",
        versionConstatee: "2019-07-01",
      },
    ],
    periodicite: "autre",
    nature: "etat_permanent",
    pieceAttendue: null,
    realisateurs: ["exploitant"],
    criticite: 4,
    transmet: [
      {
        vers: "salarie_designe",
        // `null` : le catalogue des titres ne porte pas la « personne
        // qualifiée » d'EL 18 § 2. Le texte ne renvoie à aucune formation ni
        // à aucun titre nommé — il exige une qualification, sans la définir.
        // Pointer vers l'habilitation électrique dirait quelque chose que
        // l'article n'écrit pas.
        titre: null,
        motif:
          "EL 18 § 2 exige la présence physique d'UNE PERSONNE qualifiée pendant toute la présence du public : l'obligation suppose quelqu'un de nommé, et le produit ne peut pas deviner qui. Il peut en revanche dire qu'aucune personne n'est déclarée pour ce rôle.",
      },
    ],
    porteur: "etablissement",
    // 1ʳᵉ et 2ᵉ catégorie, et rien d'autre : c'est le champ que la première
    // phrase de l'article écrit. Les 3ᵉ et 4ᵉ n'y entrent que par décision de
    // la commission de sécurité, dossier par dossier.
    typologies: { erp: { categories: ["N1", "N2"] } },
    equipementsEnContexte: ["INSTALLATION_ELECTRIQUE"],
    notesInternes:
      "AJOUTÉE LE 2026-09-01 (lot C). Le corpus la déclarait en réserve sur EL 18 depuis le relevé du matin — « LE § 2 N'EST ENCODÉ NULLE PART […] et le corpus ne la comptait pas comme manquante puisque l'article était déjà classé retenu au titre du seul § 4 ». C'est le cas d'école du manque qu'un statut « retenu » cache : un article de quatre paragraphes dont un seul est porté.\n\nPORTEUR ÉTABLISSEMENT, ET C'EST LE POINT (ADR-022). L'exigence ne naît d'aucun équipement déclaré : elle naît de la CATÉGORIE de l'établissement. L'accrocher à `INSTALLATION_ELECTRIQUE` en ferait un faux négatif chez tout ERP de 1ʳᵉ ou 2ᵉ catégorie n'ayant pas déclaré son tableau — c'est-à-dire chez celui qui a le moins renseigné, exactement le défaut que le palier 1 a corrigé sur trois autres lignes le 2026-08-31. `equipementsEnContexte` garde le lien, sans en faire une condition.\n\nÉTAT PERMANENT, PAS ÉCHÉANCE (ADR-026). « Pendant la présence du public » n'est pas un rythme : il n'y a pas d'acte à refaire à date, il y a quelqu'un qui est là ou qui ne l'est pas. Aucune périodicité n'est donc posée, et `autre` se lit ici avec la nature, pas seule.\n\nCE QUE LE PRODUIT NE SAIT PAS FAIRE, et qu'il ne feint pas : vérifier qu'une personne est effectivement présente aux heures d'ouverture. Il pose l'exigence et nomme le trou par `transmet` ; la déclaration appartient au dirigeant.\n\nCE QUI N'EST PAS ENCODÉ, et pourquoi. La seconde phrase du § 2 étend la mesure aux 3ᵉ et 4ᵉ catégories « après avis de la commission de sécurité ». Ce n'est pas une règle générale mais un acte administratif individuel : il relève des prescriptions particulières (ADR-035), qui surchargent un dossier donné, et l'encoder au référentiel donnerait à tous les ERP de 3ᵉ et 4ᵉ catégorie une obligation que la plupart n'ont pas reçue.\n\nSUR-APPLICATION EN 5ᵉ CATÉGORIE : AUCUNE, et c'est l'exception dans ce fichier. EL 18 relève du Livre II, écarté en N5 par PE 1 § 1 — mais la restriction `{ categories: [\"N1\", \"N2\"] }` est écrite dans l'article lui-même, si bien que la question ne se pose pas : un ERP de 5ᵉ catégorie ne reçoit pas cette ligne.",
  },
  {
    id: "elec-erp-groupe-electrogene-annuel",
    domaine: "electricite",
    libelle: "Entretien et essais des groupes électrogènes de sécurité (ERP)",
    description:
      "Tous les mois, le groupe électrogène de sécurité fait l'objet, en plus de la vérification des niveaux, d'un essai de démarrage automatique avec une charge minimale de 50 % de la puissance du groupe et d'un fonctionnement sous cette charge pendant une durée minimale de trente minutes. Les interventions et leurs résultats sont consignés dans un registre d'entretien tenu à la disposition de la commission de sécurité.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EL 18 § 4 (entretien et essais des groupes électrogènes de sécurité)",
        article: "EL 18",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000038485456/",
        versionConstatee: "2019-07-01",
      },
      {
        source: "ARRETE",
        reference: "Arrêté du 25 juin 1980, art. EL 19 (vérification annuelle)",
        article: "EL 19",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000021231068/",
        versionConstatee: "2010-01-23",
      },
    ],
    periodicite: "mensuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["exploitant", "personne_qualifiee", "organisme_agree"],
    criticite: 4,
    transmet: [],
    typologies: { erp: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    conditions: [
      {
        type: "equipement_propriete_booleenne",
        categorie: "INSTALLATION_ELECTRIQUE",
        propriete: "aGroupeElectrogene",
        valeur: true,
      },
    ],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait EL 20, qui traite des installations temporaires.\n\nSur-application assumée en 5ᵉ catégorie (constatée 2026-08-26). L'article cité relève du Livre II du règlement de sécurité, écarté en 5ᵉ catégorie par PE 1 § 1 ; le dépouillement intégral du Livre III a établi qu'il n'en rouvre que MS 39 et MS 70. GE 7 § 1 le confirme en propre : il ne vise que les établissements des 1ʳᵉ à 4ᵉ catégories. Ce qui traite le même objet en N5 est PE 4 § 1, plus étroit — vérification à la construction et avant ouverture par personnes ou organismes agréés, et seulement « dans les établissements avec locaux à sommeil ». La ligne est MAINTENUE : la retirer créerait un faux négatif muet chez 100 % des utilisateurs, alors qu'une sur-application visible reste corrigeable. À reprendre quand le référentiel saura porter l'attribut « locaux à sommeil ».\n\nAmendement 2026-08-26 : EL 18 § 4 fixe DEUX périodicités minimales — tous les quinze jours (niveaux d'huile, d'eau, de combustible, réchauffage moteur, source de démarrage) et tous les mois (essai de démarrage automatique sous 50 % de charge pendant trente minutes). Le champ `periodicite` n'en porte qu'une : l'énumération `Periodicite` n'a pas de valeur quinzomadaire, et le seul voisin disponible, `hebdomadaire`, doublerait la charge réelle. La quinzaine ne vit donc que dans la `description` et ne produit aucune échéance — sous-application connue, à lever en ajoutant une valeur à l'énumération.\n\nL'identifiant conserve « annuel » alors que la périodicité est mensuelle : `Verification.obligationId` est stocké en base sous contrainte d'unicité, et le renommer orphelinerait les lignes de calendrier existantes. Le libellé, lui, a été corrigé.\n\n`realisateurs` gagne `exploitant` : EL 18 § 4 n'exige aucun tiers, l'entretien et les essais lui incombent, et le registre d'entretien est tenu à disposition de la commission. L'organisme agréé relève d'EL 19, pas d'EL 18.",
  },

  // ---------------------------------------------------------------------------
  // IGH (arrêté du 30 décembre 2011)
  // ---------------------------------------------------------------------------
  {
    id: "elec-igh-annuelle",
    domaine: "electricite",
    libelle: "Vérification annuelle des installations électriques (IGH)",
    description:
      "Le propriétaire d'un immeuble de grande hauteur fait vérifier annuellement, par un organisme agréé, les installations électriques et l'éclairage des parties communes. Les installations de protection contre la foudre sont vérifiées tous les deux ans.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference: "Arrêté du 30 décembre 2011 (règlement IGH), art. GH 5 (vérifications techniques par organismes agréés)",
        article: "GH 5",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025169258",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_agree"],
    criticite: 5,
    transmet: [],
    typologies: { igh: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes:
      "Corrigé à l'audit 2026-08 : l'ancienne version citait GH 50, qui traite de l'alerte (dispositifs phoniques vers le PC sécurité). Les vérifications techniques périodiques sont à l'article GH 5.",
  },
  {
    id: "incendie-hotel-po-controle-annuel-electricite",
    domaine: "electricite",
    libelle:
      "Contrôle annuel des installations électriques (hôtel de 5ᵉ catégorie)",
    description:
      "Dans un hôtel, les installations électriques sont contrôlées chaque année par un technicien compétent. Cette échéance vise les établissements de 5ᵉ catégorie de type O, que la vérification annuelle des ERP des quatre premières catégories ne couvre pas.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. PO 1 § 3 (règles spécifiques aux hôtels)",
        article: "PO 1",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020374775/2018-01-01",
        note: "« L'ensemble des installations techniques doit être contrôlé par un technicien compétent tous les deux ans, à l'exception des installations électriques et des systèmes de détection incendie qui doivent être contrôlés annuellement. » Verbatim relevé en première main le 2026-08-26.",
        versionConstatee: "2018-01-01",
      },
      {
        source: "ARRETE",
        reference:
          "Arrêté du 25 juin 1980, art. PO 8 § 1 (extension aux hôtels existants)",
        article: "PO 8",
        url:
          "https://www.legifrance.gouv.fr/codes/section_lc/JORFTEXT000000290033/LEGISCTA000020374775/",
        note: "« Les prescriptions définies dans la présente section sont applicables en complément des articles PE 4, PE 24, PE 26, PE 27, PE 32, PE 36, PO 1 (§ 3) et PO 5. » Verbatim relevé en première main le 2026-08-26. PO 1 § 3 figure dans la section 1, intitulée « Prescriptions applicables aux établissements à construire ou à modifier » ; PO 8 § 1 ouvre la section 2, « Prescriptions applicables aux établissements existant », et l'y réimporte nommément. La périodicité vaut donc pour TOUS les hôtels, pas seulement les neufs.",
        versionConstatee: "2011-10-30",
      },
    ],
    periodicite: "annuelle",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["personne_qualifiee"],
    criticite: 5,
    transmet: [],
    typologies: { erp: { categories: ["N5"], types: ["O"] } },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes:
      "Créée le 2026-08-26. `elec-erp-cat1-4-annuelle` s'arrête aux quatre premières catégories : un petit hôtel de 5ᵉ catégorie n'avait AUCUN contrôle électrique annuel, alors que PO 1 § 3 le lui impose nommément. Le manque était déclaré `non_couvert` sur le chapitre PO avec la mention « le manque est un choix, pas une impossibilité » — il ne l'est plus.\n\nLa détection incendie, que le même paragraphe soumet au même rythme annuel, n'est PAS ajoutée ici : `incendie-erp-ssi-annuelle` porte `erp: true` et couvre donc déjà tous les ERP, cinquième catégorie comprise. L'ajouter aurait créé un doublon.\n\n`personne_qualifiee` traduit « technicien compétent » : le texte n'exige ni organisme agréé ni accréditation, et l'exploitant ne peut pas s'en charger lui-même.\n\nDomaine `electricite` et non `incendie` : le domaine décrit l'objet contrôlé, pas le texte qui l'impose. L'obligation vit donc auprès des autres vérifications électriques, où le dirigeant la cherchera.",
  },
  {
    id: "elec-travail-rapport-quadriennal",
    domaine: "electricite",
    libelle: "Rapport quadriennal — mise à jour complète du descriptif électrique",
    description:
      "Tous les quatre ans, l'ensemble des renseignements descriptifs de l'installation électrique fait l'objet d'une mise à jour complète, qui donne lieu à un rapport dit « quadriennal », rédigé comme un rapport de vérification initiale : description des bâtiments et des postes, schéma de principe unifilaire, caractéristiques des canalisations et des dispositifs de protection, classement des locaux et conditions d'influences externes. Les vérifications périodiques des trois autres années s'appuient sur ce descriptif ; sans lui, elles comparent l'installation à un état qui n'existe plus.",
    referencesLegales: [
      {
        source: "ARRETE",
        reference:
          "Arrêté du 26 décembre 2011, annexe II, point 3.5 (mise à jour des renseignements descriptifs)",
        article: "Arrêté 2011-12-26 annexe II",
        url:
          "https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000025100353",
        note: "« Une mise à jour complète de l'ensemble des renseignements descriptifs doit être effectuée tous les quatre ans ; elle donnera lieu à un rapport, dit \"quadriennal\", rédigé comme un rapport de visite initiale. » Verbatim relevé en première main le 2026-08-26.",
        versionConstatee: "2011-12-30",
      },
      {
        source: "CODE_TRAVAIL",
        reference: "R. 4226-16 (vérification périodique annuelle)",
        article: "R. 4226-16",
        url:
          "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000022765070/",
        versionConstatee: "2011-07-01",
      },
    ],
    periodicite: "quadriennale",
    nature: "echeance_recurrente",
    pieceAttendue: null,
    realisateurs: ["organisme_accredite", "personne_qualifiee"],
    criticite: 4,
    transmet: [],
    typologies: { travail: true },
    categoriesEquipement: ["INSTALLATION_ELECTRIQUE"],
    notesInternes:
      "Créée le 2026-08-26, annexe II lue en première main. Le référentiel portait la vérification périodique annuelle mais ignorait le rapport quadriennal, qui n'existait ni en échéance ni en prose. C'est pourtant lui qui empêche la vérification périodique de dériver : les rapports périodiques ne consignent que les non-conformités et les écarts, sur la foi d'un descriptif établi une fois. Tous les quatre ans, ce descriptif est refait comme au premier jour.\n\nL'énumération sautait de `triennale` à `quinquennale` ; la valeur `quadriennale` (1460 jours) a été ajoutée à l'énumération et à l'enum Postgres.\n\nMêmes réalisateurs que la vérification périodique dont il est la forme renforcée : le point 3.5 dit « rédigé comme un rapport de visite initiale », pas « par un organisme accrédité ». L'accréditation n'est requise que pour la vérification initiale elle-même (R. 4226-14) et sur demande de l'inspection.\n\nCriticité 4 et non 5 : l'absence de rapport quadriennal ne crée pas de danger immédiat, elle dégrade la fiabilité de tous les contrôles suivants.",
  },
];
