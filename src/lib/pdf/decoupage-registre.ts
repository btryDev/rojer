import { enPaquetsPeses, feuillesParAnnee, LIGNES_PAR_PAQUET, type SegmentAnnuel } from "./paquets";
import type { FichePdf, LigneRapport, LigneVerif, RegistreData } from "./RegistreDocument";

/**
 * Les `<Page>` du corps du registre — fiches, index des rapports, vérifications
 * en attente et tenue —, écrites UNE fois : le document les rend
 * (`RegistreDocument.tsx`), le garde-fou les pèse (`poids.ts`). Chaque page
 * porte son poids, en lignes : la pesée n'a plus rien à recompter.
 *
 * Pourquoi tout passe par ici (revues de la PR #286, 2026-11-10) :
 *   - deux copies du découpage avaient divergé une fois (l'index coupé en
 *     rapports, pesé en lignes) ;
 *   - un tableau d'un seul tenant au-delà du bloc de 400 lignes rend le
 *     registre ENTIER inexportable : le corps des fiches (journaux et tenues,
 *     qui grossissent avec les années) se découpe donc comme l'index, et
 *     aucune page ne dépasse `LIGNES_PAR_PAQUET` lignes, sauf une ligne seule
 *     plus haute qu'elle — ce qui n'arrive pas.
 */

/** Les lignes qu'un rapport imprime dans l'index : la sienne, une par point à
 *  corriger, et la mention de R. 4226-19 sous un rapport d'électricité à
 *  points (`LigneRapportPdf`). */
export function lignesDuRapport(r: { points: readonly unknown[]; domaine: LigneRapport["domaine"] }): number {
  return 1 + r.points.length + (r.points.length > 0 && r.domaine === "electricite" ? 1 : 0);
}

/** Les lignes qu'une vérification en attente imprime (`LigneAttentePdf`) : la
 *  sienne (libellé et domaine), plus le marquage contractuel, le rythme
 *  retenu et la phrase « À confirmer » quand elles y sont. */
export function lignesDeLAttente(
  v: Pick<LigneVerif, "contractuelle" | "rythmeRetenu" | "aConfirmer">,
): number {
  return 1 + (v.contractuelle ? 1 : 0) + (v.rythmeRetenu ? 1 : 0) + (v.aConfirmer.length > 0 ? 1 : 0);
}

/** Les lignes de tableau d'une fiche : ses champs, son journal ou ses tenues. */
function lignesDeLaFiche(f: FichePdf): number {
  return (f.champs?.length ?? 0) + (f.lignes?.length ?? 0) + (f.tenues?.length ?? 0);
}

/**
 * Un morceau de fiche : la fiche entière, ou, si elle dépasse un paquet, une
 * tranche de ses lignes. Le premier porte la tête (titre, état, attendu), les
 * suivants le titre « (suite) » ; le dernier porte le pied.
 */
export type MorceauFiche = {
  fiche: FichePdf;
  /** La partie, imprimée en tête de son premier morceau seulement. */
  partie: { id: string; titre: string };
  ouvrePartie: boolean;
  suite: boolean;
  dernier: boolean;
  poids: number;
};

/** La fiche coupée à ses lignes `[debut, fin)`, quelle que soit sa forme. */
function trancheDeFiche(f: FichePdf, debut: number, fin: number): FichePdf {
  return {
    ...f,
    ...(f.champs && { champs: f.champs.slice(debut, fin) }),
    ...(f.lignes && { lignes: f.lignes.slice(debut, fin) }),
    ...(f.tenues && { tenues: f.tenues.slice(debut, fin) }),
  };
}

function morceauxDesFiches(data: RegistreData, taille: number): MorceauFiche[] {
  return data.parties.flatMap((partie) =>
    partie.fiches.flatMap((fiche, rangFiche) => {
      const total = lignesDeLaFiche(fiche);
      const tranches = Math.max(1, Math.ceil(total / taille));
      return Array.from({ length: tranches }, (_, k) => {
        const debut = k * taille;
        const fin = Math.min(total, debut + taille);
        return {
          fiche: tranches === 1 ? fiche : trancheDeFiche(fiche, debut, fin),
          partie: { id: partie.id, titre: partie.titre },
          ouvrePartie: rangFiche === 0 && k === 0,
          suite: k > 0,
          dernier: k === tranches - 1,
          poids: fin - debut,
        };
      });
    }),
  );
}

/** La section des vérifications en attente sur une page. */
export type SectionAttente = {
  paquet: LigneVerif[];
  /** Rang du paquet : 0 porte le titre et le nombre, les suivants « (suite) ». */
  rang: number;
  /** Le dernier paquet porte la tenue du registre. */
  dernier: boolean;
};

export type PageRegistre =
  | { genre: "fiches"; morceaux: MorceauFiche[]; poids: number }
  | {
      genre: "index";
      /** La feuille de l'index ; vide sans aucun rapport archivé. */
      feuille: SegmentAnnuel<LigneRapport>[];
      premiere: boolean;
      /** Les vérifications en attente, quand elles tiennent sur la même page. */
      attente: SectionAttente | null;
      poids: number;
    }
  | { genre: "attente"; attente: SectionAttente; poids: number };

/** Une page vide de l'index, pour dire « aucun rapport archivé ». */
const INDEX_VIDE: SegmentAnnuel<LigneRapport>[] = [];

export function pagesDuRegistre(data: RegistreData, taille = LIGNES_PAR_PAQUET): PageRegistre[] {
  // Le corps des fiches, au poids, une fiche jamais coupée au milieu d'une
  // ligne.
  const pagesFiches: PageRegistre[] = enPaquetsPeses(
    morceauxDesFiches(data, taille),
    taille,
    (m) => m.poids,
  ).map((morceaux) => ({
    genre: "fiches",
    morceaux,
    poids: morceaux.reduce((n, m) => n + m.poids, 0),
  }));

  // L'index, par année, au poids des rapports.
  const feuilles = feuillesParAnnee(data.rapports, (r) => r.dateRapport, taille, lignesDuRapport);
  const pagesIndex = (feuilles.length > 0 ? feuilles : [INDEX_VIDE]).map((feuille, f) => ({
    genre: "index" as const,
    feuille,
    premiere: f === 0,
    attente: null as SectionAttente | null,
    poids: feuille.reduce((n, s) => n + s.lignes.reduce((m, r) => m + lignesDuRapport(r), 0), 0),
  }));

  // Les vérifications en attente, au poids : au moins un paquet, vide s'il
  // n'y a rien en attente (il porte alors le fait de l'attente vide, puis la
  // tenue du registre).
  const paquets = data.verifsEnAttente.length === 0 ? [[]] : enPaquetsPeses(data.verifsEnAttente, taille, lignesDeLAttente);
  const sections = paquets.map((paquet, rang) => ({
    attente: { paquet, rang, dernier: rang === paquets.length - 1 },
    poids: paquet.reduce((n, v) => n + lignesDeLAttente(v), 0),
  }));

  // Pas de feuille neuve sans nécessité : le premier paquet en attente
  // rejoint la dernière feuille de l'index quand ils tiennent ensemble — un
  // petit établissement n'imprime pas une feuille par section.
  const derniereIndex = pagesIndex[pagesIndex.length - 1];
  const [premiere, ...suivantes] = sections;
  if (derniereIndex.poids + premiere.poids <= taille) {
    derniereIndex.attente = premiere.attente;
    derniereIndex.poids += premiere.poids;
  } else {
    suivantes.unshift(premiere);
  }

  return [
    ...pagesFiches,
    ...pagesIndex,
    ...suivantes.map((s) => ({ genre: "attente" as const, attente: s.attente, poids: s.poids })),
  ];
}
