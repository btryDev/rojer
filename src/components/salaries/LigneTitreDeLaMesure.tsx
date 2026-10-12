import Link from "next/link";
import { titreAppeleParLaMesure } from "@/lib/salaries/titres-des-mesures";

/**
 * Sous une action du DUERP née d'une mesure de formation : où le titre se
 * déclare (`titres-des-mesures.ts`, 2026-10-12).
 *
 * Une ligne d'information, pas un état : elle ne dit ni « fait » ni « en
 * retard » — lever l'action ne déclare aucun titre, et le produit ne sait
 * pas qui est concerné (ADR-023 § 1 bis). Rien ne s'affiche pour une mesure
 * qui n'appelle aucun titre.
 */
export function LigneTitreDeLaMesure({
  referentielMesureId,
  etablissementId,
  className = "",
}: {
  referentielMesureId: string | null | undefined;
  etablissementId: string;
  className?: string;
}) {
  const titre = titreAppeleParLaMesure(referentielMesureId);
  if (!titre) return null;
  return (
    <p
      className={`m-0 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)] ${className}`}
    >
      Se déclare salarié par salarié&nbsp;:{" "}
      <span className="font-medium text-[color:var(--board-ink)]">
        {titre.libelle}
      </span>{" "}
      <Link
        href={`/etablissements/${etablissementId}/equipe`}
        className="whitespace-nowrap font-semibold text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
      >
        Ouvrir Équipe →
      </Link>
    </p>
  );
}
