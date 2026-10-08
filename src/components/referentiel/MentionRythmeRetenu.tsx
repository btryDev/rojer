import type { MentionRythme } from "@/lib/referentiels/conformite/mention-rythme";

/**
 * La mention d'un rythme que Rojer RETIENT là où le texte n'en écrit pas —
 * ADR-039. Deux formes : « Rythme de la norme NF S 61-919 », « Rythme retenu
 * par défaut ».
 *
 * Même forme que `MentionContractuelle` et `MentionAConfirmer`, pour la même
 * raison : un marquage qui n'existe qu'en un exemplaire ne s'oublie pas sur une
 * surface. Le texte court est visible ; la phrase complète — la norme citée
 * comme norme, ou le mot du texte — est dans le `title` ET dans un `sr-only`.
 *
 * **Fond de carte, encre neutre, filet bleu** — une pastille CERNÉE et non
 * remplie : ni l'ambre (engagement d'assurance, échéance
 * proche), ni le rouge (retard), ni l'ardoise (« à confirmer »). Un rythme
 * retenu n'est ni une urgence ni une question : c'est une annotation sur
 * l'origine d'une date (`docs/charte-board.md` § 1.5). Ni le champ ni l'encre
 * ne sont ceux d'une pastille d'état (`PastilleFiche`, « lointain » et « bleu »
 * portent le bleu plein) : les deux se posent côte à côte, et ne doivent pas
 * se confondre — le test le tient.
 *
 * Le composant ne calcule rien : il reçoit la mention, calculée côté serveur
 * (`mentionRythmeDeVerification`, `mentionRythmeRetenu`).
 */
export function MentionRythmeRetenu({
  mention,
  className = "",
}: {
  mention: MentionRythme | null | undefined;
  className?: string;
}) {
  if (!mention) return null;
  return (
    <span
      className={
        "inline-flex flex-none items-center rounded-full bg-[color:var(--board-card)] px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.06em] text-[color:var(--board-ink)] ring-1 ring-inset ring-[color:var(--board-blue-mid)] " +
        className
      }
      title={mention.long}
    >
      <span aria-hidden>{mention.court}</span>
      <span className="sr-only">{mention.long}</span>
    </span>
  );
}
