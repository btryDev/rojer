"use client";

// LA RÈGLE ANNUELLE — l'année du calendrier lue comme un instrument de
// mesure : douze graduations, une barre par mois, un curseur sur le mois
// ouvert.
//
// Deux dimensions, et elles ne disent pas la même chose :
//
//   - la **hauteur** dit le volume (combien d'échéances ce mois-là) ;
//   - la **couleur** dit l'état, et rien d'autre — dépassé, sous 30
//     jours, à venir, fait.
//
// Mélanger les deux (une teinte plus pâle pour dire « moins nombreux »)
// ferait lire un mois à venir comme un retard : c'est le piège de ce
// genre de graphique, et il est interdit ici. Un mois qui mêle plusieurs
// états empile ses segments, le plus urgent en bas.
//
// La règle remplace la pile de douze sections à dérouler : on vise un
// mois, on l'ouvre. Elle ne porte aucune donnée que la liste n'ait pas —
// c'est la même, vue de loin.
//
// Ce composant ne porte QUE la mesure : les douze graduations et leur
// légende, sur le blanc de l'instrument. Le réglage — le cadran d'année, la
// bascule de lecture, les filtres — vit dans la barre collante que
// `AnneeCalendrier` pose au-dessus. La séparation n'est pas cosmétique :
// la barre doit rester à l'écran pendant tout le défilement de la liste
// (on filtre depuis n'importe quelle date, sans jamais remonter), donc
// elle ne peut pas vivre dans le même bloc que des graduations qui,
// elles, s'en vont avec la page.

import {
  CHAMP_ETAT,
  compteEtat,
  type EtatEcheance,
} from "@/lib/calendrier/etats";

// Le type vit avec le code qui le calcule (`lib/calendrier/regle-annee`) : il
// était défini ici et importé par `lib`, couche inversée (relecture,
// 2026-09-15). Réexporté pour les composants qui le lisaient ici.
import type { MoisRegle } from "@/lib/calendrier/regle-annee";
export type { MoisRegle };

/** Ce qu'aucune barre de l'année ne place : la pastille « sans date ». */
export function sansDateDeLAnnee(mois: MoisRegle[]): number {
  return mois.reduce((n, m) => n + (m.sansDate ?? 0), 0);
}

/** Hauteur de la barre la plus chargée, en pixels. */
const H_MAX = 92;
/**
 * Hauteur plancher d'un segment non vide. Sans elle, un mois à une seule
 * occurrence rend une barre de 2 px : l'instrument devient décoratif et
 * l'utilisateur ne voit pas ce qui l'attend. Le plancher fausse un peu
 * la proportion en bas d'échelle — c'est un prix accepté, la lisibilité
 * d'une échéance isolée compte plus que l'exactitude du rapport 1/19.
 */
const H_MIN_SEGMENT = 9;
/** Hauteur de l'étiquette du mois, sous la ligne de base. */
const H_ETIQUETTE = 38;

type Segment = { cle: string; hauteur: number; fond: string };

/** Total d'un mois, tous états confondus. */
export function totalDuMois(m: MoisRegle): number {
  return m.enRetard + m.proche + m.lointain + m.faite;
}

/**
 * Découpe la barre d'un mois en segments empilés. L'ordre de rendu va du
 * haut vers le bas : faite, lointain, proche, enRetard — le plus urgent
 * porte la base, comme la pile d'une frise.
 */
function segmentsDuMois(m: MoisRegle, maxTotal: number): Segment[] {
  const total = totalDuMois(m);
  if (total === 0) return [];

  const parts = (
    [
      { cle: "faite", n: m.faite },
      { cle: "lointain", n: m.lointain },
      { cle: "proche", n: m.proche },
      { cle: "enRetard", n: m.enRetard },
    ] satisfies { cle: EtatEcheance; n: number }[]
  ).filter((p) => p.n > 0);

  // La hauteur visée suit la proportion, mais ne descend jamais sous le
  // plancher cumulé des segments qu'elle doit contenir.
  const proportionnelle = Math.round((total / maxTotal) * H_MAX);
  const plancher = parts.length * H_MIN_SEGMENT;
  const hauteur = Math.max(plancher, Math.min(H_MAX, proportionnelle));

  return parts.map((p) => ({
    cle: p.cle,
    fond: CHAMP_ETAT[p.cle],
    hauteur: Math.max(H_MIN_SEGMENT, Math.round((p.n / total) * hauteur)),
  }));
}

export function RegleAnnuelle({
  mois,
  moisOuvert,
  onChoisirMois,
  cleMoisCourant,
}: {
  mois: MoisRegle[];
  /** Clé `AAAA-MM` du mois actuellement déplié, s'il est dans l'année. */
  moisOuvert: string | null;
  onChoisirMois: (cle: string) => void;
  /** Clé `AAAA-MM` du mois en cours : ceux d'avant s'estompent. */
  cleMoisCourant: string;
}) {
  const maxTotal = Math.max(1, ...mois.map(totalDuMois));

  // Les totaux de l'année affichée, par état : la légende ne se contente
  // pas de nommer les couleurs, elle donne le solde de chacune.
  const totaux = mois.reduce(
    (acc, m) => ({
      enRetard: acc.enRetard + m.enRetard,
      proche: acc.proche + m.proche,
      lointain: acc.lointain + m.lointain,
      faite: acc.faite + m.faite,
    }),
    { enRetard: 0, proche: 0, lointain: 0, faite: 0 },
  );

  return (
    // La bande de mesure, pleine largeur, sur le même blanc que la barre de
    // réglage collée au-dessus (v3, 2026-10-25) : les deux font un seul
    // instrument, fermé par un filet. Elle était sur le canvas, du même gris
    // que la liste des mois dessous, et la règle se confondait avec le
    // détail. Les marges négatives annulent la gouttière pour toucher les
    // bords.
    <div className="-mx-[var(--board-gutter)] flex flex-col border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] pb-5 pt-3">
      {/* L'instrument. Chaque graduation est un bouton : c'est bien une
          commande, pas une image — le clavier doit y arriver. */}
      <div className="relative grid grid-cols-12 gap-1.5">
        {/* La ligne de base : les barres s'y posent, un mois vide y marque
            son point. Elle passe sous les colonnes, à hauteur fixe de leur
            pied — l'étiquette du mois a une hauteur fixe pour ça. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 h-px bg-[color:var(--board-slate-line)]"
          style={{ bottom: H_ETIQUETTE }}
        />
        {mois.map((m) => {
          const nb = totalDuMois(m);
          const segments = segmentsDuMois(m, maxTotal);
          const actif = m.cle === moisOuvert;
          const vide = nb === 0;
          const passe = m.cle < cleMoisCourant;

          const resume = `${m.labelLong} — ${
            vide
              ? "aucune échéance"
              : `${nb} échéance${nb > 1 ? "s" : ""}` +
                (m.enRetard > 0
                  ? `, dont ${compteEtat(m.enRetard, "enRetard")}`
                  : "")
          }`;
          return (
            <button
              key={m.cle}
              type="button"
              onClick={() => onChoisirMois(m.cle)}
              disabled={vide}
              aria-pressed={actif}
              aria-label={resume}
              className={
                "relative flex flex-col items-center rounded-[14px] px-1 pt-1 transition-colors " +
                (vide
                  ? "cursor-default"
                  : actif
                    // Le mois visé garde son champ : le curseur d'encre du
                    // label ne suffisait pas à retrouver d'un regard où on
                    // en était.
                    ? "bg-[color:var(--board-slate-pale)]"
                    : "hover:bg-[color:var(--board-canvas)]")
              }
            >
              {/* Le compte voyage avec sa barre — posé en haut de la
                  colonne, il flotterait loin d'un mois creux et on ne
                  saurait plus lequel il chiffre. La hauteur donne l'ordre
                  de grandeur, le chiffre donne la valeur. */}
              <span
                className="flex w-full flex-col items-center justify-end gap-2"
                style={{ height: H_MAX + 22 }}
              >
                <span
                  aria-hidden
                  className={
                    "board-titre tabular-nums leading-none " +
                    (vide
                      ? "text-[13px] text-transparent"
                      : actif
                        ? "text-[15px] text-[color:var(--board-ink)]"
                        : passe
                          ? "text-[13px] text-[color:var(--board-slate-soft)]"
                          : "text-[13px] text-[color:var(--board-slate-ink)]")
                  }
                >
                  {vide ? "0" : nb}
                </span>
                {vide ? (
                  // Le point d'un mois vide, centré SUR la ligne de base :
                  // la moitié de sa hauteur passe dessous.
                  <span
                    className={
                      "relative z-[1] size-[9px] flex-none rounded-full bg-[color:var(--board-card)] ring-[1.5px] " +
                      (passe
                        ? "ring-[color:var(--board-slate-line)]"
                        : "ring-[color:var(--board-slate)]")
                    }
                    style={{ marginBottom: -4.5 }}
                  />
                ) : (
                  // Une barre arrondie d'un bloc ; ses états s'empilent,
                  // séparés d'un fin jour.
                  <span className="relative z-[1] flex w-full max-w-[30px] flex-col gap-[2px] overflow-hidden rounded-[9px]">
                    {segments.map((s) => (
                      <span
                        key={s.cle}
                        className="w-full"
                        style={{ height: s.hauteur, background: s.fond }}
                      />
                    ))}
                  </span>
                )}
              </span>

              <span
                className="flex items-center justify-center"
                style={{ height: H_ETIQUETTE }}
              >
                <span
                  className={
                    "font-mono text-[10.5px] uppercase tracking-[0.1em] " +
                    (actif
                      ? "rounded-full bg-[color:var(--board-ink)] px-2.5 py-1 font-semibold text-white"
                      : vide || passe
                        ? "text-[color:var(--board-slate-soft)]"
                        : "text-[color:var(--board-slate-ink)]")
                  }
                >
                  {m.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* La légende. Elle nomme les champs : sans elle, trois couleurs
          côte à côte se lisent comme une échelle de gravité continue. Le
          compte « sans date » a rejoint l'année, dans la barre de réglage
          (2026-10-25) : il chiffre l'année, pas une couleur. */}
      <div className="mt-3 flex flex-wrap items-center gap-x-7 gap-y-2.5">
        <Cle etat="enRetard" valeur={totaux.enRetard} />
        <Cle etat="proche" valeur={totaux.proche} />
        <Cle etat="lointain" valeur={totaux.lointain} />
        <Cle etat="faite" valeur={totaux.faite} />
      </div>
    </div>
  );
}

/**
 * Une entrée de légende : le champ de l'état, son solde, son mot.
 *
 * **`libelle` A ÉTÉ RETIRÉ DE CETTE SIGNATURE (2026-09-04).** La légende
 * écrivait ses quatre mots à la main — et c'est la légende, c'est-à-dire
 * l'endroit qui NOMME les couleurs. Elle disait « en retard », un synonyme que
 * la table refuse depuis que quatre écrans ont nommé le même état de quatre
 * façons ; et « à venir », le mot englobant remplacé partout ailleurs par
 * « au-delà de 30 jours ». Une légende qui ne parle pas la langue de ce qu'elle
 * légende explique une couleur avec un autre mot que l'écran d'à côté.
 *
 * Le composant n'accepte plus de mot : l'état entre, la table rend le mot.
 */
function Cle({
  etat,
  valeur,
}: {
  etat: EtatEcheance;
  /** Le solde de l'état sur l'année affichée. */
  valeur: number;
}) {
  return (
    <span className="flex items-center gap-2 text-[12.5px] text-[color:var(--board-slate-ink)]">
      {/* Un carré du champ, comme un segment de barre : la légende montre
          la couleur telle que la règle la pose. */}
      <span
        aria-hidden
        className="size-3 flex-none rounded-[4px]"
        style={{ background: CHAMP_ETAT[etat] }}
      />
      <strong className="font-semibold tabular-nums text-[color:var(--board-ink)]">
        {valeur}
      </strong>
      {/* `compteEtat` et non `LIBELLE_ETAT[…].plusieurs` : la première version
          du correctif posait le pluriel à côté du badge, ce qui rendait
          « 1dépassées » — sans espace, et au mauvais nombre. Le mot ET son
          accord viennent de la même fonction que partout ailleurs. */}
      {compteEtat(valeur, etat).replace(/^\d+/, "").trim()}
    </span>
  );
}
