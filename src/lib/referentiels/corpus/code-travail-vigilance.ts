// Corpus : code du travail — la vigilance du donneur d'ordre, et le travail
// dissimulé qu'elle vise.
//
// TROIS CORPUS DANS UN FICHIER, et il ne pouvait pas y en avoir un seul —
// c'est le découpage de `code-travail-duerp.ts` et de `csp-eau-potable.ts`,
// pour la même raison. La vigilance est écrite à deux étages du Code : le
// chapitre II du titre II de la HUITIÈME partie, en partie législative
// (`L. 8222-1` à `L. 8222-7` — l'obligation de vérifier, la solidarité
// financière, l'injonction) et le même chapitre en partie réglementaire
// (`R. 8222-1` à `D. 8222-8` — le seuil de montant, les pièces, le rythme).
// Chacun des deux est ici INTÉGRAL : sept articles sur sept, huit sur huit.
// Les fondre aurait rendu leur `etendue` `articles_cites` sans rien gagner.
//
// Le troisième est d'une autre nature. `L. 8221-3` et `L. 8221-5` vivent au
// chapitre PRÉCÉDENT (« Interdictions »), et n'entrent ici que parce que
// `L. 8222-1` y renvoie expressément : ce sont les deux définitions du travail
// dissimulé dont la vigilance vérifie qu'un cocontractant ne relève pas. Le
// chapitre Ier compte neuf articles ; quatre sont lus, donc `articles_cites`,
// et le corpus ne prétend rien sur les cinq autres.
//
// POURQUOI CE LOT EXISTE. Le cliquet de `citations-ecran.ts` a mesuré, le
// 2026-09-02, les articles que les écrans citent au dirigeant sans qu'aucun
// corpus les ait ouverts. Cette famille était la plus citée des seize :
// `L. 8222-1` (5 occurrences), `D. 8222-5` (4), `L. 8221-3` (4), `L. 8221-5`
// (4), `R. 8222-1` (3) — vingt occurrences, sur quatre surfaces qui
// s'affichent, dont le formulaire de saisie d'un prestataire. Et c'est le
// fondement de tout le module Prestataires : l'annuaire, le suivi des
// attestations, les alertes d'expiration. Aucun de ces cinq articles n'avait
// jamais été ouvert.
//
// ── CE QUE LA LECTURE A ÉTABLI, ET QUI NE SE DEVINAIT PAS ────────────────
//
// 1. LE RYTHME AFFICHÉ PAR LE PRODUIT EST CELUI DU TEXTE, SON ANCRAGE NE
//    L'EST PAS. `D. 8222-5` dit « lors de la conclusion et tous les six mois
//    jusqu'à la fin de son exécution » : six mois, et
//    `MOIS_RENOUVELLEMENT_URSSAF = 6` (`src/lib/prestataires/vigilance.ts`)
//    tombe juste. Mais le texte compte ces six mois à partir de la CONCLUSION
//    du contrat puis de chaque remise, quand le produit les compte à partir de
//    `prestataire.updatedAt` — la dernière modification de la fiche. Le module
//    dit lui-même que la déduction ne vaut que dans un sens (« la pièce n'a
//    pas pu être déposée après la dernière modification »), et c'est exact :
//    la borne obtenue est toujours PLUS TARDIVE que l'échéance réelle. Elle
//    n'alerte donc jamais à tort — elle alerte tard, et d'autant plus tard
//    qu'on touche à la fiche : corriger un numéro de téléphone repousse de six
//    mois la limite semestrielle d'une attestation qu'on n'a pas redemandée.
//    C'est un défaut d'ancrage, pas de rythme, et il se corrige par une donnée
//    qui manque — la date de remise de l'attestation.
//
// 2. LE SEUIL EST À JOUR, ET IL A BIEN BOUGÉ. `R. 8222-1` : « toute opération
//    d'un montant au moins égal à 5 000 euros hors taxes », version en vigueur
//    depuis le 2015-05-01 (décret n° 2015-364 du 30 mars 2015, art. 13). La
//    version précédente, en vigueur du 2008-05-01 au 2015-05-01, disait
//    « 3 000 euros » — sans « hors taxes ». Le décret a donc changé DEUX
//    choses, le montant et son assiette, et les trois surfaces du produit qui
//    écrivent « 5 000 € HT » écrivent les deux justes. Relu à la date du
//    2011-12-31 pour l'établir, plutôt que récité.
//
// 3. LE MONTANT N'EST PAS DANS `D. 8222-5`, ET LE CODE DU PRODUIT LE DIT
//    ENCORE. Le commentaire d'en-tête de `vigilance.ts` attribue « tout
//    contrat ≥ 5 000 € HT » à « art. D. 8222-5 1° ». `D. 8222-5` ne porte
//    aucun montant : il porte le rythme et la liste des pièces. Le montant est
//    dans `R. 8222-1`, et les ÉCRANS le disent correctement depuis la
//    correction du 2026-08-28 — la prose de `prestataires/page.tsx` sépare
//    déjà les trois articles. Seul le commentaire du module est resté sur
//    l'attribution d'avant. Rien n'est faux à l'écran ; la note interne du
//    code est en retard sur lui.
//
// 4. LE PRODUIT NE DÉTIENT NI LE MONTANT NI LA DATE DE CONCLUSION. Ce sont
//    exactement les deux données dont `R. 8222-1` et `D. 8222-5` font dépendre
//    l'assujettissement et son point de départ. `prestataireSchema`
//    (`src/lib/prestataires/schema.ts`) n'a ni l'un ni l'autre : il n'y a pas
//    de contrat dans le modèle, seulement un prestataire. Conséquence, dans le
//    sens le moins grave : la vigilance est proposée pour TOUT prestataire, y
//    compris celui dont la prestation annuelle est de 400 € — au-dessous du
//    seuil, où le texte n'impose rien. C'est une sur-application, et elle est
//    visible par celui qui la subit (il lit « pour tout contrat d'au moins
//    5 000 € HT » juste au-dessus), là où sous-appliquer ne se verrait pas.
//
// 5. TROIS EXIGENCES DE `D. 8222-5` NE SONT SERVIES PAR RIEN. (a) L'attestation
//    doit dater « de moins de six mois » à la remise — le produit stocke une
//    date de fin de validité, jamais une date d'émission, et ne peut donc pas
//    le vérifier. (b) Le donneur d'ordre « s'assure de l'authenticité auprès
//    de l'organisme de recouvrement » : aucune surface ne le demande ni ne le
//    trace. (c) Le 2° n'exige un extrait d'immatriculation QUE lorsque celle-ci
//    est obligatoire ou pour une profession réglementée, et il offre QUATRE
//    pièces au choix — K bis, extrait RNE, devis ou correspondance
//    professionnelle portant les mentions, accusé de réception électronique du
//    greffe. Le produit n'a qu'un champ « Kbis », donc il réclame une pièce là
//    où trois autres suffiraient. Il ne fabrique pas d'obligation — il n'en
//    tire aucun statut, et c'est ce qui le sauve — mais il resserre le choix
//    que le texte laisse.
//
// 6. L'ASSURANCE RC PRO N'EST PAS DANS CE CHAPITRE. `D. 8222-5` énumère deux
//    catégories de pièces, et aucune n'est une police d'assurance. Le module
//    le dit déjà (« pas de périodicité légale — la police est contractuelle »)
//    et c'est confirmé à la source : la RC Pro est suivie sous le bandeau
//    « Art. L. 8222-1 CT » sans que cet article ni son décret la demandent.
//    Ce n'est pas une erreur de droit tant que rien n'en tire de conclusion
//    légale, mais le voisinage à l'écran est ce qui pourrait la faire lire
//    comme une pièce légale.
//
// 7. LA SOLIDARITÉ FINANCIÈRE EXISTE, ET LE PRODUIT N'EN DIT RIEN. `L. 8222-2`
//    la porte : qui méconnaît `L. 8222-1` est tenu solidairement des impôts,
//    cotisations, aides publiques remboursées et rémunérations dus par celui
//    qui a fait l'objet d'un procès-verbal, à due proportion (`L. 8222-3`).
//    Balayage de `src/` le 2026-09-02 : zéro occurrence de « solidaire » ou
//    « solidarité ». La page prestataires écrit « cette trace écrite est ce
//    qui vous distingue » — vrai, et volontairement en deçà. Ce corpus
//    consigne le texte ; il ne demande pas de l'afficher.
//
// ── SUR LE PÉRIMÈTRE, QUI N'EST PAS TRANCHÉ ICI ──────────────────────────
//
// Ce chapitre est du droit du travail NON santé-sécurité : huitième partie,
// lutte contre le travail illégal, et non quatrième partie. `CLAUDE.md` écarte
// le « RH non-SST ». Mais le produit SERT la vigilance — module, écrans,
// alertes — et il la cite vingt fois. Le dépouillement ne tranche pas : il
// consigne, et la décision revient à la propriétaire.
//
// À noter pour cette décision : `EXCLUSIONS` (`perimetre.ts`) est un ensemble
// FERMÉ de quatre motifs, et AUCUN ne dit « RH non-SST ». Un article qu'on
// voudrait écarter à ce titre ne peut donc pas le dire dans le vocabulaire du
// dépouillement — il retomberait sur `sans_objet`, qui signifie autre chose.
// C'est ce qui arrive ici à `L. 8221-5`. Le module `perimetre.ts` n'est pas
// touché par ce lot : ajouter une exclusion « se discute et s'ajoute là »,
// dit son commentaire, et ce n'est pas au dépouilleur de le faire seul.
//
// ── SUR LA RÈGLE DE LECTURE (un article modifié se lit avec son texte) ───
//
// Deux versions récentes appelaient l'ouverture de leur texte modificateur.
//
// `D. 8222-5`, version du 2023-01-01, décret n° 2022-1015 du 19 juillet 2022
// (art. 9) : OUVERT. Objet — droits dus au titre du Registre national des
// entreprises et adaptation des registres supprimés. Il ne modifie que quatre
// articles du code du travail : `D. 5213-53`, `D. 8222-5`, `D. 8261-1` et
// `D. 8271-1`. AUCUN de la quatrième partie, donc rien en santé-sécurité.
// Résultat négatif, consigné parce qu'un résultat négatif consigné est ce qui
// évite de rouvrir le texte au lot suivant.
//
// `L. 8221-3`, version du 2023-01-01, ordonnance n° 2021-1189 du 15 septembre
// 2021 (art. 35) : même réforme, le RNE remplaçant le répertoire des métiers.
// La modification est de vocabulaire de registre, visible dans le 1° de
// l'article. Le texte n'a PAS été ouvert en entier — c'est le seul manquement
// à la règle dans ce lot, et il est écrit ici plutôt que masqué.
//
// Lecture : `agent_verbatim`, relevés sur Légifrance le 2026-09-02, sur les
// pages d'article (`article_lc`) recoupées avec les pages de section rendues
// côté serveur. Chaque identifiant `LEGIARTI` porté ci-dessous a été ouvert et
// le numéro d'article rendu par la page a été comparé à celui de l'entrée :
// aucune URL n'est déduite d'une autre.
//
// AUCUNE OBLIGATION N'EST ENCODÉE PAR CE LOT. `obligations: []` partout.

import type { Corpus } from "./types";

/**
 * Le chapitre Ier du titre II de la huitième partie, partie législative —
 * seulement ce que la vigilance oblige à lire.
 *
 * `articles_cites` et non `integral` : le chapitre compte neuf articles
 * (`L. 8221-1`, `-2`, `-3`, `-4`, `-5`, `-6`, `-6-1`, `-7`, `-8`) et quatre
 * sont ici. Les deux qui comptent sont `L. 8221-3` et `L. 8221-5`, parce que
 * `L. 8222-1` y renvoie nommément ; `L. 8221-1` et `L. 8221-2` les encadrent
 * et ont été lus dans le même mouvement. Rien n'est dit des cinq autres —
 * dont `L. 8221-6` (présomption de non-salariat) et `L. 8221-6-1`, qui
 * n'entrent pas dans le renvoi de `L. 8222-1`.
 */
export const CODE_TRAVAIL_TRAVAIL_DISSIMULE: Corpus = {
  id: "code-travail-travail-dissimule",
  intitule: "Code du travail — le travail dissimulé, défini",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006178267/",
  etendue: "articles_cites",
  portee:
    "Chapitre Ier « Interdictions » du titre II (travail dissimulé), partie législative, dans la seule mesure où la vigilance du donneur d'ordre y renvoie : l'interdiction elle-même et ses trois branches (L. 8221-1), l'exception des travaux d'urgence (L. 8221-2), et les DEUX DÉFINITIONS que L. 8222-1 vise nommément — dissimulation d'activité (L. 8221-3) et dissimulation d'emploi salarié (L. 8221-5). Aucun de ces articles n'impose quoi que ce soit à un exploitant au titre de la santé-sécurité : ce sont des qualifications pénales, adressées à celui qui dissimule, et non des obligations d'employeur assorties d'une échéance. Le produit les cite pour dire CE QUE la vigilance vérifie ; il ne peut rien en tirer de vérifiable chez son utilisateur.",
  articles: [
    {
      ref: "L. 8221-1",
      intitule: "Interdictions",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006904815",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Interdit le travail dissimulé, la publicité qui le favorise sciemment, et le fait de recourir sciemment aux services de celui qui l'exerce.",
      citationCle:
        "Sont interdits : 1° Le travail totalement ou partiellement dissimulé, défini et exercé dans les conditions prévues aux articles L. 8221-3 et L. 8221-5 ; 2° La publicité, par quelque moyen que ce soit, tendant à favoriser, en toute connaissance de cause, le travail dissimulé ; 3° Le fait de recourir sciemment, directement ou par personne interposée, aux services de celui qui exerce un travail dissimulé.",
      statut: "sans_objet",
      motif:
        "C'est une interdiction pénale, pas une obligation à inscrire au calendrier : elle n'a ni périodicité, ni pièce à produire, ni preuve datable. Elle est lue ici parce que son 3° — recourir sciemment aux services de celui qui exerce un travail dissimulé — est le risque même contre lequel la vigilance de L. 8222-1 protège, et parce que son 1° désigne les deux définitions du renvoi. Le produit n'a rien à en dériver : il ne peut pas constater qu'un exploitant s'abstient de quelque chose.",
    },
    {
      ref: "L. 8221-2",
      intitule: "Travaux d'urgence exclus des interdictions",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006904816",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Exclut des interdictions du chapitre les travaux d'urgence nécessaires pour prévenir les accidents imminents ou organiser les mesures de sauvetage.",
      citationCle:
        "Sont exclus des interdictions prévues au présent chapitre, les travaux d'urgence dont l'exécution immédiate est nécessaire pour prévenir les accidents imminents ou organiser les mesures de sauvetage.",
      statut: "sans_objet",
      motif:
        "Article d'exception : il retire du champ des interdictions, il n'ajoute rien. Aucune obligation, aucune échéance, aucune pièce. Lu parce qu'une exception non lue se redécouvre au mauvais moment, et parce que celle-ci touche précisément le terrain du produit — les travaux d'urgence de prévention d'un accident imminent, qui sont ceux qu'un exploitant commande dans la panique après une panne.",
    },
    {
      ref: "L. 8221-3",
      intitule: "Travail dissimulé par dissimulation d'activité",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000044056622",
      versionEnVigueur: "2023-01-01",
      modifiePar: {
        // Pas d'URL : l'identifiant JORF de cette ordonnance n'a pas été
        // relevé sur Légifrance, et une URL plausible fabriquée serait pire
        // que son absence. Le texte n'a pas non plus été ouvert en entier —
        // voir la note « règle de lecture » en tête de fichier, qui le dit
        // plutôt que de le masquer.
        texte: "Ordonnance n° 2021-1189 du 15 septembre 2021 - art. 35",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Définit le travail dissimulé par dissimulation d'activité : exercice à but lucratif par qui se soustrait intentionnellement à l'immatriculation, aux déclarations sociales ou fiscales, ou se prévaut à tort du détachement.",
      citationCle:
        "Est réputé travail dissimulé par dissimulation d'activité, l'exercice à but lucratif d'une activité de production, de transformation, de réparation ou de prestation de services ou l'accomplissement d'actes de commerce par toute personne qui, se soustrayant intentionnellement à ses obligations : 1° Soit n'a pas demandé son immatriculation au registre national des entreprises en tant qu'entreprise du secteur des métiers et de l'artisanat ou au registre du commerce et des sociétés, lorsque celle-ci est obligatoire, ou a poursuivi son activité après refus d'immatriculation, ou postérieurement à une radiation ; 2° Soit n'a pas procédé aux déclarations qui doivent être faites aux organismes de protection sociale ou à l'administration fiscale en vertu des dispositions légales en vigueur. Cette situation peut notamment résulter de la non-déclaration d'une partie de son chiffre d'affaires ou de ses revenus ou de la continuation d'activité après avoir été radié par les organismes de protection sociale en application de l'article L. 613-4 du code de la sécurité sociale ; 3° Soit s'est prévalue des dispositions applicables au détachement de salariés lorsque l'employeur de ces derniers exerce dans l'Etat sur le territoire duquel il est établi des activités relevant uniquement de la gestion interne ou administrative, ou lorsque son activité est réalisée sur le territoire national de façon habituelle, stable et continue.",
      statut: "sans_objet",
      motif:
        "UNE DÉFINITION N'EST PAS UNE OBLIGATION D'EXPLOITANT, et c'est le point à ne pas manquer sur cet article : il dit ce qu'EST une infraction, il ne prescrit rien à l'utilisateur du produit. Son destinataire est celui qui dissimule — le prestataire — et non le donneur d'ordre qui le vérifie. Ce que le donneur d'ordre doit faire est écrit ailleurs, à L. 8222-1, et les pièces qui l'en acquittent à D. 8222-5. La correspondance entre les deux se lit dans le 1° et le 2° de l'article : ce sont exactement l'immatriculation (extrait K bis ou RNE) et les déclarations sociales (attestation de vigilance) que le décret fait réclamer. L'article fonde donc la prose des écrans, il ne fonde aucune échéance.",
    },
    {
      ref: "L. 8221-5",
      intitule: "Travail dissimulé par dissimulation d'emploi salarié",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033024966",
      versionEnVigueur: "2016-08-10",
      modifiePar: {
        texte: "LOI n° 2016-1088 du 8 août 2016 - art. 105",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Définit le travail dissimulé par dissimulation d'emploi salarié : défaut intentionnel de déclaration préalable à l'embauche, de bulletin de paie ou d'heures réellement accomplies, ou de déclarations de salaires et cotisations.",
      citationCle:
        "Est réputé travail dissimulé par dissimulation d'emploi salarié le fait pour tout employeur : 1° Soit de se soustraire intentionnellement à l'accomplissement de la formalité prévue à l'article L. 1221-10, relatif à la déclaration préalable à l'embauche ; 2° Soit de se soustraire intentionnellement à la délivrance d'un bulletin de paie ou d'un document équivalent défini par voie réglementaire, ou de mentionner sur le bulletin de paie ou le document équivalent un nombre d'heures de travail inférieur à celui réellement accompli […] ; 3° Soit de se soustraire intentionnellement aux déclarations relatives aux salaires ou aux cotisations sociales assises sur ceux-ci auprès des organismes de recouvrement des contributions et cotisations sociales ou de l'administration fiscale en vertu des dispositions légales.",
      statut: "sans_objet",
      motif:
        "Définition, comme L. 8221-3 — mais celle-ci vise « tout employeur », donc aussi l'utilisateur du produit, et c'est ce qui la rend délicate à classer. Elle ne crée toutefois aucune obligation propre : les trois formalités qu'elle protège sont écrites ailleurs (déclaration préalable à l'embauche L. 1221-10, bulletin de paie L. 3243-2, déclarations de salaires), et ces trois-là sont expressément hors périmètre — CLAUDE.md écarte le RH non-SST, DPAE nommément. L'article est donc lu, dans le périmètre du dépouillement, et sans effet sur le calendrier. À SAVOIR pour la relecture : aucun des quatre motifs de EXCLUSIONS ne dit « RH non-SST », si bien que hors_perimetre était indisponible ; cet article est le cas qui le montre.",
    },
  ],
};

/**
 * Le chapitre II du titre II de la huitième partie, partie législative.
 *
 * `integral` : le chapitre compte exactement sept articles — `L. 8222-1` à
 * `L. 8222-7` —, et les sept sont ici. Deux imposent quelque chose au donneur
 * d'ordre que le référentiel ne porte pas (`L. 8222-1`, `L. 8222-5`), un
 * s'adresse aux personnes morales de droit public, et les quatre autres
 * décrivent la conséquence du manquement ou renvoient au décret.
 */
export const CODE_TRAVAIL_VIGILANCE: Corpus = {
  id: "code-travail-vigilance",
  intitule:
    "Code du travail — obligations et solidarité financière du donneur d'ordre (partie législative)",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000006178268/",
  etendue: "integral",
  portee:
    "Chapitre II « Obligations et solidarité financière des donneurs d'ordre et des maîtres d'ouvrage » du titre II (travail dissimulé), partie législative : l'obligation de vérifier son cocontractant à la conclusion du contrat et périodiquement jusqu'à sa fin (L. 8222-1), la solidarité financière encourue à défaut et son assiette (L. 8222-2 et L. 8222-3), la règle applicable au cocontractant établi à l'étranger (L. 8222-4), l'injonction due après signalement écrit (L. 8222-5), le régime propre aux personnes morales de droit public (L. 8222-6) et le renvoi au décret en Conseil d'État (L. 8222-7). CE CHAPITRE NE PORTE NI MONTANT NI PÉRIODICITÉ : L. 8222-1 dit « un montant minimum » et « périodiquement », et rien de plus. Le seuil est réglementaire (R. 8222-1), le rythme aussi (D. 8222-5) — c'est le corpus voisin. Le produit sert cette obligation par son module Prestataires, hors du référentiel de conformité : aucune Obligation ne s'y adosse.",
  articles: [
    {
      ref: "L. 8222-1",
      intitule: "Vérifications à la charge du donneur d'ordre",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024197683",
      versionEnVigueur: "2011-06-18",
      modifiePar: {
        texte: "LOI n° 2011-672 du 16 juin 2011 - art. 73",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Toute personne vérifie, lors de la conclusion d'un contrat d'un montant minimum et périodiquement jusqu'à la fin de son exécution, que son cocontractant s'acquitte des formalités des articles L. 8221-3 et L. 8221-5.",
      citationCle:
        "Toute personne vérifie lors de la conclusion d'un contrat dont l'objet porte sur une obligation d'un montant minimum en vue de l'exécution d'un travail, de la fourniture d'une prestation de services ou de l'accomplissement d'un acte de commerce, et périodiquement jusqu'à la fin de l'exécution du contrat, que son cocontractant s'acquitte : 1° des formalités mentionnées aux articles L. 8221-3 et L. 8221-5 ; 2° de l'une seulement des formalités mentionnées au 1°, dans le cas d'un contrat conclu par un particulier pour son usage personnel, celui de son conjoint, partenaire lié par un pacte civil de solidarité, concubin, de ses ascendants ou descendants. Les modalités selon lesquelles sont opérées les vérifications imposées par le présent article sont précisées par décret.",
      statut: "obligation_manquante",
      cause: "relation_tiers",
      toucheLaCible: true,
      motif:
        "L'article impose une vérification récurrente à tout donneur d'ordre, et le référentiel de conformité ne porte AUCUNE Obligation qui s'y adosse — vérifié le 2026-09-02 : aucune ReferenceLegale ne cite L. 8222-1. Le produit la sert quand même, mais par un chemin parallèle : le module Prestataires (annuaire, pièces, alertes d'expiration), qui vit hors du référentiel et n'apparaît donc ni au calendrier des échéances, ni dans les comptes de couverture, ni dans le dossier de contrôle au même titre que les autres obligations. Ce n'est pas un oubli d'encodage, c'est une obligation servie par une autre mécanique — et le dire est exactement ce que ce statut existe pour faire. À noter que l'article lui-même ne se suffit pas : il dit « un montant minimum » et « périodiquement » sans les chiffrer, et renvoie au décret pour les modalités.",
      bloquePar:
        "Trois choses, distinctes. (1) Le porteur : l'ADR-022 en connaît trois — établissement, salarié, équipement — et un prestataire n'est aucun des trois ; la vigilance porte sur une RELATION, pas sur une chose de l'établissement. (2) Le déclencheur : l'assujettissement dépend du montant de l'opération (R. 8222-1) et l'échéance de la date de conclusion (D. 8222-5), deux données que `prestataireSchema` ne détient pas — il n'y a pas de contrat dans le modèle, seulement un prestataire. (3) Le périmètre lui-même, non tranché : ce chapitre est du droit du travail non santé-sécurité, et CLAUDE.md écarte le RH non-SST.",
    },
    {
      ref: "L. 8222-2",
      intitule: "Solidarité financière du donneur d'ordre",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006904824",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Qui méconnaît L. 8222-1, ou recourt aux services de celui qui exerce un travail dissimulé, est tenu solidairement au paiement des impôts, cotisations, aides publiques et rémunérations dus par celui-ci.",
      citationCle:
        "Toute personne qui méconnaît les dispositions de l'article L. 8222-1, ainsi que toute personne condamnée pour avoir recouru directement ou par personne interposée aux services de celui qui exerce un travail dissimulé, est tenue solidairement avec celui qui a fait l'objet d'un procès-verbal pour délit de travail dissimulé : 1° Au paiement des impôts, taxes et cotisations obligatoires ainsi que des pénalités et majorations dus par celui-ci au Trésor ou aux organismes de protection sociale ; 2° Le cas échéant, au remboursement des sommes correspondant au montant des aides publiques dont il a bénéficié ; 3° Au paiement des rémunérations, indemnités et charges dues par lui à raison de l'emploi de salariés n'ayant pas fait l'objet de l'une des formalités prévues aux articles L. 1221-10, relatif à la déclaration préalable à l'embauche et L. 3243-2, relatif à la délivrance du bulletin de paie.",
      statut: "sans_objet",
      motif:
        "C'est la CONSÉQUENCE du manquement à L. 8222-1, pas une obligation de plus : aucune diligence à accomplir, aucune pièce à produire, aucune échéance. On ne peut pas s'y conformer — on s'y expose ou non selon qu'on a fait ou non les vérifications de l'article précédent. Consigné parce que c'est le seul article du chapitre qui dise l'enjeu réel de la vigilance, et parce que la question a été posée de savoir si le produit l'annonce : il ne l'annonce PAS. Balayage de src/ le 2026-09-02 : zéro occurrence de « solidaire » ou « solidarité ». La page prestataires écrit « en cas de travail dissimulé chez lui, cette trace écrite est ce qui vous distingue », ce qui décrit l'effet sans nommer le mécanisme. Ce corpus consigne le texte, il ne demande pas de l'afficher.",
    },
    {
      ref: "L. 8222-3",
      intitule: "Assiette des sommes dues au titre de la solidarité",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006904825",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les sommes exigibles au titre de L. 8222-2 sont déterminées à due proportion de la valeur des travaux, des services, du bien vendu et de la rémunération en vigueur dans la profession.",
      citationCle:
        "Les sommes dont le paiement est exigible en application de l'article L. 8222-2 sont déterminées à due proportion de la valeur des travaux réalisés, des services fournis, du bien vendu et de la rémunération en vigueur dans la profession.",
      statut: "sans_objet",
      motif:
        "Règle de calcul de la sanction civile de L. 8222-2 : elle borne ce que le donneur d'ordre peut devoir, elle ne lui prescrit rien. Aucune échéance, aucune pièce, rien qu'un exploitant puisse faire ou omettre. Lue avec L. 8222-2 parce qu'une conséquence sans son assiette se raconte à l'écran plus grosse qu'elle n'est.",
    },
    {
      ref: "L. 8222-4",
      intitule: "Cocontractant établi ou domicilié à l'étranger",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006904826",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Pour un cocontractant établi ou domicilié à l'étranger, les obligations vérifiées sont celles de la réglementation d'effet équivalent de son pays d'origine et celles applicables au titre de son activité en France.",
      citationCle:
        "Lorsque le cocontractant intervenant sur le territoire national est établi ou domicilié à l'étranger, les obligations dont le respect fait l'objet de vérifications sont celles qui résultent de la réglementation d'effet équivalent de son pays d'origine et celles qui lui sont applicables au titre de son activité en France.",
      statut: "sans_objet",
      motif:
        "Article de désignation : il dit SUR QUOI portent les vérifications quand le cocontractant est étranger, il n'en crée pas de nouvelles. L'obligation reste celle de L. 8222-1, et les pièces qui en acquittent sont énumérées par D. 8222-7 — c'est là, dans le corpus réglementaire voisin, qu'est consigné ce que le produit ne sait pas faire pour un prestataire étranger. Le porter ici en double compterait deux fois le même manque.",
    },
    {
      ref: "L. 8222-5",
      intitule: "Injonction après signalement écrit",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000029236559",
      versionEnVigueur: "2014-07-12",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le donneur d'ordre informé par écrit qu'un cocontractant, sous-traitant ou subdélégataire est en situation irrégulière lui enjoint aussitôt de faire cesser sans délai cette situation ; à défaut il est tenu solidairement.",
      citationCle:
        "Le maître de l'ouvrage ou le donneur d'ordre, informé par écrit par un agent de contrôle mentionné à l'article L. 8271-7 ou par un syndicat ou une association professionnels ou une institution représentative du personnel, de l'intervention du cocontractant, d'un sous-traitant ou d'un subdélégataire en situation irrégulière au regard des formalités mentionnées aux articles L. 8221-3 et L. 8221-5 enjoint aussitôt à son cocontractant de faire cesser sans délai cette situation. A défaut, il est tenu solidairement avec son cocontractant au paiement des impôts, taxes, cotisations, rémunérations et charges mentionnés aux 1° à 3° de l'article L. 8222-2, dans les conditions fixées à l'article L. 8222-3.",
      statut: "obligation_manquante",
      cause: "evenement",
      toucheLaCible: true,
      motif:
        "Obligation d'agir pleine et entière, distincte de celle de L. 8222-1 : elle ne naît pas d'un contrat mais d'un SIGNALEMENT ÉCRIT reçu, et elle vaut alors même que toutes les vérifications périodiques ont été faites. Elle est de forme — lettre recommandée avec avis de réception, R. 8222-2 — et de délai : « aussitôt », « sans délai ». Elle s'étend au sous-traitant et au subdélégataire, c'est-à-dire à des tiers que l'annuaire des prestataires ne connaît pas. Le référentiel ne la porte pas, et aucune surface du produit ne la mentionne : un dirigeant qui reçoit ce courrier ne trouvera rien dans l'outil qui lui dise quoi faire ni sous quelle forme. C'est le manque le moins visible du chapitre, parce qu'il ne se déclenche jamais tant que rien n'arrive.",
      bloquePar:
        "Le déclencheur événementiel, absent du modèle — même blocage que R. 4141-8, R. 4141-12 et L. 4121-3-1 VI : l'ADR-022 nomme l'axe et s'arrête là. L'événement est ici la réception d'un courrier d'un agent de contrôle, d'un syndicat ou d'une institution représentative du personnel, que le produit ne peut ni observer ni dater. L'encoder en état permanent afficherait au calendrier de tous une injonction que presque personne ne doit.",
    },
    {
      ref: "L. 8222-6",
      intitule: "Régime des personnes morales de droit public",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000028394725",
      versionEnVigueur: "2013-12-25",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "La personne morale de droit public informée de la situation irrégulière d'une entreprise avec laquelle elle a contracté lui enjoint d'y mettre fin ; l'entreprise dispose de deux mois pour en apporter la preuve, faute de quoi le contrat peut être rompu.",
      citationCle:
        "Sans préjudice des articles L. 8222-1 à L. 8222-3, toute personne morale de droit public ayant contracté avec une entreprise, informée par écrit par un agent de contrôle de la situation irrégulière de cette entreprise au regard des formalités mentionnées aux articles L. 8221-3 et L. 8221-5, enjoint aussitôt à cette entreprise de faire cesser sans délai cette situation.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "L'article s'adresse aux personnes morales de droit public — État, collectivités, établissements publics — en tant qu'acheteuses. La cible du produit est l'exploitant privé d'un établissement de restauration, de commerce de détail ou de bureau, de 1 à 50 salariés : il n'est jamais le destinataire de cet article. Il pourrait en être le sujet, comme entreprise mise en demeure — mais alors il subit la procédure, il ne l'exécute pas, ce qui est exactement le sens de cette exclusion.",
    },
    {
      ref: "L. 8222-7",
      intitule: "Renvoi au décret en Conseil d'État",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006904829",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Un décret en Conseil d'État détermine les conditions d'application du chapitre.",
      citationCle:
        "Un décret en Conseil d'Etat détermine les conditions d'application des dispositions du présent chapitre.",
      statut: "sans_objet",
      motif:
        "Article d'habilitation, sans prescription propre. Il est lu, et écrit ici, parce qu'il désigne le texte qui porte TOUT ce que le produit affiche de chiffré — le seuil de 5 000 € HT et le rythme semestriel ne sont dans aucun article L. 8222-*. Le décret pris sur son fondement est le chapitre II de la partie réglementaire, dépouillé intégralement dans le corpus code-travail-vigilance-modalites. C'est le renvoi que la lecture doit suivre, et ne pas le consigner laisserait croire que le chapitre législatif épuise la matière.",
    },
  ],
};

/**
 * Le chapitre II du titre II de la huitième partie, partie réglementaire.
 *
 * `integral` : le chapitre compte exactement huit articles, en trois
 * sections — dispositions communes (`R. 8222-1` à `R. 8222-3`), cocontractant
 * établi en France (`D. 8222-4`, `D. 8222-5`), cocontractant établi à
 * l'étranger (`D. 8222-6` à `D. 8222-8`) —, et les huit sont ici. C'est le
 * corpus qui porte les deux chiffres du produit : le seuil et le rythme.
 */
export const CODE_TRAVAIL_VIGILANCE_MODALITES: Corpus = {
  id: "code-travail-vigilance-modalites",
  intitule:
    "Code du travail — modalités des vérifications du donneur d'ordre (partie réglementaire)",
  url: "https://www.legifrance.gouv.fr/codes/section_lc/LEGITEXT000006072050/LEGISCTA000018500606/",
  etendue: "integral",
  portee:
    "Chapitre II du titre II (travail dissimulé), partie réglementaire, pris pour l'application de L. 8222-7 : le seuil de montant au-delà duquel les vérifications sont obligatoires (R. 8222-1 — 5 000 euros HORS TAXES depuis le 2015-05-01), la forme des injonctions (R. 8222-2, R. 8222-3), et les listes de pièces qui acquittent le donneur d'ordre, selon que le cocontractant est établi en France (D. 8222-4, D. 8222-5) ou à l'étranger (D. 8222-6 à D. 8222-8). C'EST ICI, ET NULLE PART AILLEURS, QU'EST LE RYTHME SEMESTRIEL : « lors de la conclusion et tous les six mois jusqu'à la fin de son exécution » (D. 8222-5), avec une attestation « datant de moins de six mois » dont le donneur d'ordre s'assure de l'authenticité auprès de l'organisme de recouvrement. Le produit applique bien six mois, mais les compte depuis la dernière modification de la fiche, non depuis la conclusion ni depuis la remise — voir l'entrée D. 8222-5.",
  articles: [
    {
      ref: "R. 8222-1",
      intitule: "Montant à partir duquel les vérifications sont obligatoires",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000030422273",
      versionEnVigueur: "2015-05-01",
      modifiePar: {
        texte: "Décret n° 2015-364 du 30 mars 2015 - art. 13",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les vérifications prévues à L. 8222-1 sont obligatoires pour toute opération d'un montant au moins égal à 5 000 euros hors taxes.",
      citationCle:
        "Les vérifications à la charge de la personne qui conclut un contrat, prévues à l'article L. 8222-1, sont obligatoires pour toute opération d'un montant au moins égal à 5 000 euros hors taxes.",
      statut: "sans_objet",
      motif:
        "L'article ne crée aucune obligation : il fixe le seuil d'assujettissement de celle de L. 8222-1. Aucune échéance, aucune pièce. Il est ici pour deux raisons. LE CHIFFRE A BOUGÉ, et il fallait le vérifier plutôt que le réciter : la version en vigueur du 2008-05-01 au 2015-05-01 disait « 3 000 euros », sans « hors taxes » ; le décret n° 2015-364 du 30 mars 2015 a changé le montant ET son assiette. Les trois surfaces du produit qui écrivent « 5 000 € HT » écrivent donc les deux justes, et l'attribuent au bon article. ET LE PRODUIT NE DÉTIENT AUCUN MONTANT : `prestataireSchema` ne porte ni valeur de contrat ni date de conclusion, si bien que la vigilance est proposée pour tout prestataire de l'annuaire, y compris au-dessous du seuil. Sur-application assumable — le dirigeant lit « pour tout contrat d'au moins 5 000 € HT » juste au-dessus et peut s'en apercevoir, là où sous-appliquer ne se verrait pas.",
    },
    {
      ref: "R. 8222-2",
      intitule: "Forme de l'injonction du donneur d'ordre",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018520710",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'injonction du premier alinéa de L. 8222-5 est réalisée par lettre recommandée avec avis de réception.",
      citationCle:
        "L'injonction adressée au cocontractant par le maître d'ouvrage ou le donneur d'ordre, en application du premier alinéa de l'article L. 8222-5, est réalisée par lettre recommandée avec avis de réception.",
      statut: "sans_objet",
      motif:
        "Règle de forme, sans obligation autonome : elle dit COMMENT s'exécute l'injonction de L. 8222-5, pas qu'il faut l'exécuter. Le manque est consigné une fois, sur L. 8222-5, avec la mention de cette forme — le dédoubler ferait compter deux fois la même obligation absente. Lu et conservé au corpus parce qu'un dépouillement intégral énumère aussi ce qui ne prescrit rien.",
    },
    {
      ref: "R. 8222-3",
      intitule: "Forme de l'injonction de la personne publique",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018520708",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "L'injonction de la personne morale de droit public prévue à L. 8222-6 est réalisée par lettre recommandée avec avis de réception ; l'entreprise dispose de quinze jours pour répondre.",
      citationCle:
        "L'injonction adressée à l'entreprise en situation irrégulière par la personne morale de droit public, en application du premier alinéa de l'article L. 8222-6, est réalisée par lettre recommandée avec avis de réception. L'entreprise mise en demeure dispose d'un délai de quinze jours pour répondre à la personne publique.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "Modalité de la procédure de L. 8222-6, qui s'adresse aux personnes morales de droit public. L'exploitant privé peut en être le sujet — c'est lui, le cas échéant, l'entreprise mise en demeure qui dispose de quinze jours — mais il subit alors la procédure au lieu de l'exécuter. Écarté pour la même raison que l'article dont il porte la forme, et pas pour une autre.",
    },
    {
      ref: "D. 8222-4",
      intitule: "Vérifications du particulier — cocontractant en France",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018520704",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le particulier qui contracte pour son usage personnel est réputé avoir procédé aux vérifications s'il se fait remettre, à la conclusion et tous les six mois, l'un des documents énumérés à D. 8222-5.",
      citationCle:
        "Le particulier qui contracte pour son usage personnel, celui de son conjoint, partenaire lié par un pacte civil de solidarité, concubin ou de ses ascendants ou descendants, est considéré comme ayant procédé aux vérifications imposées par l'article L. 8222-1 s'il se fait remettre, par son cocontractant, lors de la conclusion du contrat et tous les six mois jusqu'à la fin de son exécution, l'un des documents énumérés à l'article D. 8222-5.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "L'article vise le PARTICULIER contractant pour son usage personnel ou celui de ses proches — jamais un employeur agissant pour son établissement. C'est un régime allégé, l'un seulement des documents suffisant là où D. 8222-5 en demande deux catégories, et il est sans destinataire dans la cible du produit. Utile à lire tout de même : il confirme que le rythme semestriel est commun aux deux régimes et ne tient pas à la qualité du donneur d'ordre.",
    },
    {
      ref: "D. 8222-5",
      intitule:
        "Pièces à se faire remettre — cocontractant établi en France",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000046078939",
      versionEnVigueur: "2023-01-01",
      modifiePar: {
        texte: "Décret n° 2022-1015 du 19 juillet 2022 - art. 9",
        url: "https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000046061594",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le donneur d'ordre est réputé avoir procédé aux vérifications s'il se fait remettre, lors de la conclusion et tous les six mois jusqu'à la fin de l'exécution, une attestation de vigilance de moins de six mois dont il vérifie l'authenticité, et, lorsque l'immatriculation est obligatoire, l'un de quatre documents d'immatriculation.",
      citationCle:
        "La personne qui contracte, lorsqu'elle n'est pas un particulier répondant aux conditions fixées par l'article D. 8222-4, est considérée comme ayant procédé aux vérifications imposées par l'article L. 8222-1 si elle se fait remettre par son cocontractant, lors de la conclusion et tous les six mois jusqu'à la fin de son exécution : 1° Une attestation de fourniture des déclarations sociales et de paiement des cotisations et contributions de sécurité sociale prévue à l'article L. 243-15 émanant de l'organisme de protection sociale chargé du recouvrement des cotisations et des contributions datant de moins de six mois dont elle s'assure de l'authenticité auprès de l'organisme de recouvrement des cotisations de sécurité sociale. 2° Lorsque l'immatriculation du cocontractant au registre du commerce et des sociétés ou au Registre national des entreprises en tant qu'entreprise du secteur des métiers et de l'artisanat est obligatoire ou lorsqu'il s'agit d'une profession réglementée, l'un des documents suivants : a) Un extrait de l'inscription au registre du commerce et des sociétés (K ou K bis) ; b) Un extrait d'immatriculation au Registre national des entreprises en tant qu'entreprise du secteur des métiers et de l'artisanat ; c) Un devis, un document publicitaire ou une correspondance professionnelle, à condition qu'y soient mentionnés le nom ou la dénomination sociale, l'adresse complète et le numéro d'immatriculation au registre du commerce et des sociétés ou au Registre national des entreprises en tant qu'entreprise du secteur des métiers et de l'artisanat ou à une liste ou un tableau d'un ordre professionnel, ou la référence de l'agrément délivré par l'autorité compétente ; d) L'accusé de réception électronique mentionné à l'article R. 123-6 du code de commerce, émanant du greffier du tribunal de commerce compétent ou de la chambre des métiers et de l'artisanat compétente.",
      statut: "obligation_manquante",
      cause: "relation_tiers",
      toucheLaCible: true,
      motif:
        "L'article central du module Prestataires, et le seul du dossier qui chiffre quoi que ce soit : « lors de la conclusion et tous les six mois jusqu'à la fin de son exécution ». LE RYTHME DU PRODUIT EST CELUI DU TEXTE — MOIS_RENOUVELLEMENT_URSSAF vaut 6 — MAIS SON ANCRAGE NE L'EST PAS : `opposabiliteUrssaf()` compte les six mois depuis `prestataire.updatedAt`, la dernière modification de la fiche, quand le texte les compte depuis la conclusion puis depuis chaque remise. La déduction n'est valable que dans un sens, le module le dit, et le sens est celui qui alerte TARD : toute retouche de la fiche — un téléphone, une note — repousse de six mois une limite qu'aucune remise d'attestation n'a renouvelée. Trois exigences de l'article ne sont par ailleurs servies par rien : l'attestation doit dater de MOINS DE SIX MOIS à la remise (le produit stocke une fin de validité, jamais une date d'émission), le donneur d'ordre doit S'ASSURER DE L'AUTHENTICITÉ auprès de l'URSSAF (aucune surface ne le demande ni ne le trace), et le 2° n'exige un extrait d'immatriculation que si celle-ci est obligatoire, en offrant QUATRE pièces au choix (le produit n'a qu'un champ Kbis). Aucune de ces exigences ne se solde aujourd'hui, et aucune Obligation du référentiel ne les porte.",
      bloquePar:
        "Le même triple blocage que L. 8222-1 — pas de porteur pour une relation contractuelle, pas de contrat dans le modèle, périmètre non tranché — auquel s'ajoutent ici deux données qui n'existent pas et qui seraient nécessaires même si le reste était levé : la date de remise de chaque attestation, qui seule permettrait d'ancrer le semestre où le texte l'ancre, et la date d'émission de l'attestation, qui seule permettrait de vérifier le « moins de six mois ». Aucune des deux ne se déduit de ce que la fiche contient.",
    },
    {
      ref: "D. 8222-6",
      intitule: "Vérifications du particulier — cocontractant à l'étranger",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018520698",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le particulier qui contracte pour son usage personnel avec un cocontractant établi à l'étranger est réputé avoir procédé aux vérifications s'il se fait remettre l'un des documents de D. 8222-7.",
      citationCle:
        "Le particulier qui contracte pour son usage personnel, celui de son conjoint, partenaire lié par un pacte civil de solidarité, concubin ou de ses ascendants ou descendants, est considéré comme ayant procédé aux vérifications imposées par l'article L. 8222-4 s'il se fait remettre par son cocontractant établi ou domicilié à l'étranger, lors de la conclusion du contrat et tous les six mois jusqu'à la fin de son exécution, l'un des documents énumérés à l'article D. 8222-7.",
      statut: "hors_perimetre",
      exclusion: "sans_destinataire_exploitant",
      motif:
        "Le pendant de D. 8222-4 pour le cocontractant étranger, et il vise le même destinataire : le particulier contractant pour son usage personnel. Jamais un employeur pour son établissement. Écarté pour la qualité du destinataire, non pour l'extranéité — celle-ci est traitée à D. 8222-7, qui reste dans le périmètre et y porte un manque.",
    },
    {
      ref: "D. 8222-7",
      intitule:
        "Pièces à se faire remettre — cocontractant établi à l'étranger",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024833495",
      versionEnVigueur: "2012-01-01",
      modifiePar: {
        texte: "Décret n° 2011-1601 du 21 novembre 2011 - art. 2",
      },
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Le donneur d'ordre non particulier est réputé avoir procédé aux vérifications de L. 8222-4 s'il se fait remettre, à la conclusion et tous les six mois, un document d'identification fiscale, une attestation de régularité sociale et, si l'immatriculation est obligatoire dans le pays d'établissement, une preuve d'inscription au registre professionnel.",
      citationCle:
        "La personne qui contracte, lorsqu'elle n'est pas un particulier répondant aux conditions fixées par l'article D. 8222-6, est considérée comme ayant procédé aux vérifications imposées par l'article L. 8222-4 si elle se fait remettre par son cocontractant établi ou domicilié à l'étranger, lors de la conclusion du contrat et tous les six mois jusqu'à la fin de son exécution : 1° Dans tous les cas, les documents suivants : a) Un document mentionnant son numéro individuel d'identification attribué en application de l'article 286 ter du code général des impôts. Si le cocontractant n'est pas tenu d'avoir un tel numéro, un document mentionnant son identité et son adresse ou, le cas échéant, les coordonnées de son représentant fiscal ponctuel en France ; b) Un document attestant de la régularité de la situation sociale du cocontractant au regard du règlement (CE) n° 883/2004 du 29 avril 2004 ou d'une convention internationale de sécurité sociale […] ; 2° Lorsque l'immatriculation du cocontractant à un registre professionnel est obligatoire dans le pays d'établissement ou de domiciliation, l'un des documents suivants : a) Un document émanant des autorités tenant le registre professionnel ou un document équivalent certifiant cette inscription ; b) Un devis, un document publicitaire ou une correspondance professionnelle […] ; c) Pour les entreprises en cours de création, un document datant de moins de six mois émanant de l'autorité habilitée à recevoir l'inscription au registre professionnel et attestant de la demande d'immatriculation audit registre.",
      statut: "obligation_manquante",
      cause: "relation_tiers",
      toucheLaCible: true,
      motif:
        "Même obligation de fond que D. 8222-5 — même rythme semestriel, même point de départ à la conclusion — mais une liste de pièces ENTIÈREMENT DIFFÉRENTE, qu'aucun champ du produit ne peut recevoir : numéro d'identification à la TVA au sens de l'article 286 ter du CGI, ou identité et coordonnées du représentant fiscal ponctuel en France ; attestation de régularité sociale au regard du règlement (CE) n° 883/2004 ou d'une convention internationale ; preuve d'inscription au registre professionnel du pays. `prestataireSchema` ne connaît que trois pièces — URSSAF, RC Pro, Kbis — et un SIRET à quatorze chiffres, format qu'un prestataire étranger n'a pas. Un exploitant qui fait intervenir une entreprise établie hors de France pour 5 000 € ou plus — cas réel en restauration et en second œuvre — ne trouve dans l'outil ni la bonne liste de pièces, ni un endroit où les ranger, et l'écran lui affiche à la place la liste française. Le manque n'est donc pas seulement une absence : c'est une liste juste montrée dans le mauvais cas.",
      bloquePar:
        "Aucun attribut « cocontractant établi ou domicilié à l'étranger » sur le prestataire, et aucun champ de pièce libre : le schéma est fermé sur trois documents nommés. Distinguer les deux régimes supposerait d'abord de savoir dans lequel on se trouve, donnée que rien ne porte ; le SIRET obligatoire à quatorze chiffres, quand il est saisi, est même l'indice inverse.",
    },
    {
      ref: "D. 8222-8",
      intitule: "Langue des documents étrangers",
      url: "https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000018520694",
      versionEnVigueur: "2008-05-01",
      luLe: "2026-09-02",
      lecture: "agent_verbatim",
      prescrit:
        "Les documents et attestations énumérés à D. 8222-7 sont rédigés en langue française ou accompagnés d'une traduction en langue française.",
      citationCle:
        "Les documents et attestations énumérés à l'article D. 8222-7 sont rédigés en langue française ou accompagnés d'une traduction en langue française.",
      statut: "sans_objet",
      motif:
        "Règle de forme attachée à la liste de D. 8222-7, sans obligation autonome : elle qualifie des pièces que le produit ne sait déjà pas recevoir. Le manque est consigné une fois, sur D. 8222-7, et cette exigence de langue y appartient. Lu et conservé parce que le corpus est intégral et qu'un article qui ne prescrit rien s'énumère aussi.",
    },
  ],
};
