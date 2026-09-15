// La liste mensuelle du calendrier et la règle annuelle qui la résume : les
// mêmes lignes, rangées par mois, puis comptées par état.
//
// Pure et déterministe : l'horloge est injectée (ADR-011). Ce code vivait dans
// la page Calendrier, où aucun test ne l'atteignait ; il en est sorti le
// 2026-09-15 avec la correction du rangement des opérations en cours.

import { composantesCiviles } from "@/lib/dates";
import type { VerificationDatee } from "@/lib/dates/retard";
import type { MoisRegle } from "@/components/calendrier/RegleAnnuelle";
// `import type` : `echeances.ts` ouvre la base.
import type { EcheanceCalendrier } from "./echeances";
import { MOIS_FR, MOIS_FR_COURT } from "./labels";
import {
  aUnRendezVous,
  classerDate,
  dateEnJeuAutre,
  etatAutreEcheance,
  lecturesCalendrier,
  type EtatEcheance,
  type LectureCalendrier,
} from "./etats";

/** Une vérification telle que la page la lit : sa dernière réalisation jointe. */
type VerificationLue = VerificationDatee & { derniereRealisation: Date | null };

/** Une ligne de la liste mensuelle. */
export type LigneMois<V extends VerificationLue> =
  | {
      genre: "verif";
      date: Date;
      v: V;
      // Le registre d'une LECTURE, pas d'une ligne : `archivee` en est
      // exclu par construction (`lecturesCalendrier` n'en produit aucune).
      registre: LectureCalendrier["registre"];
      lecture: LectureCalendrier["lecture"];
    }
  | {
      genre: "autre";
      /** La date EN JEU (`dateEnJeuAutre`) : la fin d'une opération en cours. */
      date: Date;
      e: EcheanceCalendrier;
      /** Calculé une fois ici (`etatAutreEcheance`) : la liste, la règle et la
       *  vue par famille le relisaient chacune. */
      etat: EtatEcheance;
      /** La ligne est posée sur la fin de l'opération, pas sur sa date :
       *  l'écran le dit (`LIBELLE_FIN_OPERATION`). */
      fin: boolean;
    };

/**
 * Les lignes de la liste mensuelle, vérifications et autres échéances mêlées.
 *
 * Une vérification n'est pas posée telle quelle : `lecturesCalendrier` rend au
 * plus deux lectures — le contrôle fait, lu sur son dernier rapport et posé au
 * jour du fait, et l'échéance ouverte à sa date (ADR-034). Posée d'un bloc à
 * `datePrevue`, une rangée d'avant s'affichait en vert « faite »… un an trop
 * tôt.
 *
 * UNE AUTRE ÉCHÉANCE SE RANGE À SA DATE EN JEU (`dateEnJeuAutre`), pas à son
 * début. Rangée au mois de son début, une opération démarrée en mars et
 * finissant dans dix jours comptait « sous 30 j » dans le segment de MARS de
 * la règle, et sa ligne se lisait dans la section de mars, six mois avant ce
 * qui reste à tenir (2026-09-15). Ranger la LIGNE, et non le seul compte,
 * garde la liste, la règle et ses totaux d'accord : le segment d'un mois
 * compte les lignes de sa section.
 */
export function lignesDuCalendrier<V extends VerificationLue>(
  verifs: V[],
  autres: EcheanceCalendrier[],
  now: Date,
): LigneMois<V>[] {
  return [
    ...verifs.flatMap((v) =>
      lecturesCalendrier(v, now).map((lec) => ({
        genre: "verif" as const,
        date: lec.date,
        v,
        registre: lec.registre,
        lecture: lec.lecture,
      })),
    ),
    ...autres.map((e) => {
      const date = dateEnJeuAutre(e, now);
      return {
        genre: "autre" as const,
        date,
        e,
        etat: etatAutreEcheance(e, now),
        fin: date.getTime() !== e.date.getTime(),
      };
    }),
  ];
}

/** Clé `AAAA-MM` du mois civil d'une date, lu en heure de Paris. */
function cleMois(d: Date): string {
  // `getMonth()` sur une date stockée à minuit UTC dépend du fuseau du
  // serveur, et rangeait une échéance du 1er du mois dans le mois précédent
  // sur un hôte à l'ouest de UTC.
  const c = composantesCiviles(d);
  return `${c.annee}-${String(c.mois).padStart(2, "0")}`;
}

/** Les lignes par mois (`AAAA-MM`), triées par date dans chaque mois. */
export function rangerParMois<L extends { date: Date }>(
  lignes: L[],
): Map<string, L[]> {
  const parMois = new Map<string, L[]>();
  for (const l of lignes) {
    const cle = cleMois(l.date);
    const bucket = parMois.get(cle) ?? [];
    bucket.push(l);
    parMois.set(cle, bucket);
  }
  for (const liste of parMois.values()) {
    liste.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
  return parMois;
}

/**
 * L'état d'une ligne sur la règle. Le classement vit dans `etats.ts` : la page
 * l'a redérivé à la main une fois, et ça a produit deux compteurs
 * contradictoires sur le même écran. Le registre d'une ligne de vérification
 * est figé au dépli (`lecturesCalendrier`), plus jamais recalculé.
 */
export function etatDeLaLigne<V extends VerificationLue>(
  l: LigneMois<V>,
  now: Date,
): EtatEcheance {
  // Le ton, jamais la date seule : calculé au rangement (`etatAutreEcheance`).
  if (l.genre !== "verif") return l.etat;
  // « À planifier » (donc à date future — le classifieur a déjà rangé les
  // dates passées en retard) est écarté des barres par `estDatable` ; si la
  // ligne arrive quand même ici, sa date de génération se classe comme une
  // date ordinaire plutôt que d'inventer un état de barre.
  return l.registre === "aPlanifier" ? classerDate(l.date, now) : l.registre;
}

/**
 * « Datable » : mérite une place sur les barres. Une ligne sans échéance
 * connue n'en a pas, EN RETARD OU NON : sa date est une date de génération
 * (`aUnRendezVous`). Ce commentaire, dans la page, disait l'inverse pour une
 * « à planifier » en retard — « le mois où elle est devenue due » —, et la
 * barre de septembre portait un segment rouge sur la date de création de la
 * ligne (relecture du lot C, 2026-09-14). Le fait daté d'un rapport, lui,
 * garde sa place.
 */
export function estDatable<V extends VerificationLue>(
  l: LigneMois<V>,
  now: Date,
): boolean {
  return (
    l.genre !== "verif" ||
    (l.registre !== "aPlanifier" &&
      (l.lecture === "realisation" || aUnRendezVous(l.v, now)))
  );
}

/**
 * Les douze mois d'une année de la règle.
 *
 * Deux règles de fond : les lignes sans échéance connue n'entrent PAS dans les
 * barres — leur date est une date de génération, pas un rendez-vous —, elles
 * sont annoncées à part par le compteur « sans date » ; et la couleur d'un
 * segment dit l'état, jamais le volume (cf. `RegleAnnuelle`).
 */
export function regleDeLAnnee<V extends VerificationLue>(
  parMois: Map<string, LigneMois<V>[]>,
  annee: number,
  now: Date,
): MoisRegle[] {
  return Array.from({ length: 12 }, (_, i) => {
    const cle = `${annee}-${String(i + 1).padStart(2, "0")}`;
    const compte = { enRetard: 0, proche: 0, lointain: 0, faite: 0 };
    let retardSansDate = 0;
    let sansDate = 0;
    for (const l of parMois.get(cle) ?? []) {
      if (!estDatable(l, now)) {
        // Pas de barre. Compté pour la pastille « sans date » de SON année,
        // et, s'il est en retard, pour la couture des années passées.
        sansDate += 1;
        if (l.genre === "verif" && l.registre === "enRetard") retardSansDate += 1;
        continue;
      }
      compte[etatDeLaLigne(l, now)] += 1;
    }
    return {
      cle,
      label: MOIS_FR_COURT[i],
      labelLong: `${MOIS_FR[i]} ${annee}`,
      ...compte,
      retardSansDate,
      sansDate,
    };
  });
}
