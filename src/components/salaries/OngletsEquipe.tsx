import Link from "next/link";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";

/**
 * Les deux onglets d'Équipe (décision de la propriétaire du 2026-10-24) : les
 * personnes et leurs titres, puis les formations du dossier. Le patron est
 * celui de la découpe de « Ce qui doit être en place » : deux liens, l'actif
 * porte `aria-current`.
 *
 * `aDeclarer` : les formations à mettre en place qui ne sont pas déclarées —
 * l'alerte reste visible depuis l'onglet Personnes.
 */
export function OngletsEquipe({
  etablissementId,
  actif,
  aDeclarer,
}: {
  etablissementId: string;
  actif: "personnes" | "formations";
  aDeclarer: number;
}) {
  const base = `/etablissements/${etablissementId}/equipe`;
  const onglets = [
    { cle: "personnes", href: base, label: "Personnes" },
    { cle: "formations", href: `${base}/formations`, label: "Formations" },
  ] as const;
  return (
    <nav aria-label="Équipe" className="flex">
      <div className="inline-flex rounded-full bg-[color:var(--board-slate-pale)] p-1">
        {onglets.map((o) => (
          <Link
            key={o.cle}
            href={o.href}
            aria-current={o.cle === actif ? "page" : undefined}
            className={
              "inline-flex items-center gap-2 rounded-full px-4 py-[7px] text-[13px] font-semibold transition-colors " +
              (o.cle === actif
                ? "bg-[color:var(--board-card)] text-[color:var(--board-ink)] shadow-[0_1px_2px_rgba(13,18,36,.08)]"
                : "text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
            }
          >
            {o.label}
            {o.cle === "formations" && aDeclarer > 0 && (
              <span
                className="rounded-full px-1.5 text-[11px] tabular-nums"
                style={{ background: CHAMP_ETAT.enRetard, color: ENCRE_ETAT.enRetard }}
                aria-label={`${aDeclarer} à mettre en place`}
              >
                {aDeclarer}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  );
}
