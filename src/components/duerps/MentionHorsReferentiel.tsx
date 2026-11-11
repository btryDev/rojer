import { AideEcran } from "@/components/ui-kit/AideEcran";

/**
 * La mention « hors référentiel sectoriel », dans ses deux formats.
 *
 * Pourquoi elle existe : quand une unité n'a pas d'équivalent dans le
 * référentiel sectoriel, la liste des risques proposés est vide. Sans un mot,
 * cet écran vide se lit « il n'y a rien à évaluer ici » alors qu'il dit en
 * réalité « l'outil n'a rien à proposer ici ». Le silence du référentiel ne
 * doit pas prendre l'apparence d'une évaluation.
 *
 * Les deux formats vivent dans le même fichier pour que la vue d'ensemble et
 * la fiche d'unité ne puissent pas se mettre à dire deux choses différentes du
 * même fait.
 *
 * Registre : on décrit ce que fait l'outil, jamais ce que vaut le document.
 * Pas de « incomplet », pas de « non conforme », pas de rassurance inverse.
 *
 * Et pas de couleur d'état non plus : constater que le référentiel se tait
 * n'est ni un retard ni une alerte (charte, interdit 3). La mention porte
 * donc la surface creuse de l'ardoise, comme un sous-bloc.
 */

/** Format court, pour une ligne de liste déjà dense. */
export function LigneHorsReferentiel() {
  return (
    <p className="board-eyebrow m-0 mt-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
      Unité sans modèle · aucun risque proposé d&apos;avance
    </p>
  );
}

/**
 * Format développé, en tête de la fiche d'une unité. Une ligne (2026-11-12) :
 * les trois paragraphes d'origine passent derrière le « ? ».
 */
export function MentionHorsReferentiel() {
  return (
    <section
      aria-label="Unité sans modèle"
      className="flex flex-wrap items-center gap-3 rounded-[22px] bg-[color:var(--board-slate-pale)] px-7 py-4 sm:px-8"
    >
      <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
        Pas de risques proposés pour cette unité&nbsp;: ajoutez les vôtres.
      </p>
      <AideEcran titre="Unité sans modèle">
        <p className="m-0">
          Rojer n&apos;a pas de modèle pour cette unité dans votre secteur :
          c&apos;est à vous de lister les risques, de les coter et de choisir
          les mesures. Chaque risque ajouté démarre sur une cotation neutre, à
          ajuster.
        </p>
        <p className="m-0 mt-3">
          Si l&apos;unité ne présente pas de risque significatif, vous pouvez
          le déclarer et le justifier. Le DUERP indique que cette unité a été
          évaluée hors référentiel sectoriel.
        </p>
      </AideEcran>
    </section>
  );
}
