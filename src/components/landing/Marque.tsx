import Link from "next/link";

/**
 * La marque de la page publique, provisoire en attendant le logo : le nom
 * sur une pastille bleue. Une seule définition pour l'en-tête et le pied de
 * page — le jour du logo, c'est ici qu'il se pose.
 */
export function Marque() {
  return (
    <Link
      href="/"
      className="inline-flex rounded-full bg-[color:var(--board-sky)] px-3 py-0.5 text-[1.075rem] font-semibold tracking-[-0.03em] text-[color:var(--board-ink)]"
      style={{ fontFamily: "var(--font-titre), sans-serif" }}
    >
      Rojer
    </Link>
  );
}
