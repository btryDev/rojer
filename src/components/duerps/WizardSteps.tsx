import Link from "next/link";

export type Etape = {
  id: string;
  libelle: string;
  href: string;
  /** Accessible : ses prérequis sont remplis, l'étape est un lien. */
  atteinte: boolean;
  /** Complète, lu sur les données (`construireEtapes`). */
  faite: boolean;
  /**
   * La part faite de l'étape, de 0 à 1 (2026-11-11), calculée par
   * `construireEtapes` : le segment se remplit d'autant. Aucun pourcentage
   * n'est écrit — la longueur du trait suffit.
   */
  avancement: number;
  actuelle?: boolean;
  /**
   * Ce qui manque pour que l'étape soit faite, et où le faire. Posé
   * aujourd'hui par la seule étape « Questions transverses », calculée
   * depuis le 2026-10-12 (`construireEtapes`).
   */
  signal?: { texte: string; href: string };
};

/**
 * Le fil des étapes du DUERP, au pied de l'en-tête (2026-11-12, option C
 * retenue par la propriétaire) : une ligne de cinq segments, chacun nommé,
 * sous un filet. Il était une carte puis un bloc pleine largeur au-dessus
 * du contenu ; il fait désormais partie de l'en-tête.
 *
 * Trois états, dits en mots et pas seulement en couleur (interdit 10) :
 * « ✓ » devant une étape faite, l'étape courante en bleu et en gras,
 * `aria-current="step"`. Une étape dont les prérequis manquent n'est pas un
 * lien. Le segment de l'étape courante se remplit de sa part faite.
 */
export function WizardSteps({ etapes }: { etapes: Etape[] }) {
  return (
    <nav aria-label="Étapes du DUERP" className="not-prose">
      <ol className="m-0 grid list-none grid-cols-1 gap-x-2 gap-y-3 p-0 sm:grid-cols-5">
        {etapes.map((e, i) => {
          const numero = String(i + 1).padStart(2, "0");
          const clickable = e.atteinte || e.actuelle;
          const encre = e.actuelle
            ? "bg-[color:var(--board-blue-ink)]"
            : "bg-[color:var(--board-slate-soft)]";
          const corps = (
            <>
              <span
                aria-hidden
                className={`block h-[5px] overflow-hidden rounded-full ${
                  e.actuelle
                    ? "bg-[color:var(--board-blue-pale)]"
                    : "bg-[color:var(--board-slate-line)]"
                }`}
              >
                {e.avancement > 0 && (
                  <span
                    className={`block h-full rounded-full ${encre}`}
                    style={{ width: `${Math.round(e.avancement * 100)}%` }}
                  />
                )}
              </span>
              <span
                className={`mt-2 block truncate text-[13px] leading-[1.35] ${
                  e.actuelle
                    ? "font-semibold text-[color:var(--board-blue-ink)]"
                    : e.faite
                      ? "text-[color:var(--board-ink)]"
                      : "text-[color:var(--board-slate-mid)]"
                } ${clickable ? "group-hover:underline" : ""}`}
              >
                {e.faite ? `✓ ${e.libelle}` : `${numero} · ${e.libelle}`}
              </span>
            </>
          );
          return (
            <li key={e.id} className="min-w-0">
              {clickable ? (
                <Link
                  href={e.href}
                  aria-current={e.actuelle ? "step" : undefined}
                  className="group block underline-offset-4"
                >
                  {corps}
                </Link>
              ) : (
                <div>{corps}</div>
              )}
              {/* Hors du lien de l'étape : deux ancres ne s'imbriquent pas. */}
              {e.signal && (
                <Link
                  href={e.signal.href}
                  className="mt-0.5 inline-block text-[12px] leading-[1.4] text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
                >
                  {e.signal.texte} →
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
