// Les textes d'un matériel que Rojer ne suit pas (revue du lot du 2026-10-14,
// point 3). La page « Ce que Rojer ne couvre pas » nommait chaque article
// qu'elle annonçait (« Articles lus ») ; les annonces déplacées dans la liste
// des matériels doivent rester nommées là où on les lit désormais — l'encart
// du formulaire et la fiche de l'équipement. Rendu sobre : un sur-titre, une
// liste, les références telles que le dépôt les cite.

import type { ReferenceMateriel } from "@/lib/equipements/materiels-non-couverts";

export function ReferencesMateriel({ references }: { references: readonly ReferenceMateriel[] }) {
  if (references.length === 0) return null;
  return (
    <div className="mt-2">
      <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        Textes
      </p>
      <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
        {references.map((r) => (
          <li
            key={r.libelle}
            className="text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
          >
            {r.libelle}
          </li>
        ))}
      </ul>
    </div>
  );
}
