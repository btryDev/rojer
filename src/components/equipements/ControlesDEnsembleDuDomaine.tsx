import Link from "next/link";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import { LABEL_DOMAINE } from "@/lib/calendrier/labels";
import { CHAMP_ETAT, libelleEtatCourtCapitale } from "@/lib/calendrier/etats";
import { formaterDateCourteFr } from "@/lib/dates";
import { nombreDePoints } from "@/lib/points-a-corriger/libelles";
import { avecProvenance } from "@/lib/navigation/provenance";
import type { ControleDEnsemble } from "@/lib/equipements/controles-d-ensemble";

/**
 * En tête d'un domaine de la page Équipements : ses contrôles d'ensemble
 * (points à corriger, lot 2 — ADR-048), et ceux d'un autre domaine qui le
 * couvrent aussi, en lien court. Rien s'il n'y en a aucun.
 */
export function ControlesDEnsembleDuDomaine({
  propres,
  aussi,
  etablissementId,
  provenance,
}: {
  propres: ControleDEnsemble[];
  /** Les contrôles d'un autre domaine qui couvrent celui-ci. */
  aussi: ControleDEnsemble[];
  etablissementId: string;
  provenance: string;
}) {
  if (propres.length === 0 && aussi.length === 0) return null;
  const href = (c: ControleDEnsemble) =>
    avecProvenance(`/etablissements/${etablissementId}/verifications/${c.id}`, provenance);
  return (
    <div className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-4">
      {propres.length > 0 && (
        <>
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            {propres.length > 1 ? "Contrôles d'ensemble" : "Contrôle d'ensemble"}
          </p>
          <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
            {propres.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span
                  aria-hidden
                  className="inline-block size-2.5 flex-none rounded-full"
                  style={{ background: CHAMP_ETAT[c.etat] }}
                />
                <Link
                  href={href(c)}
                  className="text-[13.5px] font-semibold text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline"
                >
                  {c.libelle}
                </Link>
                <span className="text-[12.5px] text-[color:var(--board-slate-mid)]">
                  {libelleEtatCourtCapitale(c.etat)}
                  {c.etat !== "aPlanifier" ? ` · ${formaterDateCourteFr(c.datePrevue)}` : ""}
                  {c.pointsOuverts > 0 ? ` · ${nombreDePoints(c.pointsOuverts)}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
      {aussi.length > 0 && (
        <p className={"m-0 text-[12.5px] text-[color:var(--board-slate-mid)]" + (propres.length > 0 ? " mt-3" : "")}>
          Aussi couvert par{" "}
          {aussi.map((c, i) => (
            <span key={c.id}>
              {i > 0 ? ", " : ""}
              <Link href={href(c)} className="font-semibold text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline">
                {c.libelle}
              </Link>
              <span> ({LABEL_DOMAINE[c.domaine as DomaineObligation]})</span>
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
