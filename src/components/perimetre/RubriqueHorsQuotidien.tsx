// La rubrique « Obligations légales que Rojer ne suit pas au quotidien » de la
// page « Ce que Rojer ne couvre pas » (ADR-042, le niveau audit du référentiel).
//
// ~~2026-10-18~~ 2026-10-17 [date corrigée le 2026-10-17, revue de l'ADR-046], décision de la propriétaire : SUR CETTE PAGE, LE MOT « AUDIT »
// N'APPARAÎT PAS. Il nomme un marqueur du référentiel, pas quelque chose que le
// dirigeant reconnaît ; il reste dans les aides des catégories et les ADR
// (`EXPLICATION_NIVEAU_AUDIT`, que cette rubrique n'emploie donc plus).
//
// Chaque carte dit le geste (~~`GESTE_HORS_QUOTIDIEN`~~ [2026-10-17, ADR-046 :
// `o.geste`, tiré des réalisateurs par `gesteHorsQuotidien`]) ; la portée ne
// s'écrit que quand elle apprend quelque chose — un équipement déclaré, par le
// libellé de sa catégorie, ou un titre de salarié.
//
// Ni compte, ni date, ni qualification : le libellé, le geste, la portée.
// ~~la référence~~ [2026-10-17, ADR-046 : à l'annexe du PDF du référentiel
// complet, plus sur la page.]

import { type LigneNiveauAudit } from "@/lib/perimetre/niveau-audit";
import { SurTitre } from "./SurTitre";

export const TITRE_HORS_QUOTIDIEN =
  "Obligations légales que Rojer ne suit pas au quotidien";

export function RubriqueHorsQuotidien({
  lignes,
}: {
  lignes: readonly LigneNiveauAudit[];
}) {
  if (lignes.length === 0) return null;
  return (
    <section className="flex flex-col gap-4">
      <div>
        <SurTitre>§ Hors du quotidien</SurTitre>
        <h2 className="board-titre m-0 mt-2 text-[22px]">
          {TITRE_HORS_QUOTIDIEN}
        </h2>
        <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
          Rojer garde ces obligations dans son référentiel, avec leur texte,
          mais ne les suit pas au quotidien : ni calendrier, ni rappel à
          l&apos;écran. Elles sont nommées ici parce qu&apos;elles peuvent
          concerner votre établissement, et restent dues si le texte vous
          concerne.
        </p>
      </div>

      <ul className="m-0 flex list-none flex-col gap-4 p-0">
        {lignes.map((o) => (
          <li key={o.id} className="carte-board min-w-0 px-7 py-6 sm:px-8">
            <h3 className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
              {o.libelle}
            </h3>
            <p
              data-geste
              className="m-0 mt-3 max-w-[68ch] text-[13.5px] font-semibold leading-[1.6] text-[color:var(--board-slate-ink)]"
            >
              {o.geste}
            </p>
            {o.porteePar ? (
              <p className="m-0 mt-1 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                {o.porteePar}
              </p>
            ) : null}
            {/* ~~La référence, en chasse fixe, liée au texte~~ — 2026-10-17,
                ADR-046 : aucune référence d'article sur la page ; elle est à
                l'annexe du PDF du référentiel complet. */}
          </li>
        ))}
      </ul>
    </section>
  );
}
