// Construction du « brief » — le titre et la date en tête du tableau de bord
// (direction 4a du design Rojer). ~~Une phrase qui dit où on en est, un
// paragraphe qui la justifie, et les deux gestes à faire maintenant.~~
// [2026-10-25 : le paragraphe et les gestes n'avaient plus de lecteur — le
// hero ne porte plus que la date, le titre et la fiche de l'établissement ;
// retirés avec la phrase du DUERP, que seul le paragraphe disait.]
//
// Tout est dérivé des compteurs réels de l'établissement. Aucune chaîne
// n'est décorative : si un chiffre est à zéro, la clause disparaît plutôt
// que d'être remplacée par du remplissage.
//
// Les nombres viennent d'une **seule** source, `lib/calendrier/retards` :
// le brief additionnait auparavant deux familles sur cinq (vérifications
// et actions) et annonçait donc moins de retards que le calendrier, la
// sidebar et le widget posés sur le même écran.
//
// Le module est volontairement structurel (pas d'import de `queries.ts`,
// qui tirerait Prisma) pour rester testable en environnement `node`.

import { formaterJourDateLongueFr } from "@/lib/dates";
import type { FamilleEcheance } from "@/lib/calendrier/echeances";
import type { Recommandation } from "./recommandations";

/**
 * Une ventilation par famille et son total — la forme rendue par
 * `lib/calendrier/retards`, reprise telle quelle pour que les deux ne
 * puissent pas diverger.
 */
export type VentilationBrief = {
  parFamille: Record<FamilleEcheance, number>;
  total: number;
};

export type RecoBrief = {
  /** Aligné sur le moteur de reco — une seule source de vérité. */
  kind: Recommandation["kind"];
};

export type EntreeBrief = {
  aujourdhui: Date;
  /** Le dépassé, toutes familles confondues. */
  retards: VentilationBrief;
  /** Ce qui tombe dans les trente jours sans être dépassé. */
  sous30j: VentilationBrief;
  /**
   * Vérifications sans date de rendez-vous et pas encore dépassées : ni un
   * retard, ni un engagement daté. Annoncé à part, jamais fondu dans les
   * deux ventilations — sans quoi la même occurrence serait comptée deux
   * fois le jour où elle bascule.
   */
  verifsAPlanifier: number;
  /**
   * Parmi les retards, les vérifications SANS ÉCHÉANCE CONNUE : comptées dans
   * `retards`, mais sans date dépassée à annoncer (`construireTitre`).
   */
  verifsEnRetardSansEcheance: number;
  /**
   * Les titres dus à vos salariés qui manquent en retard (ADR-043 (d)) — HORS
   * de `retards`, qui ne les compte pas (ADR-043 § 3 (a)). Le bandeau les
   * nomme sans les additionner : sans eux, il disait « 0 dépassées » et « Rien
   * ne presse » au-dessus d'une carte en retard (audit du 2026-10-12).
   */
  titresDusEnRetard: number;
  /** Les recommandations du moteur : la première décide du titre
   *  d'amorçage d'un dossier calme (`TITRE_AMORCE`). */
  recommandations: RecoBrief[];
};

export type Brief = {
  datePill: string;
  titre: string;
};

const UNITES = [
  "Zéro",
  "Une",
  "Deux",
  "Trois",
  "Quatre",
  "Cinq",
  "Six",
  "Sept",
  "Huit",
  "Neuf",
];

/** « Deux » plutôt que « 2 » jusqu'à neuf — registre éditorial du bloc. */
function enLettres(n: number): string {
  return n < UNITES.length ? UNITES[n] : String(n);
}

// Date du jour en toutes lettres, fuseau épinglé : sans lui, le brief
// annonçait « Dimanche 9 août » un lundi matin sur un serveur en UTC.
function formaterDate(d: Date): string {
  const s = formaterJourDateLongueFr(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Le titre du dossier calme.
 *
 * Une constante, et pas deux chaînes égales : `construireBrief` compare le
 * titre à celle-ci pour décider de le remplacer par une étape d'amorçage, et
 * cette comparaison se serait défaite en silence au premier mot changé — ce qui
 * vient précisément d'arriver à la phrase.
 *
 * « dans les trente jours » et non plus « cette semaine ». La branche n'est
 * atteinte que si les TROIS compteurs sont à zéro, dont `sous30j` : ce que le
 * brief sait alors est plus large que ce qu'il annonçait, et il l'annonçait
 * dans une unité qu'il ne mesure nulle part.
 */
const TITRE_CALME = "Rien ne presse dans les trente jours";

/**
 * Titres d'amorçage : quand le dossier est en mise en place, `TITRE_CALME`
 * est vrai mais trompeur — tout reste à faire.
 * On remplace le titre par l'étape en cours, sur le ton de l'invitation.
 */
const TITRE_AMORCE: Partial<Record<RecoBrief["kind"], string>> = {
  amorce_equipements: "Première étape : vos équipements",
  amorce_duerp: "Prochaine étape : votre DUERP",
  amorce_rapport: "Votre calendrier est en place",
};

/**
 * Parmi les retards, ceux qui n'ont pas d'échéance connue — la part que le
 * titre nomme. Bornée par le total : les deux
 * compteurs sortent de lectures distinctes.
 */
function retardsSansDate(e: EntreeBrief): number {
  return Math.min(e.verifsEnRetardSansEcheance, e.retards.total);
}

/**
 * Le titre du hero — et ce qu'il a le droit de dire.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE TITRE ANNONÇAIT UN DÉLAI QUE SON PROPRE CHIFFRE DÉMENTAIT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Il écrivait « Onze échéances à traiter CETTE SEMAINE » au-dessus d'un relevé
 * « DÉPASSÉES 11 » posé soixante pixels plus bas : le même nombre, deux fois,
 * dont une avec une semaine qui n'existe nulle part dans le calcul. Le
 * calendrier le démentait tout seul — « Voir les 4 mois précédents — 11 en
 * retard », et les barres de mai à août faisaient 1 + 1 + 2 + 7.
 *
 * CE QUE `e.retards.total` AGRÈGE VRAIMENT, mesuré en remontant ses deux
 * sources (`compterEtatEcheances`, `lib/calendrier/retards`) :
 *
 *   — TOUTES LES FAMILLES. `repartirRetards` verse les cinq familles dans une
 *     seule ventilation et en rend la somme.
 *   — TOUS LES PORTEURS. La lecture qui l'alimente ne pose aucune condition sur
 *     `equipementId` : ce que porte l'établissement lui-même et ce que porte un
 *     salarié y sont, à la différence des compteurs du parc et des zones.
 *   — TOUT L'ÉTABLISSEMENT. `BlocBrief` lit `echeancesEtablissement`, le filtre
 *     de zone explicitement ignoré.
 *   — ET AUCUNE FENÊTRE DE TEMPS. C'est le point. `repartirRetards` retient une
 *     ligne sur son TON — `alerte` —, jamais sur sa date : une occurrence
 *     dépassée depuis quatre mois y pèse exactement autant que celle d'hier, et
 *     rien dans la chaîne ne borne l'ancienneté par le bas.
 *
 * Le titre dit donc ce fait-là, et rien de plus : ces échéances ont dépassé
 * leur date. Pas quand, pas depuis combien de temps — le compteur ne le sait
 * pas, et un titre n'a pas à savoir mieux que le nombre qu'il coiffe.
 *
 * SAUF QUAND DES VÉRIFICATIONS N'ONT PAS D'ÉCHÉANCE CONNUE (2026-09-14) : leur
 * date n'est qu'une date de génération, et « ont dépassé leur date » y serait
 * faux. Le titre dit alors « sont dues », qui vaut pour toutes, et nomme la
 * part sans date. ~~Le relevé « DÉPASSÉES » garde son mot et son nombre : c'est
 * l'état du registre d'états, compté sur le ton — et, depuis le 2026-09-15,
 * une légende qui nomme la même part (`precisionReleveRetard`).~~ [2026-10-25 :
 * les relevés ont quitté le hero, et leur légende avec eux.]
 *
 * IL PORTE LE VERBE DU RELEVÉ QU'IL COIFFE, et pas son adjectif : « Onze
 * échéances dépassées » aurait recopié mot pour mot, à soixante pixels d'écart,
 * ce que « DÉPASSÉES · 11 » affiche déjà. « ont dépassé leur date » ajoute ce
 * que le titre avait justement faux — de quelle date il s'agit — et parle la
 * même langue que le registre d'états. [2026-10-25 : le relevé n'est plus
 * affiché, et le titre ne l'est plus quand des échéances sont dépassées — il
 * reste lu par les lecteurs d'écran ; le verbe garde sa raison.]
 *
 * La garde qui tient la mesure est dans `brief-perimetre.test.ts` : elle fait
 * compter une occurrence de quatre mois et vérifie qu'elle entre bien dans le
 * titre. Le jour où une fenêtre serait posée, elle tombe.
 */
function construireTitre(e: EntreeBrief): string {
  const urgent = e.retards.total;
  if (urgent > 0) {
    // « ONT DÉPASSÉ LEUR DATE » N'EST VRAI QUE D'UNE ÉCHÉANCE DATÉE. Une
    // vérification sans échéance connue est comptée dans le retard, mais sa
    // date n'est qu'une date de génération : « 14 échéances ont dépassé leur
    // date » en portait cinq qui n'en ont aucune (contrôle visuel en
    // production, 2026-09-14). Le titre dit alors « sont dues », qui vaut
    // pour les deux, et nomme la part sans échéance.
    const sansEcheance = retardsSansDate(e);
    if (sansEcheance === 0) {
      // L'accord porte sur deux mots, pas un : « Une échéance a dépassé SA
      // date », « Onze échéances ont dépassé LEUR date ».
      return urgent > 1
        ? `${enLettres(urgent)} échéances ont dépassé leur date`
        : `${enLettres(urgent)} échéance a dépassé sa date`;
    }
    if (sansEcheance === urgent) {
      return urgent > 1
        ? `${enLettres(urgent)} vérifications sont dues, sans date connue`
        : `${enLettres(urgent)} vérification est due, sans date connue`;
    }
    return `${enLettres(urgent)} échéances sont dues, dont ${enLettres(
      sansEcheance,
    ).toLowerCase()} sans date connue`;
  }
  // Aucun retard compté, mais des titres dus en retard : le bandeau ne dit
  // ni « dans les trente jours » ni « rien ne presse » au-dessus de leur
  // carte. Il les nomme, sans les fondre dans « Dépassées » (ADR-043 § 3 (a)).
  // Le nombre compte des COUPLES personne × titre (`titresDusEnRetard` somme,
  // titre par titre, les personnes en retard) : deux titres manquant à quatre
  // personnes font huit. ~~« Huit titres dus à vos salariés sont en
  // retard »~~ laissait lire huit titres distincts (relecture indépendante du
  // 2026-10-12) ; la phrase dit comment elle compte.
  if (e.titresDusEnRetard > 0) {
    return e.titresDusEnRetard > 1
      ? `${enLettres(e.titresDusEnRetard)} titres dus à vos salariés, non déclarés, sont en retard — comptés personne par personne`
      : `${enLettres(e.titresDusEnRetard)} titre dû à un salarié, non déclaré, est en retard`;
  }
  const proche = e.sous30j.total;
  if (proche > 0) {
    return `${enLettres(proche)} ${
      proche > 1 ? "échéances" : "échéance"
    } dans les trente jours`;
  }
  if (e.verifsAPlanifier > 0) {
    return `${enLettres(e.verifsAPlanifier)} ${
      e.verifsAPlanifier > 1 ? "vérifications" : "vérification"
    } restent à planifier`;
  }
  return TITRE_CALME;
}

export function construireBrief(e: EntreeBrief): Brief {
  let titre = construireTitre(e);
  const premiere = e.recommandations[0];
  if (titre === TITRE_CALME && premiere) {
    titre = TITRE_AMORCE[premiere.kind] ?? titre;
  }

  return {
    datePill: formaterDate(e.aujourdhui),
    titre,
  };
}
