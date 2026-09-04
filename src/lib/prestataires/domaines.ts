// Ce qu'une obligation exige de l'annuaire de prestataires (ADR-024).
//
// Le référentiel dit depuis toujours QUI peut réaliser une vérification —
// `realisateurs: ["organisme_agree"]` — et l'annuaire dit depuis toujours ce
// que chaque prestataire couvre — `domaines: ["electricite"]`. Les deux
// modules ne se sont jamais parlé : `lib/prestataires` n'importait ni
// `referentiels`, ni `matching`, ni `calendrier`, et réciproquement. Le
// produit savait donc qu'une obligation exige un organisme agréé, savait
// séparément que l'annuaire n'en contenait aucun pour ce domaine, et ne
// rapprochait jamais les deux.
//
// Ce module est ce rapprochement, et rien de plus. Il ne crée aucune échéance,
// ne suggère aucun prestataire nommé, ne préremplit rien : il constate un
// écart entre deux déclarations de l'utilisateur.
//
// POURQUOI ICI ET PAS DANS LE RÉFÉRENTIEL. `src/lib/referentiels/` n'importe
// rien de `@prisma/client` — vérifié, aucune occurrence — et c'est une
// propriété de l'ADR-003 : le référentiel vit en TypeScript versionné,
// indépendant de la base. Y faire entrer `DomainePrestataire`, qui est un enum
// Prisma, l'aurait rompue pour une table de correspondance. La dépendance va
// donc dans le sens sûr : `prestataires → referentiels`, le référentiel
// restant la feuille.

import type { DomainePrestataire } from "@prisma/client";
import type {
  DomaineObligation,
  Obligation,
} from "@/lib/referentiels/conformite/types";
import type { Realisateur } from "@/lib/referentiels/types-communs";

/**
 * Le domaine d'obligation, traduit en domaines de prestataire.
 *
 * `Record` exhaustif **et** valeurs non vides — les deux comptent :
 *
 *  - exhaustif : ajouter un domaine d'obligation sans lui donner de
 *    contrepartie ne compile pas. C'est la garantie qui manquait quand `froid`
 *    est arrivé au référentiel et n'a jamais eu de domaine de prestataire ;
 *  - non vide (`[T, ...T[]]`) : `froid: []` aurait compilé et rétabli
 *    exactement le silence qu'on corrige. Un tableau vide serait ici la
 *    réponse d'un modèle qui n'a pas de mot, pas la réponse d'un texte.
 *
 * ## `"aucun_tiers_attendu"` — ce que le tableau vide confondait
 *
 * L'interdiction du tableau vide était juste, et elle le reste, mais elle
 * traitait deux situations comme une seule :
 *
 *  1. **le modèle n'a pas de mot** pour le tiers que l'obligation appelle —
 *     c'est `froid: []`, et c'est un silence à corriger ;
 *  2. **le texte n'attend personne** — l'obligation est réalisée par
 *     l'exploitant seul, parce que le Code la lui confie. Un affichage
 *     obligatoire, l'accès des salariés au DUERP, un règlement intérieur : il
 *     n'existe aucun prestataire à déclarer, et il n'en manque aucun.
 *
 * Le second cas n'a pas de réponse honnête dans un tableau de domaines de
 * prestataire. `["autre"]` serait le mot vide déguisé, et `[]` ferait passer
 * une réponse tranchée pour un trou de vocabulaire — exactement l'inverse de
 * ce que ce `Record` existe pour rendre visible.
 *
 * D'où un **marqueur nommé** plutôt qu'un tableau vide : `"aucun_tiers_attendu"`
 * dit que quelqu'un a lu le texte et constaté qu'il ne renvoie à personne. Le
 * choix est **écrit**, pas déduit d'une absence.
 *
 * Ce marqueur ne relâche aucune garde : `supposeUnTiers()` ne déclenche que
 * lorsque TOUS les réalisateurs d'une obligation sont des tiers, donc un
 * domaine réalisé par l'exploitant ne fait de toute façon jamais parler la
 * règle. Le marqueur ne change pas le comportement — il rend la raison
 * lisible, ce qu'un `[]` ne faisait pas.
 *
 * ⚠ Il ne s'emploie **que** pour le cas 2. Un domaine dont le texte appelle un
 * tiers que l'enum `DomainePrestataire` ne sait pas nommer doit recevoir une
 * valeur d'enum — au besoin une nouvelle, avec sa migration, comme
 * `organisme_formation` et `service_sante_travail` en ont reçu une. Employer le
 * marqueur là serait rétablir le silence de `froid`, sous un nom plus poli.
 *
 * Trois domaines portent deux noms selon le module — `aeration` /
 * `ventilation_vmc`, `porte_portail` / `porte_automatique`,
 * `equipement_sous_pression` / `equipement_pression`. Cette table est le seul
 * endroit du dépôt où les deux vocabulaires se regardent ; c'est aussi
 * pourquoi elle est la seule à importer les deux `LABEL_DOMAINE`, qui portent
 * le même nom dans `calendrier/labels.ts` et `prestataires/schema.ts` sans
 * jamais avoir été importés ensemble.
 *
 * `bureau_controle` accompagne plusieurs domaines : un bureau de contrôle
 * intervient transversalement, et l'exclure ferait dire « aucun prestataire ne
 * couvre ce domaine » à un dirigeant qui a justement déclaré celui qui le fait.
 */
export const AUCUN_TIERS_ATTENDU = "aucun_tiers_attendu" as const;

/**
 * Ce qu'un domaine d'obligation attend de l'annuaire : une liste non vide de
 * domaines de prestataire, ou le constat explicite qu'il n'attend personne.
 */
export type PrestatairesAttendus =
  | readonly [DomainePrestataire, ...DomainePrestataire[]]
  | typeof AUCUN_TIERS_ATTENDU;

export const DOMAINES_PRESTATAIRE_ATTENDUS: Record<
  DomaineObligation,
  PrestatairesAttendus
> = {
  electricite: ["electricite", "bureau_controle"],
  incendie: ["incendie", "bureau_controle"],
  aeration: ["ventilation_vmc"],
  cuisson_hotte: ["cuisson_hotte", "ventilation_vmc"],
  ascenseur: ["ascenseur", "bureau_controle"],
  porte_portail: ["porte_automatique"],
  equipement_sous_pression: ["equipement_pression", "bureau_controle"],
  stockage_dangereux: ["stockage_dangereux"],
  levage: ["levage", "bureau_controle"],
  froid: ["froid"],
  // Les trois domaines du lot 7. Aucun d'eux n'appelle un vérificateur
  // d'équipement : ils appellent un formateur ou un service de santé au
  // travail. `autre` aurait compilé et aurait été le mot vide que le
  // commentaire ci-dessus interdit — le tiers a un nom réel dans les deux cas,
  // et il fallait le donner à l'enum plutôt que le taire.
  //
  // ⚠ DEUX DES TROIS ENTRÉES NE SONT PAS ENCORE ATTEINTES, et il faut le lire
  // avant de s'y fier. La première rédaction affirmait ici que le rapprochement
  // « sert justement à faire voir » qu'un dirigeant n'a déclaré aucun service de
  // santé au travail. C'était faux au lot 7, deux fois :
  //
  //  1. les obligations salarié de ces domaines n'entrent jamais dans les
  //     applicables — `matching/engine.ts` rend `null` pour tout porteur
  //     salarié, délibérément (ADR-023 : rien ne dit qui opère sur quoi) ;
  //  2. leurs obligations d'établissement portaient toutes
  //     `realisateurs: ["exploitant"]`, donc `supposeUnTiers()` était faux — le
  //     Code confie ces actes à l'employeur, et c'est juste.
  //
  // ⚠ `sante_travail` EST ATTEINT DEPUIS LE LOT 8, et c'est exactement le cas
  // que la rédaction précédente annonçait comme futur : « la fiche d'entreprise
  // de R. 4624-46, réalisée par le médecin du travail ou l'équipe
  // pluridisciplinaire, en est le cas type ». Elle est encodée
  // (`sante-travail-etablissement-fiche-entreprise`), portée par
  // l'établissement, et ses réalisateurs sont tous des tiers — donc
  // `supposeUnTiers()` est vrai et la règle se déclenche. L'affirmation qui
  // était fausse est devenue vraie, et c'est le seul cas où il fallait la
  // réécrire plutôt que la corriger.
  //
  // `formation_securite` et `secours` restent inatteints : leurs obligations
  // d'établissement sont réalisées par l'exploitant, et leurs titres de salarié
  // ne franchissent pas le moteur.
  //
  // Ces deux entrées ne sont PAS `aucun_tiers_attendu` : le tiers existe et a un
  // nom, il n'est simplement pas encore appelé par une obligation livrée.
  // Confondre les deux ferait dire « le texte n'attend personne » là où il
  // attend quelqu'un. `domaines.test.ts` fige cet état pour qu'il ne se perde
  // pas.
  formation_securite: ["organisme_formation"],
  // La VIP et le suivi individuel renforcé sont réalisés par les professionnels
  // de santé du service de prévention et de santé au travail (`R. 4624-10`,
  // `R. 4624-28`), mais ce sont des titres de salarié : ils ne franchissent pas
  // le moteur. C'est la FICHE D'ENTREPRISE du lot 8 qui rend cette entrée
  // vivante — portée par l'établissement, réalisée par le médecin du travail ou
  // l'équipe pluridisciplinaire, donc par un tiers. Un dirigeant qui n'a déclaré
  // aucun service de santé au travail à l'annuaire s'en voit désormais averti,
  // et ce n'est pas qu'un trou de vigilance : `L. 4622-1` — « les employeurs ORGANISENT des
  // services » — met cette organisation à la charge de l'employeur, encodée
  // elle aussi au lot 8
  // (`sante-travail-etablissement-adhesion-spst`). Le titre II du livre VI est
  // dépouillé depuis, dans `code-travail-service-prevention-sante`.
  sante_travail: ["service_sante_travail"],
  // Le Code ne dit pas qui délivre la formation de secouriste de `R. 4224-15`.
  // Le domaine de prestataire attendu est donc l'organisme de formation, sans
  // qualification supplémentaire : l'habilitation INRS/CNAM du formateur SST
  // est un dispositif conventionnel, pas une exigence du Code, et l'écrire ici
  // ferait passer une pratique pour du droit.
  secours: ["organisme_formation"],
  // Les quatre domaines du lot 8, et les quatre premiers à porter le marqueur.
  // Ce n'est pas un défaut de vocabulaire : le Code confie chacune de ces
  // obligations à l'employeur seul. Personne ne vend l'affichage de l'adresse
  // de son inspecteur du travail, ni la désignation de son salarié compétent —
  // `L. 4644-1` prévoit bien un recours extérieur, mais « à défaut », comme
  // second choix, et l'obligation reste de désigner.
  organisation_prevention: AUCUN_TIERS_ATTENDU,
  information_travailleurs: AUCUN_TIERS_ATTENDU,
  locaux_sociaux: AUCUN_TIERS_ATTENDU,
  // Le protocole de sécurité a bien une seconde partie — le transporteur — mais
  // ce n'est pas un prestataire de l'employeur d'accueil : `R. 4515-11` fait
  // tenir un exemplaire du protocole aux chefs d'établissement « des entreprises
  // d'accueil ET de transport », c'est-à-dire à deux co-signataires. Il n'entre
  // donc pas à l'annuaire de vigilance, et le texte n'attend personne de ce
  // côté-ci de l'échange.
  co_activite: AUCUN_TIERS_ATTENDU,
  // La signalisation de sécurité, entrée le 2026-09-02. Cinquième entrée à
  // porter le marqueur, et c'est une lecture de l'arrêté du 4 novembre 1993 :
  // il ne réserve ni la pose des panneaux, ni l'entretien, ni la vérification
  // semestrielle des signaux lumineux et acoustiques, ni l'annuelle des
  // alimentations de secours à un organisme agréé, à une personne compétente
  // ou à une qualification quelconque. Ses neuf obligations portent toutes
  // `realisateurs: ["exploitant"]`, et ce n'est pas un repli faute de mieux —
  // le texte est muet, et lui prêter un vérificateur enverrait le dirigeant
  // chercher un prestataire dont il n'a pas besoin.
  //
  // À distinguer du recouvrement matériel avec l'éclairage de sécurité : un
  // BAES relève aussi de l'arrêté du 14 décembre 2011, dont les obligations
  // vivent en domaine `incendie` et appellent, elles, les prestataires de ce
  // domaine. Le même appareil, deux textes, deux domaines — et un seul des
  // deux attend quelqu'un.
  signalisation: AUCUN_TIERS_ATTENDU,
  // Le compactage des déchets, entré le 2026-09-02. PAS `aucun_tiers_attendu`,
  // et la différence avec la signalisation qui le précède se lit dans les deux
  // textes : l'arrêté du 4 novembre 1993 ne réserve la signalisation à
  // personne, tandis que `R. 4323-24` réserve la vérification générale
  // périodique à des « personnes qualifiées » — un réalisateur que
  // `REALISATEURS_TIERS` compte comme tiers, donc `supposeUnTiers()` est vrai
  // et cette entrée est réellement consultée.
  //
  // `bureau_controle` SEUL, et c'est une lecture, pas un repli. Le même
  // `R. 4323-24` ajoute « appartenant ou non à l'établissement » : aucun
  // organisme extérieur n'est exigé, et l'arrêté du 5 mars 1993 n'accrédite
  // personne. Le tiers réellement appelé quand l'employeur n'a pas de
  // personne qualifiée en interne est celui qui fait déjà les VGP du domaine
  // `levage` — un bureau de contrôle. Créer une valeur d'enum
  // « compactage » ferait inscrire à l'annuaire un métier qui n'existe pas
  // sous ce nom, et l'inscription resterait vide chez tout le monde.
  compactage_dechets: ["bureau_controle"],
  // L'éclairage des lieux de travail, entré le 2026-09-04. Sixième entrée à
  // porter le marqueur, et c'est une lecture de `R. 4223-11` : « L'EMPLOYEUR
  // fixe les règles d'entretien périodique du matériel » et les consigne dans
  // un document communiqué au comité social et économique. Aucun tiers n'est
  // nommé — ni organisme, ni personne qualifiée, ni entreprise d'entretien —,
  // et l'obligation encodée est l'ÉCRIT, pas l'entretien lui-même. Prêter un
  // vérificateur à cet article enverrait le dirigeant chercher un prestataire
  // pour rédiger ses propres consignes.
  //
  // À NE PAS CONFONDRE avec l'éclairage DE SÉCURITÉ, qui appelle bel et bien
  // quelqu'un : ses obligations vivent en domaine `incendie` et passent par
  // les prestataires de ce domaine. Le même bâtiment, deux textes, deux
  // domaines — et un seul des deux attend un tiers.
  eclairage: AUCUN_TIERS_ATTENDU,
  // `epi` N'EST PAS `aucun_tiers_attendu`, et la nuance est celle que ce
  // fichier existe pour tenir. `R. 4323-100` dit « des personnes qualifiées,
  // APPARTENANT OU NON à l'établissement » : le vérificateur peut parfaitement
  // être un tiers, et l'est en pratique dès que l'employeur n'a personne de
  // compétent sous la main. Ce que le texte n'exige pas, c'est un organisme
  // ACCRÉDITÉ — d'où l'absence de `bureau_controle`, qui ferait chercher au
  // dirigeant une accréditation que l'arrêté ne réclame nulle part.
  //
  // `entretien_general` est la catégorie d'annuaire qui reçoit ce vérificateur
  // sans lui prêter un agrément : c'est ce que fait déjà `porte_portail` pour
  // les vérifications de `R. 4224-17`, où le Code demande de même une personne
  // compétente et rien de plus.
  epi: ["entretien_general"],
};

/**
 * Les domaines où l'existence même du tiers est une obligation, et ce qu'il
 * faut alors dire au dirigeant.
 *
 * ## Pourquoi cette table existe
 *
 * Une seule règle a longtemps servi tous les domaines : « aucun intervenant
 * déclaré en X — une de vos obligations suppose un tiers qualifié ». Elle allait
 * de soi sur dix domaines techniques, où l'on CHOISIT un organisme, où l'on peut
 * en changer, et où le message dit en substance « inscrivez celui que vous
 * avez ». Le cas le plus probable y est d'ailleurs une saisie manquante, jamais
 * un manquement.
 *
 * `sante_travail` l'a fait sortir de son assiette. L'organisation d'un service
 * de prévention et de santé au travail n'est pas une relation qu'on peut ne pas
 * avoir : elle est due (`L. 4622-1` — « Les employeurs relevant du présent titre
 * organisent des services de prévention et de santé au travail »).
 *
 * Le jugement rendu à l'écran, et qu'un raisonnement n'avait pas suffi à
 * établir : la phrase unique règle le cas fréquent — celui qui a déjà un service
 * et ne l'a pas saisi — mais elle est écrite POUR LUI. Pour celui qui n'a pas
 * adhéré, c'est-à-dire le seul cas où le produit pourrait éviter un manquement
 * réel, « aucun intervenant déclaré » se lit comme un trou de saisie.
 *
 * Les deux règles ne constatent donc pas la même chose : le domaine technique
 * constate une **saisie manquante**, celui-ci constate une **obligation
 * peut-être non remplie**. Ce n'est pas une différence de vocabulaire.
 *
 * ## Pourquoi une table plutôt qu'un drapeau
 *
 * La phrase doit nommer ce qui est dû, et cela ne se dérive d'aucun champ : un
 * booléen aurait obligé à fabriquer un libellé générique — « le tiers de ce
 * domaine est obligatoire » — que personne n'écrirait à un dirigeant. Une entrée
 * aujourd'hui ; chacune est écrite par quelqu'un qui a lu le texte qu'elle cite.
 */
export const TIERS_LUI_MEME_OBLIGATOIRE: Partial<
  Record<DomaineObligation, { titre: string; sousTitre: string }>
> = {
  sante_travail: {
    // ⚠ « À VOTRE ANNUAIRE », ET PAS « DÉCLARÉ » TOUT COURT.
    //
    // Le mot a été retiré le 2026-08-31, après un contrôle visuel : l'écran
    // « Ce qui doit être en place » permet désormais de DÉCLARER EN PLACE
    // l'organisation d'un service de santé au travail (`L. 4622-1`). Un
    // dirigeant qui venait de le faire lisait sur son accueil qu'il n'avait
    // « rien déclaré ».
    //
    // Les deux constats sont justes et différents — l'un parle de l'annuaire
    // des prestataires, l'autre de l'état déclaré par l'employeur — mais ils
    // employaient LE MÊME VERBE pour dire l'inverse. C'est la double surface
    // que l'écran des états permanents venait retirer, revenue par la
    // rédaction. Deux messages qui disent des choses différentes doivent le
    // dire avec des mots différents.
    titre: "Aucun service de prévention et de santé au travail à votre annuaire",
    // ⚠ LA LONGUEUR EST UNE CONTRAINTE DE FOND ICI, PAS UNE COQUETTERIE.
    //
    // La rédaction précédente disait tout ce qu'il fallait — ce qui est dû avec
    // son article, les deux branches avec le leur, et l'issue probable — en
    // 213 signes. Mesurée dans le DOM : 1 115 px pour 638 px disponibles,
    // **tronquée à 57 %**. Le dirigeant lisait « … ou adhésion à un service
    // interentreprises (D. 46… » et rien de plus.
    //
    // Tout ce que la correction avait ajouté était dans la partie coupée, à
    // commencer par « il reste à l'inscrire » — la clause qui empêche le
    // message de reprocher quelque chose à quelqu'un qui a déjà fait le
    // nécessaire. La phrase était juste et l'écran la défaisait ; seul l'écran
    // est lu.
    //
    // CE QUI A ÉTÉ SACRIFIÉ, ET POURQUOI CELUI-LÀ. Les références d'articles
    // sortent du sous-titre. Deux raisons, et la première suffit : une
    // référence tronquée n'est pas une référence abrégée, c'est un article qui
    // n'existe pas, fabriqué par la mise en page. La seconde est que le
    // fondement a déjà sa place — l'obligation
    // `sante-travail-etablissement-adhesion-spst` porte `L. 4622-1`,
    // `D. 4622-1` et `D. 4622-2` avec leurs URL et leurs versions constatées.
    // Le tableau de bord oriente, il ne plaide pas.
    //
    // CE QUI EST GARDÉ, dans l'ordre où un dirigeant en a besoin :
    //  * que c'est dû — « tout employeur doit en avoir un » ;
    //  * SON action en premier, à l'affirmative : l'adhésion. C'était le point
    //    du tour précédent, et le mettre en tête fait le travail que faisait
    //    « en pratique la voie des petites structures », en dix-sept signes de
    //    moins ;
    //  * l'autre branche, pour ne pas resserrer le texte sur une seule ;
    //  * et l'issue la plus probable, qui retire le ton de reproche.
    //
    // « Doit en avoir un » plutôt que « doit en organiser un » : le verbe du
    // Code est « organisent », mais il se lit « montez-en un » quand il précède
    // les deux branches, et c'est exactement le contresens que le tour
    // précédent a corrigé. La formulation exacte du texte vit au libellé de
    // l'obligation, qui est la surface faite pour ça.
    sousTitre:
      "Tout employeur doit en avoir un : adhésion à un service interentreprises, ou service autonome. Si vous adhérez déjà, il reste à l'inscrire",
  },
};

/**
 * Les réalisateurs qui supposent un tiers déclaré à l'annuaire.
 *
 * `exploitant` en est exclu, et c'est le point : une obligation que
 * l'exploitant réalise lui-même n'appelle aucun prestataire, et signaler un
 * manque là serait un faux positif — le dirigeant n'a rien à chercher.
 *
 * `fabricant` en est exclu aussi : le fabricant d'un appareil n'est pas un
 * prestataire qu'on choisit et qu'on inscrit à un annuaire de vigilance, c'est
 * celui qui l'a construit.
 */
const REALISATEURS_TIERS: ReadonlySet<Realisateur> = new Set<Realisateur>([
  "organisme_agree",
  "organisme_accredite",
  "personne_qualifiee",
  "personne_competente",
  "bureau_controle",
  // Les deux réalisateurs de santé au travail, ajoutés avec le lot 7. Ce sont
  // des tiers au sens plein, et c'est la seule raison qui compte : l'employeur
  // ne peut PAS réaliser lui-même une visite d'information et de prévention ni
  // délivrer une attestation médicale. `R. 4624-10` la réserve à « l'un des
  // professionnels de santé mentionnés au premier alinéa de l'article
  // L. 4624-1 », `R. 4624-28` au médecin du travail.
  //
  // Une première rédaction ajoutait qu'à défaut,
  // `DOMAINES_PRESTATAIRE_ATTENDUS.sante_travail` serait « une entrée morte,
  // consultée jamais ». L'argument se réfute trente lignes plus haut : cette
  // entrée est inatteignable de toute façon, puisque les obligations salarié
  // n'entrent pas dans les applicables. Les inclure ne ressuscite rien — ils
  // sont ici parce qu'ils sont des tiers, pas pour éviter une mort déjà
  // survenue.
  "medecin_travail",
  "professionnel_sante_travail",
  // Même raison, et la règle de cet ensemble tient : « les réalisateurs qui
  // supposent un tiers déclaré à l'annuaire ». Une équipe pluridisciplinaire
  // est un tiers qualifié qu'on choisit et qu'on inscrit — c'est même le tiers
  // que la cible du produit a réellement, puisqu'une TPE adhère à un service
  // interentreprises plutôt que de salarier un médecin. Sa contrepartie est
  // `service_sante_travail`, déjà déclarée.
  "equipe_pluridisciplinaire",
]);

/**
 * Vrai si l'obligation **impose** qu'un tiers intervienne.
 *
 * `every` et non `some`, et c'est tout le sujet. `realisateurs` est une
 * **disjonction** — « Réalisateurs acceptés […] parfois 2 (ex. "personne
 * qualifiée OU organisme agréé") », dit le type. Un `some` retournait donc
 * vrai dès qu'un tiers figurait dans la liste, y compris quand `exploitant`
 * y figurait aussi, c'est-à-dire quand le texte autorise expressément le
 * dirigeant à faire l'acte lui-même.
 *
 * Trois obligations sont dans ce cas et produisaient le faux positif :
 * `cuisson-erp-circuits-extraction-nettoyage` (GC 21 § 2 admet
 * l'exploitant), `elec-erp-groupe-electrogene-annuel` et
 * `esp-declaration-mise-en-service`. Un restaurateur avec une hotte
 * s'entendait dire « aucun prestataire déclaré en cuisson et hotte » alors
 * qu'il a le droit de nettoyer lui-même — exactement le faux positif que le
 * commentaire ci-dessus s'interdisait, et que le test ne voyait pas parce
 * qu'il n'éprouvait que `["exploitant"]` seul.
 */
export function supposeUnTiers(o: Obligation): boolean {
  return o.realisateurs.every((r) => REALISATEURS_TIERS.has(r));
}

/**
 * Le constat, sans la base : les domaines d'obligation qui supposent un tiers
 * et qu'aucun prestataire déclaré ne couvre.
 *
 * Fonction pure, et c'est délibéré — la partie qui décide est testable sans
 * base, comme `reperterSansEcheance` l'est dans `equipements/hors-referentiel`.
 *
 * Ce qu'elle NE dit pas, et ne doit jamais dire : que le dirigeant est en
 * faute, ni qu'il doit signer avec quelqu'un. Elle dit qu'une obligation
 * suppose un tiers et que l'annuaire n'en déclare aucun pour ce domaine. Il
 * peut très bien en avoir un et ne pas l'avoir saisi — c'est même le cas le
 * plus probable, et la phrase affichée doit le permettre.
 */
export function domainesSansPrestataire(
  obligationsApplicables: readonly Obligation[],
  domainesDeclares: readonly DomainePrestataire[],
): DomaineObligation[] {
  const declares = new Set(domainesDeclares);
  const manquants = new Set<DomaineObligation>();

  for (const o of obligationsApplicables) {
    if (!supposeUnTiers(o)) continue;
    const attendus = DOMAINES_PRESTATAIRE_ATTENDUS[o.domaine];
    // Un domaine que le texte confie à l'exploitant n'a aucun prestataire à
    // manquer. En théorie inatteignable — `supposeUnTiers()` a déjà écarté les
    // obligations réalisées par l'exploitant, et un domaine marqué
    // `aucun_tiers_attendu` ne devrait en contenir aucune autre. On ne s'y fie
    // pas : les deux faits vivent dans deux fichiers différents, et rien ne
    // garantit qu'ils resteront d'accord. Le jour où ils divergent, le silence
    // est la bonne issue — annoncer « aucun prestataire déclaré » pour un
    // affichage obligatoire serait un faux positif adressé au dirigeant.
    if (attendus === AUCUN_TIERS_ATTENDU) continue;
    if (attendus.some((d) => declares.has(d))) continue;
    manquants.add(o.domaine);
  }

  // Ordre stable : le rendu ne doit pas dépendre de l'ordre des obligations.
  return [...manquants].sort();
}
