// La phrase de fraîcheur du calendrier, telle qu'un écran la montre.
//
// Sortie de « Préparer un contrôle » le 2026-10-13, où elle était écrite en
// place, pour que les écrans qui lisent des lignes de vérification sans les
// réparer (`docs/chantiers-ouverts.md` § 12) la disent avec les mêmes mots et
// le même habit. La phrase vient de `phraseFraicheur` : ce composant ne choisit
// rien, il ne fait que la poser — et ne pose rien quand le calendrier est à
// jour.

import { cn } from "@/lib/utils";

/**
 * Rend la phrase de fraîcheur, ou rien quand elle vaut `null` (calendrier à
 * jour). L'appelant la calcule par `phraseFraicheur(await fraicheurCalendrier(id))`,
 * en parallèle de ses autres lectures : la lecture du repère n'écrit rien,
 * elle n'a donc pas à passer avant elles.
 */
export function AvertissementFraicheur({
  phrase,
  className,
}: {
  phrase: string | null;
  /** Placement propre à l'écran (marge haute, largeur). */
  className?: string;
}) {
  if (!phrase) return null;
  return (
    <p
      role="status"
      className={cn(
        "max-w-prose rounded-md border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-4 py-3 text-[0.85rem] leading-relaxed text-[color:var(--board-ink)]/85",
        className,
      )}
    >
      {phrase}
    </p>
  );
}
