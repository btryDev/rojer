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
      Hors référentiel sectoriel · aucun risque type proposé
    </p>
  );
}

/** Format développé, en tête de la fiche d'une unité. */
export function MentionHorsReferentiel() {
  return (
    <section
      aria-label="Unité hors référentiel sectoriel"
      className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-7 py-6 sm:px-8"
    >
      <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
        Hors référentiel sectoriel
      </p>
      <p className="m-0 mt-2.5 max-w-[var(--board-mesure)] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
        Cette unité ne correspond à aucune unité type du référentiel sectoriel
        chargé pour votre activité. Aucun risque type ne peut donc vous être
        proposé ici : l&apos;inventaire, la cotation et les mesures de
        prévention sont entièrement à votre main.
      </p>
      <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Ajoutez vos risques un par un depuis «&nbsp;Ajouter un risque
        spécifique&nbsp;» plus bas. Chaque risque ajouté démarre sur une
        cotation neutre — c&apos;est un point de départ à ajuster, pas une
        appréciation. Si après examen l&apos;unité ne présente pas de risque
        significatif, vous pouvez le déclarer et le justifier.
      </p>
      <p className="m-0 mt-3 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Le DUERP généré porte la mention que cette unité a été évaluée hors
        référentiel sectoriel, afin que le lecteur du document sache d&apos;où
        vient son contenu.
      </p>
    </section>
  );
}
