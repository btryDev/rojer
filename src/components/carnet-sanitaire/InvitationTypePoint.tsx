import type { TypePointReleve } from "@prisma/client";

/**
 * L'invitation à préciser le type d'un point créé avant le type (2026-10-14,
 * chantier § 5). Son seul minimum ne dit rien d'un plafond contre la brûlure,
 * et le type ne se devine pas : on le demande.
 *
 * Sortie de `carnet-sanitaire/page.tsx` pour être testée. Revue du même jour :
 * ~~l'encre ambre seule, sans champ~~ — « un champ, une encre, jamais l'un
 * sans l'autre » (charte § 1.5) : le champ `--board-amber` porte l'encre
 * `--board-amber-ink`.
 */
export function InvitationTypePoint({ typePoint }: { typePoint: TypePointReleve | null }) {
  if (typePoint !== null) return null;
  return (
    <p className="m-0 mt-2 max-w-[60ch] rounded-[18px] bg-[color:var(--board-amber)] px-4 py-2.5 text-[12.5px] leading-[1.5] text-[color:var(--board-amber-ink)]">
      Type de point non précisé : ce point n&apos;a qu&apos;un minimum. Précisez où
      il est (« Modifier le point ») pour que Rojer propose aussi le maximum
      contre la brûlure d&apos;un point de puisage.
    </p>
  );
}
