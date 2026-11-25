// Le rendez-vous annuel de la formule Pro (ADR-063) : ce que l'écran,
// l'action et les e-mails partagent. Module pur, sans horloge : l'instant
// présent est toujours passé par l'appelant.

import type { ModeRendezVous } from "@prisma/client";
import { FUSEAU_REFERENCE, ajouterJours, ajouterMois, cleJourCivil, composantesCiviles, debutDuJour } from "@/lib/dates";

/** Réserver, déplacer, annuler, compléter : jusqu'à 24 h avant le début (ADR-063 § 3, § 4). */
export const DELAI_RENDEZ_VOUS_MS = 24 * 60 * 60 * 1000;

/**
 * Les créneaux se prennent sur un mois (décision de la propriétaire du
 * 2026-11-24) : de 24 h après maintenant à un mois après. Un créneau ouvert
 * plus loin attend d'entrer dans la fenêtre.
 */
export function fenetreDesCreneaux(maintenant: Date): { depuis: Date; jusqua: Date } {
  return { depuis: new Date(maintenant.getTime() + DELAI_RENDEZ_VOUS_MS), jusqua: ajouterMois(maintenant, 1) };
}

/** Le rendez-vous commence dans plus de 24 h : il se prend, se déplace, s'annule encore. */
export function aPlusDe24h(debut: Date, maintenant: Date): boolean {
  return debut.getTime() - maintenant.getTime() > DELAI_RENDEZ_VOUS_MS;
}

/** Le dernier instant où le rendez-vous se déplace ou s'annule en ligne. */
export function limiteDeModification(debut: Date): Date {
  return new Date(debut.getTime() - DELAI_RENDEZ_VOUS_MS);
}

export const MODES_RENDEZ_VOUS = ["visio", "telephone"] as const satisfies readonly ModeRendezVous[];

export const LABEL_MODE: Record<ModeRendezVous, string> = {
  visio: "En visio",
  telephone: "Par téléphone",
};

export const TELEPHONE_MAX = 30;
export const SUJET_RENDEZ_VOUS_MAX = 2000;

export const MESSAGE_RENDEZ_VOUS_PRO = "Le rendez-vous annuel vient avec la formule Pro.";
export const MESSAGE_CRENEAU_PRIS = "Ce créneau vient d'être pris. Choisissez-en un autre.";
export const MESSAGE_CRENEAU_HORS_FENETRE =
  "Ce créneau ne se réserve plus : il commence dans moins de 24 h. Choisissez-en un autre.";
export const MESSAGE_ANNEE_PRISE =
  "Le rendez-vous de cette année est déjà réservé : un seul par année d'abonnement, pour tout le compte.";
export const MESSAGE_MOINS_DE_24H =
  "À moins de 24 h, le rendez-vous ne se déplace plus et ne s'annule plus en ligne.";
export const MESSAGE_RENDEZ_VOUS_INTROUVABLE = "Ce rendez-vous n'est plus à venir.";
export const MESSAGE_APRES_FIN_PRO =
  "Ce créneau tombe après la fin de votre formule Pro : choisissez-en un avant.";
export const MESSAGE_DEJA_A_VENIR =
  "Un rendez-vous est déjà prévu pour le compte : déplacez-le plutôt que d'en réserver un autre.";

/**
 * Ce que dit l'écran quand un geste échoue sans refus (envoi en panne, base
 * indisponible) : rien n'a changé, et ce qui est à refaire (relecture du
 * 2026-11-25 — la phrase du formulaire de contact ne disait pas cela).
 */
export const MESSAGE_ECHEC: Record<"reserver" | "annuler" | "completer", string> = {
  reserver: "Rien n'a changé : le rendez-vous n'a pas pu être enregistré. Réessayez dans quelques minutes.",
  annuler: "Rien n'a changé : le rendez-vous n'a pas pu être annulé. Réessayez dans quelques minutes.",
  completer: "Ce que vous avez écrit n'a pas pu être transmis. Réessayez dans quelques minutes : votre texte est conservé.",
};

// --- Les dates dites, à l'heure de Paris -----------------------------------

const FMT_JOUR = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  weekday: "long",
  day: "numeric",
  month: "long",
});
const FMT_JOUR_MOIS = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU_REFERENCE, day: "numeric", month: "long" });
const FMT_MOIS = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU_REFERENCE, month: "long", year: "numeric" });

/** Le premier du mois s'écrit « 1er ». */
const premier = (s: string) => s.replace(/(^|\s)1(\s)/, "$11er$2");

/** « 9 h », « 10 h 30 », à l'heure de Paris. */
export function heureCourte(d: Date): string {
  const { heure, minute } = composantesCiviles(d);
  return minute === 0 ? `${heure} h` : `${heure} h ${String(minute).padStart(2, "0")}`;
}

/** « 9 h – 10 h ». */
export function plageHoraire(debut: Date, fin: Date): string {
  return `${heureCourte(debut)} – ${heureCourte(fin)}`;
}

/** « jeudi 3 décembre », « mardi 1er décembre ». */
export function jourSansAnnee(d: Date): string {
  return premier(FMT_JOUR.format(d));
}

/** « jeudi 3 décembre 2026 ». */
export function jourAvecAnnee(d: Date): string {
  return `${jourSansAnnee(d)} ${composantesCiviles(d).annee}`;
}

/** « 24 novembre », « 1er décembre ». */
export function jourMois(d: Date): string {
  return premier(FMT_JOUR_MOIS.format(d));
}

/** « 13 mars 2027 », « 1er mars 2027 ». */
export function dateLongue(d: Date): string {
  return `${jourMois(d)} ${composantesCiviles(d).annee}`;
}

/**
 * Le premier jour civil (Paris) qui commence après `d` ou à `d` : le jour
 * même si `d` tombe à minuit, sinon le lendemain. Une année d'abonnement qui
 * bascule à 15 h 23 n'a commencé, pour un jour entier, que le lendemain.
 */
export function premierJourEntier(d: Date): Date {
  return debutDuJour(d).getTime() === d.getTime() ? d : ajouterJours(d, 1);
}

/** « décembre 2026 ». */
export function moisAnnee(d: Date): string {
  return FMT_MOIS.format(d);
}

/** « jeudi 3 décembre 2026, 10 h – 11 h » : l'objet des e-mails, la date du rendez-vous. */
export function quandLeRendezVous(debut: Date, fin: Date): string {
  return `${jourAvecAnnee(debut)}, ${plageHoraire(debut, fin)}`;
}

/** « mercredi 2 décembre à 10 h » : jusqu'à quand il se déplace ou s'annule. */
export function jusquAQuand(debut: Date): string {
  const limite = limiteDeModification(debut);
  return `${jourSansAnnee(limite)} à ${heureCourte(limite)}`;
}

/** La majuscule d'un début de phrase ou de titre. */
export const majuscule = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const EN_LETTRES = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix"];

/** « votre établissement y passe », « vos deux établissements y passent ». */
export function lesEtablissementsYPassent(n: number): string {
  if (n <= 1) return "votre établissement y passe";
  return `vos ${EN_LETTRES[n] ?? n} établissements y passent`;
}

/** « Lyon 3e », « Lyon 3e et Villeurbanne », « A, B et C ». */
export function enumeration(noms: readonly string[]): string {
  if (noms.length <= 1) return noms[0] ?? "";
  return `${noms.slice(0, -1).join(", ")} et ${noms.at(-1)}`;
}

// --- Les créneaux, à l'écran ------------------------------------------------

/** Un créneau tel que la page le passe à l'écran : des dates en texte ISO. */
export type CreneauAffiche = { id: string; debut: string; fin: string };

/** « 2026-12 », le mois civil (Paris) d'un créneau. */
export const moisDe = (iso: string) => cleJourCivil(new Date(iso)).slice(0, 7);

/** Les créneaux rangés par jour civil (Paris), dans l'ordre où ils viennent. */
export function creneauxParJour<T extends { debut: string }>(creneaux: readonly T[]): { jour: string; creneaux: T[] }[] {
  const jours: { jour: string; creneaux: T[] }[] = [];
  for (const c of creneaux) {
    const jour = cleJourCivil(new Date(c.debut));
    const dernier = jours.at(-1);
    if (dernier?.jour === jour) dernier.creneaux.push(c);
    else jours.push({ jour, creneaux: [c] });
  }
  return jours;
}

/**
 * La grille d'un mois (« 2026-12 »), lundi en tête : des cases vides avant le
 * premier, puis un jour par case. Les jours de la semaine se lisent en UTC,
 * où un jour civil tombe le même jour que partout.
 */
export function grilleDuMois(mois: string): (number | null)[] {
  const [annee, m] = mois.split("-").map(Number);
  const premierJour = (new Date(Date.UTC(annee, m - 1, 1)).getUTCDay() + 6) % 7;
  const longueur = new Date(Date.UTC(annee, m, 0)).getUTCDate();
  return [...Array<null>(premierJour).fill(null), ...Array.from({ length: longueur }, (_, i) => i + 1)];
}

/** Comment on se parle : la carte, les e-mails et l'invitation le disent ainsi. */
export function commentSeParler(mode: ModeRendezVous, telephone: string | null): string {
  if (mode === "telephone") return `Par téléphone : nous vous appelons${telephone ? ` au ${telephone}` : ""}.`;
  return `En visio : le lien arrive par e-mail avant le rendez-vous.${
    telephone ? ` En cas de souci de connexion, nous vous appelons au ${telephone}.` : ""
  }`;
}
