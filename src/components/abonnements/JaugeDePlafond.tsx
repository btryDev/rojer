import type { CleQuota, Utilisation } from "@/lib/abonnements/quotas";

/** Le nom de chaque plafond sur une jauge (`LIBELLES_PLAFONDS` les compte : « 3 établissements »). */
export const NOM_DU_PLAFOND: Record<CleQuota, string> = {
  etablissements: "Établissements",
  membres: "Utilisateurs",
  equipements: "Équipements",
  unitesTravail: "Unités de travail",
  zones: "Zones",
  prescriptions: "Prescriptions particulières",
  prestataires: "Prestataires",
  liensAccesActifs: "Liens d'accès actifs",
  permisDeFeuParAn: "Permis de feu",
  plansDePreventionParAn: "Plans de prévention",
  signaturesParAn: "Signatures",
  importsDuerp: "Imports de DUERP",
  stockageGo: "Stockage",
};

const nombre = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });

/**
 * Un plafond et ce qui en est utilisé (page Utilisation, 2026-11-17). Plein,
 * la jauge passe en paille — « proche » au calendrier : rien n'est perdu,
 * mais la prochaine création sera refusée. Sans limite, pas de jauge.
 */
export function JaugeDePlafond({
  utilisation,
  unite,
  note,
}: {
  utilisation: Pick<Utilisation, "cle" | "utilise" | "plafond">;
  /** « Go » pour le stockage. */
  unite?: string;
  note?: string;
}) {
  const { cle, utilise, plafond } = utilisation;
  const plein = plafond !== null && utilise >= plafond;
  const u = unite ? ` ${unite}` : "";
  const valeur =
    plafond === null ? `${nombre.format(utilise)}${u}, sans limite` : `${nombre.format(utilise)} sur ${nombre.format(plafond)}${u}`;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="m-0 flex justify-between gap-3 text-[14px] leading-[1.4]">
        <span>{NOM_DU_PLAFOND[cle]}</span>
        <span
          className={`whitespace-nowrap tabular-nums ${plein ? "font-semibold text-[color:var(--board-amber-ink)]" : "text-[color:var(--board-slate-mid)]"}`}
        >
          {valeur}
          {plein ? ", atteint" : ""}
        </span>
      </p>
      {plafond !== null ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--board-slate-pale)]" aria-hidden>
          <div
            className="h-full rounded-full"
            style={{
              width: `${plafond > 0 ? Math.min(100, (utilise / plafond) * 100) : 100}%`,
              background: plein ? "var(--board-amber-ink)" : "var(--board-blue-strong)",
            }}
          />
        </div>
      ) : null}
      {note ? <p className="m-0 text-[12.5px] text-[color:var(--board-slate-soft)]">{note}</p> : null}
    </div>
  );
}
