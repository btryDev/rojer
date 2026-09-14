// Construction du « brief » — le bloc éditorial en tête du tableau de bord
// (direction 4a du design Rojer) : une phrase qui dit où on en est, un
// paragraphe qui la justifie, et les deux gestes à faire maintenant.
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

import { FUSEAU_REFERENCE } from "@/lib/dates";
import type { FamilleEcheance } from "@/lib/calendrier/echeances";
import { raccourcirLibelle } from "./libelles";
import type { EtatDuerp } from "./duerp";
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

export type DuerpBrief = {
  existe: boolean;
  /** Aucune échéance de mise à jour dépassée — faux tant qu'aucune version
   *  n'a été validée. */
  estAJour: boolean;
  /**
   * État détaillé (cf. `./duerp`). Optionnel le temps que tous les appelants
   * le transmettent : sans lui, le brief se rabat sur une formulation vraie
   * dans les deux cas plutôt que d'affirmer une ancienneté qu'il ne connaît
   * pas.
   */
  etat?: EtatDuerp;
};

export type RecoBrief = {
  /** Aligné sur le moteur de reco — une seule source de vérité. */
  kind: Recommandation["kind"];
  titre: string;
  href: string;
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
  duerp: DuerpBrief;
  recommandations: RecoBrief[];
  nbRapports: number;
};

export type GesteBrief = {
  /** Sujet, raccourci pour tenir dans la pastille. */
  tag: string;
  /** Libellé complet, pour l'infobulle. */
  tagComplet: string;
  /** Verbe — ce qu'il y a à faire. */
  label: string;
  href: string;
  ton: "neutre" | "alerte";
};

export type Brief = {
  datePill: string;
  titre: string;
  paragraphe: string;
  gestes: GesteBrief[];
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
const FMT_DATE_BRIEF = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formaterDate(d: Date): string {
  const s = FMT_DATE_BRIEF.format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Verbe d'action associé à chaque type de recommandation. */
const VERBE: Record<RecoBrief["kind"], string> = {
  verif_depassee: "Programmer l'intervention",
  action_en_retard: "Replanifier",
  verif_proche: "Planifier",
  action_proche: "Suivre l'action",
  duerp_a_jour: "Mettre à jour",
  amorce_equipements: "Déclarer",
  amorce_duerp: "Ouvrir",
  amorce_rapport: "Déposer",
  // Un verbe qui invite, pas qui somme : ceux-là nomment un écart, pas une
  // échéance (ADR-024).
  transmission_prestataire: "Compléter l'annuaire",
  transmission_salarie: "Voir l'équipe",
  // Le seul des trois qui puisse désigner une obligation non remplie et pas
  // seulement une saisie manquante — d'où un verbe qui ne présume pas que le
  // service existe déjà. « Compléter l'annuaire » l'aurait présumé.
  transmission_tiers_obligatoire: "Déclarer le service",
};

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

const TONS_ALERTE: ReadonlySet<RecoBrief["kind"]> = new Set([
  "verif_depassee",
  "action_en_retard",
]);

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
 * IL PORTE LE VERBE DU RELEVÉ QU'IL COIFFE, et pas son adjectif : « Onze
 * échéances dépassées » aurait recopié mot pour mot, à soixante pixels d'écart,
 * ce que « DÉPASSÉES · 11 » affiche déjà. « ont dépassé leur date » ajoute ce
 * que le titre avait justement faux — de quelle date il s'agit — et parle la
 * même langue que le registre d'états.
 *
 * La garde qui tient la mesure est dans `brief-perimetre.test.ts` : elle fait
 * compter une occurrence de quatre mois et vérifie qu'elle entre bien dans le
 * titre. Le jour où une fenêtre serait posée, elle tombe.
 */
function construireTitre(e: EntreeBrief): string {
  const urgent = e.retards.total;
  if (urgent > 0) {
    // L'accord porte sur deux mots, pas un : « Une échéance a dépassé SA
    // date », « Onze échéances ont dépassé LEUR date ».
    return urgent > 1
      ? `${enLettres(urgent)} échéances ont dépassé leur date`
      : `${enLettres(urgent)} échéance a dépassé sa date`;
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

/**
 * Comment se nomme le retard de chaque famille, au singulier et au pluriel.
 *
 * Le paragraphe ne peut pas se contenter du total : « il reste 25 échéances »
 * ne dit pas s'il s'agit de contrôles à faire venir ou de papiers à
 * redemander, et ces deux-là ne se règlent pas du tout de la même façon.
 * Les libellés d'interface (`LABEL_FAMILLE`) vivent dans un composant, que
 * ce module ne peut pas importer sans tirer React : ce sont les mêmes mots,
 * accordés pour une phrase.
 */
const NOM_RETARD: Record<FamilleEcheance, [string, string]> = {
  controle: ["vérification dépassée", "vérifications dépassées"],
  travaux: ["correction en retard", "corrections en retard"],
  operations: ["opération en retard", "opérations en retard"],
  papiers: ["document à renouveler", "documents à renouveler"],
  // La famille ne portait aucune ligne quand ces mots ont été écrits : ils
  // n'étaient jamais lus. Elle en porte depuis l'ADR-023 — les titres des
  // salariés — et la phrase doit se tenir.
  personnel: ["titre de salarié dépassé", "titres de salariés dépassés"],
};

/** Ordre de lecture du paragraphe — celui du calendrier. */
const ORDRE_FAMILLES: FamilleEcheance[] = [
  "controle",
  "travaux",
  "operations",
  "papiers",
  "personnel",
];

/**
 * Ce que le brief a le droit de dire du DUERP.
 *
 * Trois situations, trois phrases — et surtout pas une seule. Le brief
 * annonçait « Votre DUERP a plus de douze mois » à un dirigeant qui venait
 * de l'ouvrir (aucune version validée ⇒ âge inconnu ⇒ « pas à jour ») et le
 * répétait à une entreprise de quatre salariés, que l'art. R. 4121-2 ne
 * soumet pas à la mise à jour annuelle.
 *
 * Sans `etat`, on ne peut pas trancher : la phrase de repli est alors la
 * seule vraie dans tous les cas — « pas de version validée de moins de douze
 * mois » l'est aussi bien pour un DUERP sans version que pour une version
 * périmée.
 */
function phraseDuerp(duerp: DuerpBrief): string | null {
  if (!duerp.existe) return "Votre DUERP n'est pas encore ouvert.";
  if (duerp.estAJour) return null;

  const etat = duerp.etat;
  if (!etat) return "Votre DUERP n'a pas de version validée de moins de douze mois.";
  if (etat.jamaisValide) {
    return "Aucune version de votre DUERP n'a encore été validée.";
  }
  return "La dernière version de votre DUERP a plus de douze mois.";
}

function construireParagraphe(e: EntreeBrief): string {
  const { duerp } = e;

  const acquis: string[] = [];
  // « À jour » n'est affirmé que sur une version réellement récente : pour
  // une entreprise non soumise à la mise à jour annuelle, une version de
  // quatre cents ans ne serait pas un retard, mais l'annoncer « à jour »
  // dirait davantage que ce qu'on sait.
  const versionRecente = duerp.etat
    ? duerp.etat.versionRecente
    : duerp.estAJour;
  if (duerp.estAJour && versionRecente) acquis.push("votre DUERP est à jour");
  if (e.nbRapports > 0) {
    acquis.push(
      `le registre compte ${e.nbRapports} rapport${e.nbRapports > 1 ? "s" : ""}`,
    );
  }

  const restes: string[] = [];
  for (const famille of ORDRE_FAMILLES) {
    const n = e.retards.parFamille[famille];
    if (n === 0) continue;
    const [singulier, pluriel] = NOM_RETARD[famille];
    restes.push(`${n} ${n > 1 ? pluriel : singulier}`);
  }
  if (e.verifsAPlanifier > 0) {
    restes.push(
      // « À planifier », le mot du statut partout ailleurs : « à programmer »
      // disait la même chose avec un autre mot (relecture des libellés).
      `${e.verifsAPlanifier} vérification${e.verifsAPlanifier > 1 ? "s" : ""} à planifier`,
    );
  }

  const phrases: string[] = [];

  const duerpPhrase = phraseDuerp(duerp);
  if (duerpPhrase) phrases.push(duerpPhrase);

  if (acquis.length > 0) {
    const t = acquis.join(" et ");
    phrases.push(t.charAt(0).toUpperCase() + t.slice(1) + ".");
  }

  if (restes.length > 0) {
    phrases.push(`Il reste ${enumerer(restes)}.`);
  } else if (e.duerp.existe) {
    // Dire explicitement que rien ne traîne : sur un dossier sain, le
    // silence se lit comme un oubli de l'outil plutôt que comme une
    // bonne nouvelle.
    phrases.push("Rien n'est en retard sur votre dossier.");
  }

  return phrases.join(" ");
}

/** « a, b et c » — énumération française. */
function enumerer(items: string[]): string {
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

export function construireBrief(e: EntreeBrief): Brief {
  const gestes: GesteBrief[] = e.recommandations.slice(0, 2).map((r) => ({
    tag: raccourcirLibelle(r.titre),
    tagComplet: r.titre,
    label: VERBE[r.kind],
    href: r.href,
    ton: TONS_ALERTE.has(r.kind) ? "alerte" : "neutre",
  }));

  let titre = construireTitre(e);
  const premiere = e.recommandations[0];
  if (titre === TITRE_CALME && premiere) {
    titre = TITRE_AMORCE[premiere.kind] ?? titre;
  }

  return {
    datePill: formaterDate(e.aujourdhui),
    titre,
    paragraphe: construireParagraphe(e),
    gestes,
  };
}
