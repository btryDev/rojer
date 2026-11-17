// Le détail des offres, replié : le tableau complet sur ordinateur, une
// fenêtre par offre au téléphone (`DetailOffresMobile`). Sorti de `Tarif`
// le 2026-11-17 : la page Formules de l'abonnement le montre tel quel, sous
// les mêmes cartes (décision de la propriétaire, « comme sur la landing »).

import { ChevronRepli, LIEN_REPLI } from "@/components/ui/repli";
import { cn } from "@/lib/utils";
import { DetailOffresMobile } from "./DetailOffresMobile";
import { COLONNES_GRILLE, GRILLE, NOTE_GRILLE, SENS_CASE, TON_CASE } from "./tarif-grille";

/** Le fond de la colonne « Essai ». */
const FOND_ESSAI = "bg-[color:var(--board-amber-wash)]";

export function GrilleDesOffres() {
  return (
    <>
      {/* La grille complète, repliée : la page reste lisible. Au
          téléphone, cinq colonnes ne tiennent pas : le détail s'ouvre en
          fenêtre, une offre à la fois. */}
      <DetailOffresMobile grille={GRILLE} />
      <details className="group mt-10 hidden md:block">
        <summary className={cn(LIEN_REPLI, "mx-auto flex w-max text-[0.92rem] text-[color:var(--board-ink)]")}>
          <ChevronRepli />
          Voir le détail des offres
        </summary>

        <div className="mt-8 overflow-x-auto rounded-[22px] bg-[color:var(--board-card)] shadow-[0_0_0_1px_rgba(13,18,36,0.08)]">
          <table className="w-full min-w-[720px] border-collapse text-[0.9rem]">
            <thead>
              <tr className="border-b border-[color:var(--board-slate-pale)]">
                <th scope="col" className="px-4 py-3 text-left font-semibold">Module</th>
                {COLONNES_GRILLE.map((c, i) => (
                  <th key={c.nom} scope="col" className={cn("w-[15%] px-4 py-3 text-center font-semibold", i === 0 && FOND_ESSAI)}>
                    {c.nom}
                    {c.detail ? (
                      <span className="block text-[0.72rem] font-normal text-[color:var(--board-slate-soft)]">{c.detail}</span>
                    ) : null}
                  </th>
                ))}
              </tr>
            </thead>
            {GRILLE.map((g) => (
              <tbody key={g.titre}>
                <tr>
                  <th
                    colSpan={5}
                    scope="rowgroup"
                    className="bg-[color:var(--board-blue-pale)] px-4 py-2 text-left font-mono text-[0.66rem] font-medium uppercase tracking-[0.14em] text-[color:var(--board-blue-ink)]"
                  >
                    {g.titre}
                  </th>
                </tr>
                {g.lignes.map((l) => (
                  <tr key={l.libelle} className="border-b border-[color:var(--board-slate-pale)] last:border-b-0">
                    <th scope="row" className="px-4 py-3 text-left font-normal">{l.libelle}</th>
                    {l.cases.map((v, i) => (
                      <td key={COLONNES_GRILLE[i].nom} className={cn("px-4 py-3 text-center", TON_CASE[v], i === 0 && FOND_ESSAI)}>
                        {SENS_CASE[v] ? (
                          <>
                            <span aria-hidden>{v}</span>
                            <span className="sr-only">{SENS_CASE[v]}</span>
                          </>
                        ) : (
                          v
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ))}
          </table>
        </div>
        <p className="mt-4 text-center text-[0.78rem] leading-[1.55] text-[color:var(--board-slate-soft)]">{NOTE_GRILLE}</p>
      </details>
    </>
  );
}
