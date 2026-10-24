import Link from "next/link";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import { LABEL_DOMAINE } from "@/lib/calendrier/labels";
import { CHAMP_ETAT, LIBELLE_ETAT } from "@/lib/calendrier/etats";
import { formaterDateCourteFr } from "@/lib/dates";
import { nombreDePoints } from "@/lib/points-a-corriger/libelles";
import { avecProvenance } from "@/lib/navigation/provenance";
import type { ControleDEnsemble } from "@/lib/equipements/controles-d-ensemble";

const lien = "font-semibold text-[color:var(--board-blue-ink)] underline-offset-4 hover:underline";

/** Ce qu'un contrôle d'ensemble dit de son état, au singulier. */
function etatDuControle(c: ControleDEnsemble): string {
  if (!c.echeanceConnue) {
    return c.etat === "enRetard" ? "Aucune vérification enregistrée" : "À planifier";
  }
  // Fait : un contrôle soldé n'a plus de date à annoncer.
  if (c.etat === "faite") return "Fait";
  const mot = LIBELLE_ETAT[c.etat].un;
  return `${mot.charAt(0).toUpperCase()}${mot.slice(1)} · ${formaterDateCourteFr(c.datePrevue)}`;
}

/**
 * En tête d'un domaine de la page Équipements, ses contrôles d'ensemble
 * (points à corriger, lot 2 — ADR-048). Rien s'il n'en a pas.
 */
export function ControlesDEnsembleDuDomaine({
  controles,
  etablissementId,
  provenance,
}: {
  controles: ControleDEnsemble[];
  etablissementId: string;
  provenance: string;
}) {
  if (controles.length === 0) return null;
  return (
    <div className="rounded-[22px] bg-[color:var(--board-slate-pale)] px-6 py-4">
      <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        {controles.length > 1 ? "Contrôles d'ensemble" : "Contrôle d'ensemble"}
      </p>
      <ul className="m-0 mt-2 flex list-none flex-col gap-2 p-0">
        {controles.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span aria-hidden className="inline-block size-2.5 flex-none rounded-full" style={{ background: CHAMP_ETAT[c.etat] }} />
            <Link
              href={avecProvenance(`/etablissements/${etablissementId}/verifications/${c.id}`, provenance)}
              className={`text-[13.5px] ${lien}`}
            >
              {c.libelle}
            </Link>
            <span className="text-[12.5px] text-[color:var(--board-slate-mid)]">
              {etatDuControle(c)}
              {c.pointsOuverts > 0 ? ` · ${nombreDePoints(c.pointsOuverts)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * En pied d'un domaine : les contrôles d'ensemble d'AUTRES domaines qui le
 * couvrent, nommés par leur domaine (un nom court, une fois chacun), chacun
 * en lien vers son contrôle (contrôle visuel du 2026-10-24 : les titres longs
 * se répétaient ; revue : une ancre vers une carte repliée ne l'ouvrait pas).
 */
export function AussiCouvertPar({
  controles,
  etablissementId,
  provenance,
}: {
  controles: ControleDEnsemble[];
  etablissementId: string;
  provenance: string;
}) {
  const parDomaine = new Map<DomaineObligation, ControleDEnsemble>();
  for (const c of controles) if (!parDomaine.has(c.domaine)) parDomaine.set(c.domaine, c);
  if (parDomaine.size === 0) return null;
  return (
    <p className="m-0 text-[12.5px] text-[color:var(--board-slate-mid)]">
      Aussi vérifié par les contrôles d&apos;ensemble{" "}
      {[...parDomaine.entries()].map(([d, c], i) => (
        <span key={d}>
          {i > 0 ? ", " : ""}
          <Link
            href={avecProvenance(`/etablissements/${etablissementId}/verifications/${c.id}`, provenance)}
            className={lien}
          >
            {LABEL_DOMAINE[d]}
          </Link>
        </span>
      ))}
      .
    </p>
  );
}
