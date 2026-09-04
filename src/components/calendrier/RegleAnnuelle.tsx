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
// légende, sur leur sol de canvas. Le réglage — le cadran d'année, la
// bascule de lecture, les filtres — vit dans la barre collante que
// `AnneeCalendrier` pose au-dessus. La séparation n'est pas cosmétique :
// la barre doit rester à l'écran pendant tout le défilement de la liste
// (on filtre depuis n'importe quelle date, sans jamais remonter), donc
// elle ne peut pas vivre dans le même bloc que des graduations qui,
// elles, s'en vont avec la page.

import {
  CHAMP_ETAT,
  compteEtat,
  ENCRE_ETAT,
  LIBELLE_ETAT,
  type EtatEcheance,
} from "@/lib/calendrier/etats";

/** Un mois de la règle. Les quatre compteurs sont exclusifs entre eux. */
export type MoisRegle = {
  /** Clé `AAAA-MM`, celle des sections de la liste. */
  cle: string;
  /** Libellé court affiché sous la graduation (« Jan », « Fév »…). */
  label: string;
  /** Libellé long, pour les lecteurs d'écran (« janvier 2026 »). */
  labelLong: string;
  enRetard: number;
  proche: number;
  lointain: number;
  /** Occurrences déjà réalisées — le mois n'est pas qu'une dette. */
  faite: number;
};

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
/** Hauteur du trait d'un mois sans aucune échéance. */
const H_VIDE = 6;

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
  sansDate,
}: {
  mois: MoisRegle[];
  /** Clé `AAAA-MM` du mois actuellement déplié, s'il est dans l'année. */
  moisOuvert: string | null;
  onChoisirMois: (cle: string) => void;
  /** Occurrences sans date — hors règle par nature, jamais oubliées. */
  sansDate: number;
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
    // La bande de mesure : pleine largeur, sur le canvas — un cran sous le
    // blanc de la page. Les marges négatives annulent la gouttière pour
    // toucher les bords ; c'est le bloc de la lecture par mois qui soude
    // la mesure à la barre de réglage, en annulant l'écart de la colonne.
    <div className="-mx-[var(--board-gutter)] flex flex-col bg-[color:var(--board-canvas)] px-[var(--board-gutter)] pb-5 pt-6">
      {/* L'instrument. Chaque graduation est un bouton : c'est bien une
          commande, pas une image — le clavier doit y arriver. */}
      <div className="grid grid-cols-12 gap-1.5">
        {mois.map((m) => {
          const nb = totalDuMois(m);
          const segments = segmentsDuMois(m, maxTotal);
          const actif = m.cle === moisOuvert;
          const vide = nb === 0;

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
                "flex flex-col items-center gap-2 rounded-[14px] px-1 pb-2 pt-1 transition-colors " +
                (vide
                  ? "cursor-default"
                  : actif
                    // Le mois visé garde son champ — blanc sur le canvas
                    // de la bande : le curseur d'encre du label ne
                    // suffisait pas à retrouver d'un regard où on en était.
                    ? "bg-[color:var(--board-card)] shadow-[0_1px_3px_rgba(13,18,36,.10)]"
                    : "hover:bg-white/60")
              }
            >
              {/* Le compte voyage avec sa barre — posé en haut de la
                  colonne, il flotterait loin d'un mois creux et on ne
                  saurait plus lequel il chiffre. La hauteur donne l'ordre
                  de grandeur, le chiffre donne la valeur. */}
              <span
                className="flex w-full flex-col items-center justify-end gap-1.5"
                style={{ height: H_MAX + 18 }}
              >
                <span
                  aria-hidden
                  className={
                    "font-mono text-[11px] tabular-nums leading-none " +
                    (vide
                      ? "text-transparent"
                      : actif
                        ? "font-semibold text-[color:var(--board-ink)]"
                        : "text-[color:var(--board-slate-mid)]")
                  }
                >
                  {vide ? "0" : nb}
                </span>
                {vide ? (
                  <span
                    className="w-full max-w-[34px] rounded bg-[color:var(--board-slate-line)]"
                    style={{ height: H_VIDE }}
                  />
                ) : (
                  segments.map((s, i) => (
                    <span
                      key={s.cle}
                      className="w-full max-w-[34px]"
                      style={{
                        height: s.hauteur,
                        background: s.fond,
                        borderTopLeftRadius: i === 0 ? 6 : 0,
                        borderTopRightRadius: i === 0 ? 6 : 0,
                        borderBottomLeftRadius:
                          i === segments.length - 1 ? 6 : 0,
                        borderBottomRightRadius:
                          i === segments.length - 1 ? 6 : 0,
                      }}
                    />
                  ))
                )}
              </span>

              {/* La réglette : trait long sur un mois porteur, court
                  sinon. Le mois ouvert prend le curseur d'encre. */}
              <span
                aria-hidden
                className={
                  "w-px " +
                  (actif
                    ? "h-3.5 bg-[color:var(--board-ink)]"
                    : vide
                      ? "h-1.5 bg-[color:var(--board-slate)]"
                      : "h-2.5 bg-[color:var(--board-slate-soft)]")
                }
                style={actif ? { width: 2 } : undefined}
              />

              <span
                className={
                  "font-mono text-[10.5px] uppercase tracking-[0.1em] " +
                  (actif
                    ? "rounded-full bg-[color:var(--board-ink)] px-2.5 py-1 font-semibold text-white"
                    : vide
                      ? "py-1 text-[color:var(--board-slate)]"
                      : "py-1 text-[color:var(--board-slate-ink)]")
                }
              >
                {m.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* La légende. Elle nomme les champs : sans elle, trois couleurs
          côte à côte se lisent comme une échelle de gravité continue. */}
      <div className="mt-3.5 flex flex-wrap items-center gap-x-9 gap-y-2.5 border-t border-[color:var(--board-slate-line)] pt-4">
        <Cle etat="enRetard" valeur={totaux.enRetard} />
        <Cle etat="proche" valeur={totaux.proche} />
        <Cle etat="lointain" valeur={totaux.lointain} />
        <Cle etat="faite" valeur={totaux.faite} />
        {/* « Hors année » n'a plus de badge : les flèches du cadran font
            le voyage que le badge se contentait d'annoncer. Le badge « à
            planifier » parle, lui, le vocabulaire des pastilles de statut
            — « sans date » disait la même chose avec d'autres mots. */}
        {sansDate > 0 ? (
          <span className="ml-auto rounded-full bg-[color:var(--board-card)] px-3 py-1.5 text-[12px] font-semibold text-[color:var(--board-slate-mid)]">
            {sansDate} à planifier
          </span>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Une clé de légende : le solde dans un cercle qui porte la couleur de
 * l'état — la pastille et la valeur ne font qu'un, le chiffre est SUR sa
 * couleur, et l'œil n'a plus à apparier deux petits objets.
 */
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
  const libelle = LIBELLE_ETAT[etat].plusieurs;
  return (
    <span className="flex items-center gap-2 text-[12px] text-[color:var(--board-slate-mid)]">
      <span
        className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-semibold leading-none tabular-nums"
        style={{ background: CHAMP_ETAT[etat], color: ENCRE_ETAT[etat] }}
      >
        {valeur}
      </span>
      {libelle}
    </span>
  );
}
