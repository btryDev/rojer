import { AideEcran } from "@/components/ui-kit/AideEcran";
import { enteteEtape, type EtapeId } from "@/lib/duerps/etapes";

/**
 * L'en-tête d'une page du DUERP (2026-11-12) : « 03 · Risques par unité » en
 * sur-titre (sans chasse fixe), le titre avec son « ? » à côté, puis une
 * phrase. Il était recopié sur chaque page, et les copies dérivaient.
 */
export function EnTeteEtape({
  page,
  titre,
  aide,
  children,
}: {
  page: EtapeId;
  titre?: string;
  /** Les explications, derrière le « ? » du titre. */
  aide?: { titre: string; contenu: React.ReactNode };
  /** La phrase sous le titre : ce qu'on voit, ce qu'on y fait. */
  children?: React.ReactNode;
}) {
  return (
    <header className="flex max-w-[var(--board-mesure)] flex-col gap-2">
      <p className="board-surtitre m-0">{enteteEtape(page)}</p>
      {titre && (
        <div className="flex items-center gap-3">
          <h2 className="board-titre m-0 text-[clamp(23px,2.1vw,30px)]">{titre}</h2>
          {aide && <AideEcran titre={aide.titre}>{aide.contenu}</AideEcran>}
        </div>
      )}
      {children && (
        <p className="m-0 text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {children}
        </p>
      )}
    </header>
  );
}
