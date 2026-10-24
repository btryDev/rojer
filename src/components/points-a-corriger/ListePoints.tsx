import Link from "next/link";
import { BadgeStatutAction } from "@/components/actions/BadgeStatutAction";
import { formaterDateCourteFr } from "@/lib/dates";
import { estActionEnRetard } from "@/lib/dates/retard";
import { avecProvenance } from "@/lib/navigation/provenance";
import { LABEL_RESULTAT } from "@/lib/rapports/resultats";
import type { PointListe } from "@/lib/points-a-corriger/queries";

/**
 * Les points à corriger d'un appareil ou d'un contrôle (ADR-048), en cartes.
 * Chaque carte mène à la fiche du point, où il se corrige.
 *
 * Le rapport d'origine est toujours dit. `avecControle` ajoute le contrôle
 * (fiche d'un équipement, qui en porte plusieurs) ; `avecAppareil`, l'appareil
 * désigné (page d'un contrôle d'ensemble).
 */
export function ListePoints({
  points,
  etablissementId,
  provenance,
  aujourdhui,
  avecControle = false,
  avecAppareil = false,
}: {
  points: PointListe[];
  etablissementId: string;
  provenance: string;
  aujourdhui: Date;
  avecControle?: boolean;
  avecAppareil?: boolean;
}) {
  return (
    <ul className="m-0 grid list-none grid-cols-1 gap-4 p-0 md:grid-cols-2">
      {points.map((p) => {
        // Même prédicat que partout : une échéance du jour n'est pas en
        // retard, un point corrigé ou abandonné ne l'est jamais.
        const enRetard = estActionEnRetard(p, aujourdhui);
        const origine = [
          avecControle ? p.verification?.libelleObligation : null,
          avecAppareil ? p.equipement?.libelle : null,
          p.rapportOrigine
            ? `rapport du ${formaterDateCourteFr(p.rapportOrigine.dateRapport)} (${LABEL_RESULTAT[p.rapportOrigine.resultat]})`
            : null,
        ]
          .filter(Boolean)
          .join(" · ");
        return (
          <li key={p.id}>
            <Link
              href={avecProvenance(`/etablissements/${etablissementId}/actions/${p.id}`, provenance)}
              className="carte-board block h-full px-6 py-5 transition-colors hover:bg-[color:var(--board-slate-pale)]"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="m-0 text-[14.5px] font-semibold leading-[1.35]">{p.libelle}</p>
                <BadgeStatutAction statut={p.statut} point />
              </div>
              {origine && (
                <p className="m-0 mt-1.5 text-[12px] text-[color:var(--board-slate-mid)]">{origine}</p>
              )}
              <p
                className="m-0 mt-3 text-[12.5px]"
                style={{ color: enRetard ? "var(--board-signal-ink)" : "var(--board-slate-mid)" }}
              >
                {p.statut === "levee" && p.leveeLe
                  ? `Corrigé le ${formaterDateCourteFr(p.leveeLe)}`
                  : p.echeance
                    ? `À corriger avant le ${formaterDateCourteFr(p.echeance)}`
                    : "Pas d'échéance"}
                {p.responsable && p.statut !== "levee" ? ` · ${p.responsable}` : ""}
              </p>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
