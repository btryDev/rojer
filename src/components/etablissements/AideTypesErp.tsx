// L'aide par type d'ERP (`AIDE_TYPE_ERP`, sous-lot D, 2026-10-17) : ce que
// Rojer ne suit pas pour le type principal et chacun des autres types
// déclarés, dit sous leur choix — à la création comme sur la fiche. Rien ne
// s'affiche pour un type sans aide.

import { aidesDesTypes } from "@/lib/etablissements/aide-type-erp";

export function AideTypesErp({ types }: { types: readonly (string | null | undefined)[] }) {
  const aides = aidesDesTypes(types);
  if (aides.length === 0) return null;
  return (
    <div className="mt-2 flex max-w-[66ch] flex-col gap-1.5" data-aide-types-erp="">
      {aides.map(({ type, aide }) => (
        <p
          key={type}
          data-type-erp={type}
          className="m-0 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
        >
          {aide}
        </p>
      ))}
    </div>
  );
}
