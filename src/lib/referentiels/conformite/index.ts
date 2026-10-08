/**
 * Agrégation du référentiel d'obligations réglementaires (ADR-003).
 *
 * Chaque domaine est exporté séparément pour permettre un filtrage simple
 * côté moteur de matching (étape 5) et côté UI (vue par domaine). La liste
 * `obligationsConformite` fusionne le tout.
 *
 * Domaines couverts à l'issue de l'étape 11 :
 *   - P1 : électricité, incendie, aération (≥ 25 obligations, étape 3)
 *   - P2 : cuisson/hotte, ascenseurs, portes et portails automatiques
 *   - P3 : équipements sous pression, stockage de matières dangereuses,
 *     équipements de levage
 *   - hors PLAN : froid — contrôle d'étanchéité des installations
 *     frigorifiques (R. 543-79 code de l'environnement, règlement UE 2024/573)
 */

import {
  porteurDe,
  type DomaineObligation,
  type Obligation,
  type PorteurObligation,
} from "./types";
import { obligationsElectricite } from "./electricite";
import { obligationsIncendie } from "./incendie";
import { obligationsAeration } from "./aeration";
import { obligationsCuissonHotte } from "./cuisson-hotte";
import { obligationsAscenseurs } from "./ascenseurs";
import { obligationsPortesPortails } from "./portes-portails";
import { obligationsEquipementSousPression } from "./equipement-sous-pression";
import { obligationsStockageDangereux } from "./stockage-dangereux";
import { obligationsLevage } from "./levage";
import { obligationsFroid } from "./froid";
import { obligationsFormationSecurite } from "./formation-securite";
import { obligationsSanteTravail } from "./sante-travail";
import { obligationsSecours } from "./secours";
import { obligationsOrganisationPrevention } from "./organisation-prevention";
import { obligationsInformationTravailleurs } from "./information-travailleurs";
import { obligationsEpi } from "./epi";
import { obligationsLocauxSociaux } from "./locaux-sociaux";
import { obligationsCoActivite } from "./co-activite";
import { obligationsSignalisation } from "./signalisation";
import { obligationsCompactageDechets } from "./compactage-dechets";
import { obligationsEclairage } from "./eclairage";

export {
  obligationsElectricite,
  obligationsIncendie,
  obligationsAeration,
  obligationsCuissonHotte,
  obligationsAscenseurs,
  obligationsPortesPortails,
  obligationsEquipementSousPression,
  obligationsStockageDangereux,
  obligationsLevage,
  obligationsFroid,
  obligationsFormationSecurite,
  obligationsSanteTravail,
  obligationsSecours,
  obligationsOrganisationPrevention,
  obligationsInformationTravailleurs,
  obligationsEpi,
  obligationsLocauxSociaux,
  obligationsCoActivite,
  obligationsSignalisation,
  obligationsCompactageDechets,
  obligationsEclairage,
};
export * from "./types";
export * from "./veille-textes";

export const obligationsConformite: Obligation[] = [
  ...obligationsElectricite,
  ...obligationsIncendie,
  ...obligationsAeration,
  ...obligationsCuissonHotte,
  ...obligationsAscenseurs,
  ...obligationsPortesPortails,
  ...obligationsEquipementSousPression,
  ...obligationsStockageDangereux,
  ...obligationsLevage,
  ...obligationsFroid,
  // Lot 7 — les trois domaines qui ne naissent d'aucun équipement.
  ...obligationsFormationSecurite,
  ...obligationsSanteTravail,
  ...obligationsSecours,
  // Lot 8 — le socle de l'employeur : ce qui est dû dès le premier salarié,
  // sans équipement, et ce que l'effectif ajoute aux seuils 11 et 50.
  ...obligationsOrganisationPrevention,
  ...obligationsInformationTravailleurs,
  ...obligationsEpi,
  ...obligationsLocauxSociaux,
  ...obligationsCoActivite,
  // Lot signalisation (2026-09-02) — l'arrêté du 4 novembre 1993, jamais
  // ouvert avant lui. Neuf lignes, dont deux seulement portent un rythme : le
  // semestre est réservé par le texte aux signaux LUMINEUX et ACOUSTIQUES, et
  // l'annuel aux alimentations de secours. Sur les panneaux, les couleurs et
  // les bandes, l'article 15 n'impose qu'un entretien « régulier », sans
  // rythme — d'où sept états permanents en `periodicite: "autre"`.
  ...obligationsSignalisation,
  // Lot machines (2026-09-02) — la branche HORS LEVAGE de `R. 4323-23`, ouverte
  // par l'arrêté du 5 mars 1993. Une seule ligne, et c'est le résultat du
  // dépouillement : sur les onze catégories d'équipements que le I de son
  // article 1er soumet à vérification trimestrielle, deux touchent les
  // secteurs cibles — presses à balles et compacteurs à déchets — et elles
  // partagent l'acte, le rythme, le réalisateur et le contenu.
  ...obligationsCompactageDechets,
  // Lot « les sept articles du Livre II » (2026-09-04) — le domaine que le
  // référentiel n'avait pas : l'éclairage ORDINAIRE des lieux de travail. Une
  // seule ligne, `R. 4223-11`, et c'est un ÉCRIT — les règles d'entretien
  // périodique que l'employeur fixe lui-même et consigne dans un document
  // communiqué au CSE. Le corpus l'avait lu le 2026-09-02 et écrit que rien ne
  // le bloquait ; il aura fallu deux jours pour le croire.
  ...obligationsEclairage,
];

/**
 * Version du référentiel de conformité (ADR-003).
 *
 * Le référentiel vit en TypeScript versionné, pas en base : quand il évolue —
 * périodicité corrigée, obligation retirée, libellé reformulé — les
 * `Verification` déjà écrites gardent l'ancienne valeur. Elles ne se
 * réalignaient qu'au hasard d'une mutation d'équipement ou d'un dépôt de
 * rapport, et une obligation supprimée laissait des lignes orphelines :
 * `obligationParId` renvoyait `undefined`, le domaine devenait `null`, et
 * l'occurrence disparaissait silencieusement des filtres du registre et du
 * dossier remis à l'inspecteur.
 *
 * Cette constante est, avec l'empreinte, le repère qui permet de détecter
 * qu'un calendrier a été généré avec un référentiel antérieur, et donc de le
 * réconcilier — les deux sont réunis dans `SCEAU_CALENDRIER`
 * (`calendrier/version-moteur.ts`).
 *
 * **À incrémenter à CHAQUE modification du référentiel.** L'oubli ne fige plus
 * les calendriers — le sceau porte l'empreinte, un contenu changé les
 * désynchronise de toute façon —, mais il laisse les documents citer une
 * version qui ne dit pas quel contenu elle a servi. La suite ne l'attrape que
 * si l'on AJOUTE une ligne à `HISTORIQUE_EMPREINTES` (`conformite.test.ts`) ;
 * réécrire la dernière reste vert.
 *
 * SAUF QUAND IL NE LE FAIT PAS, et le lot A du 2026-09-01 l'a établi en
 * corrigeant onze fondements sans que l'empreinte bouge d'un chiffre. C'est
 * `empreinteReferentiel` qui décide, et elle exclut délibérément
 * `referencesLegales`, `description` et `notesInternes` — au motif, juste,
 * qu'aucun n'est recopié sur la `Verification` et qu'aucun ne décide de son
 * existence. Le motif tient pour la RÉCONCILIATION ; il ne tient pas comme
 * garde de version. Un référentiel peut voir tout son fondement légal réécrit
 * — l'article cité sous une obligation de criticité 5, celui qui s'imprime au
 * dossier remis à une commission de sécurité — et l'empreinte ne bougera pas.
 * Ce n'est pas une défaillance du test, c'est son périmètre : il garde ce qui
 * engendre des lignes de calendrier, pas ce qui les justifie.
 *
 * Conséquence pratique, et c'est pourquoi cette constante se lit à la main :
 * la bonne question n'est pas « l'empreinte a-t-elle bougé ? » mais « le
 * référentiel a-t-il changé ? ». Ici, oui.
 */
// Version remesurée à l'intégration, comme l'empreinte : six lots l'ont portée
// en deux jours, chacun juste chez lui et aucun après la fusion.
// `.7` le 2026-09-02 : le lot machines ouvre la branche hors levage de
// `R. 4323-23` et ajoute une échéance TRIMESTRIELLE de criticité 5 sur une
// catégorie d'équipement neuve. Aucun calendrier existant ne la porte — la
// catégorie n'existait pas —, mais la version se lit à la main et le
// référentiel a changé.
// `.2` le 2026-09-04 : le lot « les sept articles du Livre II » ajoute quatre
// obligations, dont deux produisent des lignes de calendrier — la vérification
// HEBDOMADAIRE de l'alarme (`MS 69`) et la visite TRIMESTRIELLE des filtres de
// ventilation (`CH 39 § 3`). Toutes deux sont bornées aux ERP des quatre
// premières catégories : aucun calendrier existant ne les porte, et un parc de
// 5ᵉ catégorie n'en voit rien.
// `.1` le 2026-09-08 : la colonne R du tableau de GE 4 § 1 se dédouble en
// 4ᵉ catégorie. Deux obligations entrent, et l'une ALLONGE un délai — un
// établissement d'enseignement de 4ᵉ catégorie ayant DÉCLARÉ ne pas héberger
// passe de trois ans à cinq, ce que le tableau dit depuis 2014. Les
// calendriers existants sont concernés, et c'est le premier lot dans ce cas :
// tant que la question d'hébergement n'a pas de réponse, rien ne bouge, mais
// une réponse « non » déplace une échéance déjà engendrée.
// `.1` le 2026-09-11 : RATTRAPAGE. Le 2026-09-10, `succedeA` est entré dans
// l'empreinte (`5bef50c`) et l'a fait bouger — la constante du test a été mise à
// jour, la version NON. Une base ayant réconcilié à `2026-09-08.1` se voyait donc
// synchronisée et ne rejouait jamais la succession de GE 4 § 1 : la ligne d'un
// internat restait sous l'ancien identifiant. Trouvé en relecture post-fusion.
// La règle que le test énonce est la bonne, et elle a été lue à moitié : quand
// l'empreinte change, la version change dans le MÊME commit.
// `.1` le 2026-09-26 : aucune obligation n'entre ni ne sort. Les libellés de
// sept obligations événementielles reprennent les mots de leur article, et le
// protocole de sécurité cite `R. 4515-8`. Aucune échéance ne bouge — ces
// lignes n'ont pas de date —, mais l'empreinte couvre le libellé.
// `.2` le 2026-09-26 : aucune entrée ni sortie. Les libellés des onze lignes
// « Quand ça arrive » disent l'acte dans les mots du texte, sans condition ;
// le protocole de sécurité cite `R. 4515-5` et `R. 4515-6`.
// `.4` le 2026-09-26 (`.3` annulée, jamais publiée) : aucune entrée ni
// sortie ; libellés des lignes « Quand ça arrive » repris après une troisième
// contre-lecture.
// `.5` le 2026-09-26 : deux libellés retouchés après vérification ciblée.
// `.6` le 2026-09-26 : une obligation événementielle entre, `R. 4624-33`
// (arrêt de moins de trente jours pour accident du travail). Aucune échéance :
// elle vit sur la page « Quand ça arrive ».
// `.7` le 2026-09-26 : `L. 4624-2-4` entre (information du travailleur sur la
// préreprise), événementielle, sans échéance.
// `.8` le 2026-09-26 : description seule — `incendie-travail-moyens-lutte`
// ne dit plus que la vérification annuelle des extincteurs est « la règle de
// fait ». Empreinte inchangée, version neuve : deux documents qui citent la
// même version doivent avoir lu le même texte.
// `.9` le 2026-09-26 (C37) : les cinq typologies à seuil d'effectif disent
// sur quel nombre il se compte (`effectifMaille`) — l'entreprise pour le CSE,
// la formation de ses élus et le règlement intérieur (L. 2311-2, L. 1111-2,
// L. 1111-3), l'établissement pour la restauration (R. 4228-22/-23). 169
// obligations, aucune n'entre ni ne sort.
// `.10` le 2026-09-26 (C39) : descriptions, références et notes seules, sur
// dix-huit obligations. Le registre de sécurité cesse de citer R. 4227-39 en
// premier (son champ est celui de R. 4227-34, la ligne vaut pour tout
// employeur par L. 4711-1, relu en première main). Les dix-sept lignes
// fondées sur le livre II et servies aux N5 — extincteurs (annuelle,
// décennale), SSI, BAES, éclairage de sécurité (×2), désenfumage, RIA, groupe
// électrogène (×2), mise en service électrique, CH 58, grande cuisine (×5) —
// disent dans leur référence « livre II, établissements des quatre premières
// catégories », et dans leur description ce que le livre III porte en 5ᵉ et
// la sur-application assumée. S'y ajoutent, à l'intégration du 2026-09-27
// (C40), deux descriptions sans seuil inventé : la désignation du salarié
// compétent (L. 4644-1) et sa formation. Aucune typologie, aucun libellé :
// empreinte inchangée, 169.
// `.11` annulée le 2026-09-27, jamais publiée ; numéro non réemployé.
// `.12` le 2026-09-27 (C41) : la question du groupe électrogène passe en
// trois états, et les deux lignes d'EL 18 § 4 (quinzaine, mois) portent la
// même condition `non_infirmee` — sans réponse ou « oui », les deux ; « non »,
// aucune. Chez un ERP dont l'installation électrique n'a pas de réponse, la
// ligne mensuelle ENTRE au calendrier. Les `false` de l'ancienne case sont
// effacés par migration. Sur la même version, descriptions seules : les six
// lignes du livre II qui invoquent PE 15 § 1 ou PE 20 § 2 (grande cuisine ×5,
// CH 58) nomment la ligne triennale de PE 4 § 2, déjà au calendrier de tout
// N5. 169 obligations, aucune n'entre ni ne sort.
// `.13` le 2026-09-27 (C45) : une obligation entre, R. 4227-26 (chiffons,
// cotons et papiers imprégnés, récipients métalliques clos et étanches), état
// permanent d'établissement sous la typologie neuve `chiffonsImpregnes`. 169 +
// 1 − 0 = 170. Aucune échéance datée : le générateur saute les états
// permanents, aucune ligne de calendrier n'est écrite.
// `2026-09-27.1` (analyse de la réponse absente, étape 6) : deux obligations
// entrent, R. 4227-34 (installation de l'alarme sonore) et R. 4227-37 al. 2
// (instructions d'évacuation hors du champ, typologie neuve
// `horsChampR422734`). 170 + 2 − 0 = 172. Deux états permanents : aucune ligne
// de calendrier n'est écrite.
// `2026-09-27.2` (lot 2, audit) : la dotation de R. 4227-29 entre, portée par
// l'établissement (`incendie-travail-extincteurs-dotation`). 172 + 1 − 0 = 173.
// `2026-09-27.3` (lot 2, D25 option (a)) : `incendie-travail-moyens-lutte`
// réduite au maintien en état — son libellé change, pas son périmètre. 173 + 0 −
// 0 = 173. États permanents : aucune ligne de calendrier.
// `2026-09-28.1` (lot 3, D7 option (a)) : levage, un seul rythme de VGP par
// appareil — conditions de l'annuelle, de la trimestrielle et de la
// semestrielle « personnes ». 173 + 0 − 0 = 173. Des lignes sortent : celles
// qu'un appareil portait en double (archivées si elles portent une trace).
// `2026-09-28.2` (revue indépendante du lot 3) : les VGP de levage suivent
// l'art. 23 et le III de l'art. 20 — `levage-vgp-semestrielle-force-humaine`
// entre (appareil manuel ne levant pas de personnes, six mois) ; au silence, la
// ligne la plus exigeante. 173 + 1 − 0 = 174.
// `2026-09-28.3` (contre-revue des corrections du lot 3) : les libellés de
// quatre VGP de levage — servies au silence sur une réponse — disent le rythme
// et son fondement, plus un fait non déclaré. Libellés seuls : 174 + 0 − 0 = 174.
// `2026-10-07.5` (relecture du préventeur du 30/09, intégration des cinq lots
// `lot/relecture-jc-1` à `-5` ; chaque branche portait sa propre version,
// `.1` à `.4`, qu'aucun calendrier n'a scellée — elles ne sont pas servies).
// Lot 1 : (1) ascenseur, AS 9 sort de la ligne CCH et prend deux lignes à
// lui, bornées aux ERP N1–N4 — `ascenseur-erp-verification-quinquennale-as9`
// et `ascenseur-erp-verification-remise-en-service-as9` (événementielle).
// 174 + 2 − 0 = 176. (2) MS 38 § 4 : extincteurs d'ERP, annuelle et décennale,
// par `personne_competente` au lieu de personne qualifiée ou organisme agréé.
// 176 + 0 − 0 = 176. (3) Identification des extincteurs en ERP :
// `signalisation-erp-extincteurs-identification` (N1–N4, MS 38 § 3, MS 39) et
// `signalisation-erp-5-extincteurs-identification` (N5, PE 26). 176 + 2 − 0 =
// 178. États permanents : aucune ligne de calendrier. (4) EL 18 § 4 : libellé
// de `elec-erp-groupe-electrogene-quinzaine` dans les mots du tiret. 178 + 0 −
// 0 = 178.
// Lot 5 (périmètre ; décision de la propriétaire du 07/10) : l'IGH sort du
// référentiel — `elec-igh-annuelle`, `incendie-igh-moyens-secours-annuelle`,
// `incendie-igh-charge-calorifique-quinquennale` (`OBLIGATIONS_RETIREES`).
// 178 + 0 − 3 = 175. Équipements sous pression : seule la requalification
// décennale reste — six lignes `esp-*` retirées. 175 − 6 = 169. Stockage de
// matières dangereuses : « sauf les 3 derniers points » — quatre lignes
// `stockage-dangereux-*` retirées. 169 − 4 = 165. Hotte : le contrôle annuel
// des locaux à pollution spécifique ne naît plus que d'une VMC ou d'une CTA
// (« traité dans le VMC : à supprimer dans les hottes »). 165 + 0 − 0 = 165.
// Lot 4 : DF 10 § 3 entre (`incendie-erp-desenfumage-triennale-mecanique-ssi`),
// et la triennale SSI de MS 73 § 2 reçoit sa condition A/B en `non_infirmee`.
// 165 + 1 − 0 = 166. Au silence, rien ne sort ; la ligne neuve n'apparaît
// qu'au « oui » sur le désenfumage mécanique.
// Lot 2 (ADR-039) : source NORME, `rythmeRetenu`, mention ; aucune obligation
// touchée. Lot 3 (C59, ADR-039) : les rythmes retenus entrent. Extincteurs hors ERP : maintenance annuelle de la norme
// NF S 61-919 (`incendie-travail-moyens-lutte`, désormais `erp: false` — la
// partition avec l'annuelle de MS 38 § 4). Révision en atelier à dix ans
// (NF S 61-919 § 10.1), même partition : entre
// `incendie-travail-extincteurs-revision-atelier-decennale`.
// EPI : `epi-maintien-etat-conformite` (R. 4322-1, défaut annuel, catégorie
// `EPI` seule — l'arrêté du 19 mars 1993 garde ses trois catégories).
// Formation : défaut annuel sur `formation-securite-etablissement-organisation`
// (L. 4141-2, « répétée périodiquement ») et `stockage-dangereux-formation-
// personnel` (R. 4412-88, « Elles sont répétées régulièrement »).
// Défaut annuel de R. 4224-17 en lieu de travail hors ERP, partition avec
// les annuelles ERP écrites (MS 73, DF 10) : entrent
// `incendie-travail-ria-entretien-verification` et
// `incendie-travail-desenfumage-entretien-verification` ; l'entretien de la
// signalisation (arrêté du 4 novembre 1993, art. 15, « régulièrement »)
// reçoit le défaut. L'alarme reste à la semestrielle écrite du même article.
// Maintenance additionnelle approfondie à 5 et 15 ans (NF S 61-919, annexe
// A), selon la question neuve `typeExtincteur` : entre
// `incendie-travail-extincteurs-maintenance-approfondie`.
// Compte : 166 + 5 − 0 = 171.
// C60, même version (jamais servie), revue indépendante de la relecture :
// ~~AS 9 s'applique aux hôtels de 5ᵉ catégorie par le renvoi exprès de PO 1 § 3
// (PO 8 § 1, PE 1 § 1) — entrent `ascenseur-hotel-5-verification-quinquennale-as9`
// et `ascenseur-hotel-5-verification-remise-en-service-as9` (N5, type O).~~
// [2026-10-08, C64 : supprimées, voir plus bas.]
// Lignes AS 9 N1–N4 fondées d'abord sur PE 1 § 1 ; identification des
// extincteurs N1–N4 étendue au RIA (MS 15 § 4) ; libellés des défauts annuels
// (RIA, désenfumage, EPI) et de la triennale SSI ramenés au texte ; valeur
// `halon` de `typeExtincteur`, qui retire la maintenance approfondie et la
// révision hors ERP. Compte : 171 + 2 − 0 = 173.
// C62, même version (jamais servie), revue finale : le libellé de
// `signalisation-erp-extincteurs-identification` devient neutre — la ligne est
// portée par l'extincteur comme par le RIA, et chacun lisait l'exigence de
// l'autre. Compte : 173 + 0 − 0 = 173.
// C64, même version (jamais servie), 2026-10-08 — « on respecte les décisions
// de Julien » (décision de la propriétaire) :
// (B) les deux lignes AS 9 des hôtels de 5ᵉ sont supprimées, sans
// `OBLIGATIONS_RETIREES` (nées et retirées sous cette version) ; le renvoi de
// PO 1 § 3 reste lu, en réserve de PO 1 et PO 8. Compte : 173 + 0 − 2 = 171.
// (C) `esp-requalification-decennale` bornée aux compresseurs (« à exclure
// sauf pour compresseur : requalification tous les 10 ans ») : quatre
// conditions `enum_differente` sur `familleEsp` écartent les familles
// déclarées autres que `recipient_gaz_groupe2` ; le silence et « Autre / je
// ne sais pas » gardent la ligne. Compte : 171 + 0 − 0 = 171.
// (A) La formation au risque chimique : une ligne d'établissement, due dès
// qu'un stockage de matières dangereuses est déclaré (champ neuf
// `siEquipementDeclare`, qui entre à l'empreinte), au défaut annuel de
// L. 4141-2 — entre `stockage-dangereux-etablissement-formation-personnel`,
// sort `stockage-dangereux-formation-personnel` (`OBLIGATIONS_RETIREES`,
// `absorbePar`). Compte : 171 + 1 − 1 = 171.
export const REFERENTIEL_VERSION = "2026-10-07.5";

/**
 * Les identifiants d'obligations retirées du référentiel.
 *
 * `Obligation.id` porte la règle : « Identifiant stable, versionné avec le
 * code. **Jamais réutilisé.** » Elle n'était jusqu'ici qu'un commentaire.
 *
 * Elle compte, parce qu'un id survit à l'obligation : `Verification.
 * obligationId` le porte en base, et la réconciliation s'en sert pour
 * retrouver ses lignes. Réemployer un id retiré rattacherait les lignes de
 * l'ancienne obligation à la nouvelle — leurs dates, leurs statuts, et les
 * rapports qui y pendent. Silencieusement, et sans qu'aucune contrainte de
 * base ne s'y oppose.
 *
 * `absorbePar` est une DONNÉE, pas de la prose : c'est ce qui rendra possible,
 * le jour où on l'écrira, le report de l'état de conformité d'une ligne
 * retirée vers celle qui la remplace. Aujourd'hui la réconciliation ne le fait
 * pas — un dirigeant à jour d'un contrôle voit sa ligne archivée et une ligne
 * neuve « à planifier » apparaître. Sans effet à ce jour (aucune ligne réalisée
 * ne portait un id retiré au moment du retrait), mais c'est un manque, pas une
 * décision : voir l'ADR-022.
 *
 * `null` = retiré sans remplaçant.
 */
export type ObligationRetiree = {
  /** L'obligation qui reprend le contenu, ou `null` si personne ne le reprend. */
  absorbePar: string | null;
  /**
   * Le porteur de l'obligation AU MOMENT DE SON RETRAIT — écrit à la main, par
   * qui retire, parce qu'une obligation retirée n'est plus là pour le dire
   * (2026-09-15, `lot/fusibles-referentiel`). Requis : un oubli ne compile pas.
   *
   * Il décide si la réconciliation sait continuer la ligne vers `absorbePar` —
   * l'adoption à porteur égal, le report d'échéance de l'équipement vers
   * l'établissement, et jamais un salarié, dont les titres gardent
   * l'identifiant retiré. `succession-porteurs.test.ts` le lit.
   */
  porteur: PorteurObligation;
  /** Ce qui s'est passé, pour qui trouve l'id en base sans autre contexte. */
  motif: string;
};

export const OBLIGATIONS_RETIREES: Record<string, ObligationRetiree> = {
  // Antérieur à l'ADR-022, inscrit rétroactivement le 2026-08-27 : le retrait
  // était documenté dans `prisma/schema.prisma` comme le cas vécu qui a motivé
  // la colonne `referentielVersion`, mais nulle part sous une forme qui
  // empêche le réemploi de l'id. Le registre naissait donc avec un trou connu.
  "aeration-hotte-pro-annuelle": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Retiré avant le 2026-08-27, date inconnue. Doublon du ramonage annuel des circuits d'extraction (GC 20), fusionné avec l'obligation qui le portait déjà. Les `Verification` qui le portaient ont SURVÉCU à son retrait, orphelines — c'est ce cas vécu qui a motivé la colonne `Verification.referentielVersion` (voir `prisma/schema.prisma`). Absorbant non identifié avec certitude à la relecture : laissé à `null` plutôt que deviné.",
  },
  // ADR-022 — fragments absorbés par l'obligation portée par l'établissement.
  "elec-erp-cat5-quinquennale": {
    absorbePar: "incendie-erp-pe4-entretien-installations-techniques",
    porteur: "equipement",
    motif:
      "Retiré le 2026-08-27. Fragment « installations électriques » de PE 4 § 2, sans fondement propre. L'obligation absorbante porte l'article entier et vit en domaine `incendie` : un utilisateur qui filtre sur « électricité » ne l'y trouvera plus.",
  },
  "cuisson-gaz-installations-triennale": {
    absorbePar: "incendie-erp-pe4-entretien-installations-techniques",
    porteur: "equipement",
    motif:
      "Retiré le 2026-08-27. Fragment « installations de gaz » de PE 4 § 2, sans fondement propre. À ne pas confondre avec `cuisson-gaz-installations-annuelle`, qui vit toujours et régit les ERP de 1ʳᵉ à 4ᵉ catégorie sur GZ 15.",
  },
  "aeration-travail-entretien-annuel": {
    absorbePar: "aeration-controle-installations-r4222-20",
    porteur: "equipement",
    motif:
      "Retiré le 2026-08-27. Fragment « VMC/CTA » de R. 4222-20, sans fondement propre. L'absorbante garde le même domaine, le même rythme annuel et la même criticité : pour l'utilisateur, une ligne par appareil devient une ligne pour l'ensemble.",
  },
  // GE 4 § 1 — la ligne unique a éclaté en six quand le tableau a pu être lu.
  "incendie-erp-cat1-4-visite-commission": {
    absorbePar: "incendie-erp-visite-commission-cat1-2-triennale",
    porteur: "etablissement",
    motif:
      "Retirée le 2026-09-02, créée le 2026-09-01. Elle portait GE 4 § 1 en UNE ligne `triennale` bornée à N1–N4, faute d'avoir pu lire le corps du tableau à la source. Le tableau a depuis été relevé et vérifié case par case sur le fac-similé du Journal officiel : il croise le type et la catégorie, et donne trois OU cinq ans. `periodicite` étant un scalaire, il faut une ligne par bloc — six, qui forment une partition. `absorbePar` désigne celle des six qui hérite du plus grand nombre d'établissements, mais aucune ne la reprend à elle seule : un dossier de 3ᵉ ou 4ᵉ catégorie bascule sur une autre, et un établissement de culte passe de trois à cinq ans. L'id ne doit jamais être réemployé — c'est ce que ce registre garantit.\n\nCE CHAMP EST LU DEPUIS LE 2026-09-10, et cette entrée-ci est la seule des cinq à ne pas se laisser lire entièrement. La réconciliation reporte l'historique d'une ligne retirée vers son absorbant DÉCLARÉ, à la condition que celui-ci s'applique au dossier. Or `absorbePar` est un pointeur unique là où il faudrait une partition : pour un ERP de 3ᵉ ou 4ᵉ catégorie, l'absorbant nommé ici n'est pas applicable — c'est une autre des six qui l'est —, donc AUCUN report n'a lieu et la ligne d'origine est archivée seule. Le dossier perd la continuité de sa visite de commission, précisément pour la population que le motif ci-dessus signale comme mal servie. Le mécanisme couvre donc cette entrée EN PARTIE, et il faut le savoir avant de s'y fier. Ce qui manque n'est pas du code : c'est une déclaration capable de dire « selon la catégorie, l'un OU l'autre ». Les quatre autres entrées ne posent pas ce problème, leur absorbant étant porté par l'établissement, donc applicable à tout dossier.",
  },
  // Relecture du préventeur du 30/09, lot 5 (périmètre) — décision de la
  // propriétaire du 07/10 d'appliquer les retraits demandés. La réconciliation
  // ne connaît plus ces identifiants : une ligne qui porte une trace (rapport,
  // action, réalisation) est ARCHIVÉE avec sa preuve, une ligne sans trace est
  // supprimée (`generateur.ts`, boucle des lignes non générées). Rien n'est
  // repris ailleurs : `absorbePar` est `null`.
  "elec-igh-annuelle": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la grille « IGH non traité par Rojer » : la vérification annuelle des installations électriques d'un IGH (arrêté du 30 décembre 2011, art. GH 5) incombe au PROPRIÉTAIRE de l'immeuble, pas à l'employeur locataire que le produit sert. Aucun absorbant : le régime IGH sort du référentiel, et la page « Ce que Rojer ne couvre pas » (axe `igh`) le dit. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "incendie-igh-moyens-secours-annuelle": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Annotée « IGH non traité » sur chacune des pages de la grille où elle paraissait (alarme, extincteurs, désenfumage) : la vérification annuelle des moyens de secours et du SSI d'un IGH (GH 5) incombe au propriétaire de l'immeuble. Aucun absorbant ; la page « Ce que Rojer ne couvre pas » (axe `igh`) annonce le régime comme non traité. Les lignes qui portaient une trace sont archivées, les autres supprimées.",
  },
  "incendie-igh-charge-calorifique-quinquennale": {
    absorbePar: null,
    porteur: "etablissement",
    motif:
      "Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Annotée « non traité » par le préventeur. C'était la seule ligne IGH dont l'OCCUPANT est le débiteur (GH 61 § 5, rapport quinquennal de conformité de la charge calorifique par organisme agréé) : la retirer est une décision de périmètre, pas une lecture du texte, qui continue de l'imposer. La page « Ce que Rojer ne couvre pas » (axe `igh`) le dit nommément à l'occupant. Aucun absorbant ; la ligne d'établissement est archivée si elle porte une trace, supprimée sinon.",
  },
  "esp-declaration-mise-en-service": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Déclaration et contrôle de mise en service (arrêté du 20 novembre 2017, art. 7 à 11). Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Équipement sous pression » de la grille : « à exclure sauf pour compresseur : requalification tous les 10 ans ». Seule `esp-requalification-decennale` reste au domaine ; elle ne reprend pas ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "esp-inspection-periodique": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Inspection périodique quadriennale (arrêté du 20 novembre 2017, art. 15). Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Équipement sous pression » de la grille : « à exclure sauf pour compresseur : requalification tous les 10 ans ». Seule `esp-requalification-decennale` reste au domaine ; elle ne reprend pas ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "esp-inspection-periodique-generateur-vapeur": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Inspection périodique biennale des générateurs de vapeur (arrêté du 20 novembre 2017, art. 15, I). Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Équipement sous pression » de la grille : « à exclure sauf pour compresseur : requalification tous les 10 ans ». Seule `esp-requalification-decennale` reste au domaine ; elle ne reprend pas ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "esp-dossier-suivi": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Tenue du dossier de suivi (arrêté du 20 novembre 2017, art. 6) — état permanent. Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Équipement sous pression » de la grille : « à exclure sauf pour compresseur : requalification tous les 10 ans ». Seule `esp-requalification-decennale` reste au domaine ; elle ne reprend pas ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "esp-intervention-reparation": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Contrôle après intervention notable (arrêté du 20 novembre 2017, art. 26 à 28) — événementielle. Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Équipement sous pression » de la grille : « à exclure sauf pour compresseur : requalification tous les 10 ans ». Seule `esp-requalification-decennale` reste au domaine ; elle ne reprend pas ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "esp-personnel-formation": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Formation et information des opérateurs (Code du travail, R. 4323-1 à R. 4323-5) — état permanent. Le Code du travail continue de s'appliquer à tout équipement de travail : c'est la ligne propre aux ESP qui sort, pas l'article. Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Équipement sous pression » de la grille : « à exclure sauf pour compresseur : requalification tous les 10 ans ». Seule `esp-requalification-decennale` reste au domaine ; elle ne reprend pas ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "stockage-dangereux-declaration-icpe": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Vérification du régime ICPE applicable (C. env., L. 512-1, L. 512-7, L. 512-8) — obligation ponctuelle, seule inscrite au registre des obligations sans surface, qui se vide. Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Stockage de matières dangereuses » de la grille : « à exclure sauf 3 derniers points » — restent les fiches de données de sécurité, la formation du personnel et la signalisation des aires de stockage. Aucune d'elles ne reprend ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "stockage-dangereux-retention": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Capacité de rétention (R. 4412-11, R. 4412-17 ; arrêté du 1er juin 2015, art. 22) — état permanent. Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Stockage de matières dangereuses » de la grille : « à exclure sauf 3 derniers points » — restent les fiches de données de sécurité, la formation du personnel et la signalisation des aires de stockage. Aucune d'elles ne reprend ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "stockage-dangereux-verification-etancheite": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Vérification régulière de l'état du stockage (R. 4412-11, 2°) — échéance récurrente sans rythme écrit. Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Stockage de matières dangereuses » de la grille : « à exclure sauf 3 derniers points » — restent les fiches de données de sécurité, la formation du personnel et la signalisation des aires de stockage. Aucune d'elles ne reprend ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  "stockage-dangereux-ventilation-locaux": {
    absorbePar: null,
    porteur: "equipement",
    motif:
      "Ventilation des locaux de stockage et contrôle annuel (R. 4222-20 ; arrêté du 8 octobre 1987, art. 4) — les deux textes continuent de fonder les lignes d'aération. Retirée le 2026-10-07 — périmètre, relecture préventeur du 30/09, décision de la propriétaire du 07/10. Le préventeur a annoté la page « Stockage de matières dangereuses » de la grille : « à exclure sauf 3 derniers points » — restent les fiches de données de sécurité, la formation du personnel et la signalisation des aires de stockage. Aucune d'elles ne reprend ce contenu-ci, d'où `absorbePar: null`. Les lignes de calendrier qui portaient une trace sont archivées, les autres supprimées.",
  },
  // 2026-10-08 (C64) — « on respecte les décisions de Julien » : la formation
  // au risque chimique devient UNE ligne d'établissement, due dès qu'un
  // stockage est déclaré (`siEquipementDeclare`). Nouvel identifiant, et
  // celui-ci inscrit ici : le report d'échéance équipement → établissement
  // n'est servi qu'à une obligation retirée (`succession-porteurs.test.ts`).
  "stockage-dangereux-formation-personnel": {
    absorbePar: "stockage-dangereux-etablissement-formation-personnel",
    porteur: "equipement",
    motif:
      "Formation du personnel manipulant des matières dangereuses (R. 4412-38), portée par chaque stockage déclaré : une ligne PAR stockage. Retirée le 2026-10-08 (C64) au profit de `stockage-dangereux-etablissement-formation-personnel`, une ligne pour l'établissement, due dès qu'au moins un stockage est déclaré, au défaut annuel de L. 4141-2 (préventeur : « obligation annuelle de formation » ; décision de la propriétaire du 08/10). En production l'identifiant était `autre`, sans rythme ni ligne de calendrier ; la version 2026-10-07.5, qui lui donnait un défaut annuel, n'a jamais été servie.",
  },
};

/**
 * Sérialisation canonique d'une valeur : clés d'objet triées, donc
 * indépendante de l'ordre d'écriture dans le référentiel. Sans cela,
 * réordonner `{ erp, travail }` en `{ travail, erp }` — un changement
 * purement cosmétique — ferait bouger l'empreinte et réclamerait à tort une
 * réconciliation de tous les calendriers.
 *
 * **L'ordre des tableaux est en revanche conservé.** Réordonner
 * `categories: ["N2", "N1"]` déplace donc l'empreinte, alors que c'est sans
 * effet sur le matching. C'est assumé : trier aussi les tableaux rendrait la
 * fonction aveugle à un réordonnancement le jour où un champ dont l'ordre
 * compte entrerait dans l'empreinte (`referencesLegales`, dont le premier
 * élément est l'article fondateur). Une réconciliation de trop est inoffensive
 * — elle est idempotente ; une réconciliation manquée ne l'est pas.
 */
function canonique(v: unknown): string {
  if (v === null || typeof v !== "object") return JSON.stringify(v) ?? "null";
  if (Array.isArray(v)) return `[${v.map(canonique).join(",")}]`;
  const entrees = Object.entries(v as Record<string, unknown>)
    .filter(([, val]) => val !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entrees.map(([k, val]) => `${k}:${canonique(val)}`).join(",")}}`;
}

/**
 * Empreinte déterministe de tout le contenu qui influe sur ce qui est écrit en
 * base : identifiant, périodicité, réalisateurs, libellé, **typologies** et
 * **conditions** de chaque obligation. Deux exécutions sur le même référentiel
 * donnent la même valeur ; toute modification de fond la change.
 *
 * Amendement 2026-08 : typologies, conditions et catégories d'équipement ont
 * été ajoutées. L'empreinte ne couvrait que les quatre premiers champs, si
 * bien qu'une modification du **champ d'application** — restreindre une
 * obligation à certains types d'ERP, la borner par une propriété
 * d'équipement, élargir les catégories qui la déclenchent — ne la déplaçait
 * pas. Or c'est exactement ce genre de changement qui doit déclencher une
 * réconciliation : il fait apparaître ou disparaître des lignes de
 * calendrier, là où une correction de périodicité ne fait que déplacer une
 * date. Le garde-fou laissait donc passer les modifications les plus lourdes
 * de conséquences.
 *
 * Ce qui reste volontairement hors de l'empreinte : `criticite`, `domaine`,
 * `description`, `referencesLegales`, `notesInternes`. Aucun n'est recopié
 * sur la `Verification` et aucun ne décide de son existence — les modifier
 * n'a rien à réconcilier.
 *
 * `equipementsEnContexte` y entre bien qu'il ne déclenche rien : il change ce
 * que la fiche affiche, et une empreinte qui ignore un champ finit par servir
 * d'excuse pour ne pas incrémenter la version. Le coût d'une réconciliation
 * de trop est nul — elle est idempotente (ADR-012).
 *
 * Volontairement simple (somme de contrôle textuelle, pas de hachage
 * cryptographique) : elle sert à détecter un oubli de version, pas à résister
 * à une falsification.
 */
export function empreinteReferentiel(
  obligations: Obligation[] = obligationsConformite,
): string {
  const corps = obligations
    .map((o) =>
      [
        o.id,
        o.periodicite,
        // Le plafond du premier cycle change la DATE de la première occurrence
        // d'un équipement sans historique (`generateur.ts`, branche sans
        // rapport). L'omettre laisserait ce champ modifier un calendrier
        // sans que la réconciliation le sache : ajouté à l'empreinte le
        // 2026-09-01, en même temps que le champ.
        o.premierDelai ?? "",
        o.libelle,
        [...o.realisateurs].sort().join("+"),
        canonique(o.typologies),
        canonique(o.conditions ?? []),
        canonique(o.categoriesEquipement ?? []),
        // Le porteur décide du **nombre** de lignes qu'une obligation engendre
        // — une par équipement, ou une seule pour l'établissement (ADR-022).
        // Le faire changer sans faire bouger l'empreinte laisserait un parc
        // entier avec des lignes que le référentiel n'engendre plus.
        porteurDe(o),
        canonique(o.equipementsEnContexte ?? []),
        // `succedeA` décide de ce que devient une ligne DÉJÀ POSÉE : reprise en
        // place, ou barrée pendant qu'une ligne neuve apparaît. Il change donc
        // le contenu du calendrier, ce que `transmet` ne fait pas — d'où le
        // traitement inverse de celui que la note de `transmet` justifie.
        //
        // Et sans lui, un lot qui ne déclarerait QU'une succession ne ferait
        // bouger aucune empreinte : aucun dossier ne se réconcilierait, et la
        // reprise ne s'appliquerait jamais. La déclaration serait écrite et
        // sans effet, ce qui est le défaut qu'on vient de corriger sur
        // `absorbePar`.
        canonique(o.succedeA ?? []),
        // Le rythme retenu (ADR-039) décide de l'existence et de la date
        // d'une ligne : il entre. Mais EN SEGMENT AJOUTÉ, et seulement quand il
        // est présent — une obligation qui n'en porte pas produit exactement la
        // chaîne d'avant, donc l'ADR-039 seul ne déplace ni l'empreinte ni
        // `REFERENTIEL_VERSION`. Le motif y entre avec le rythme : passer d'un
        // défaut à une norme change ce que la ligne affiche de son origine.
        // `siEquipementDeclare` (2026-10-08, C64) décide de l'EXISTENCE de
        // la ligne d'établissement : il entre, en segment ajouté et seulement
        // quand il est présent, comme le rythme retenu ci-dessous.
        ...(o.porteur === "etablissement" && o.siEquipementDeclare
          ? [`si:${canonique(o.siEquipementDeclare)}`]
          : []),
        ...(o.rythmeRetenu
          ? [
              `rythme:${o.rythmeRetenu.periodicite}:${o.rythmeRetenu.motif}:${
                o.rythmeRetenu.motif === "norme"
                  ? (o.rythmeRetenu.reference.article ?? "")
                  : ""
              }`,
            ]
          : []),
      ].join("|"),
    )
    .sort()
    .join("\n");

  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < corps.length; i += 1) {
    const c = corps.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 + c, 0x85ebca6b) >>> 0;
  }
  const taille = obligations.length;
  return `${taille}-${h1.toString(16)}${h2.toString(16)}`;
}

/**
 * Indexation par id pour lookup O(1) côté moteur de matching et snapshot
 * de calendrier. Construite à la première demande, mémoïsée.
 */
let _index: Map<string, Obligation> | null = null;

export function obligationParId(id: string): Obligation | undefined {
  if (!_index) {
    _index = new Map();
    for (const o of obligationsConformite) _index.set(o.id, o);
  }
  return _index.get(id);
}

export function obligationsParDomaine(
  domaine: DomaineObligation,
): Obligation[] {
  return obligationsConformite.filter((o) => o.domaine === domaine);
}
export * from "./rythme-retenu";
