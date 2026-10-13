import type { ReactNode } from "react";

/**
 * L'écran d'un incident : page introuvable, erreur d'affichage, panne de la
 * mise en page racine. Un seul gabarit pour `not-found.tsx`, `error.tsx` et
 * `global-error.tsx` (audit du 2026-10-13 : faute de ces fichiers, une
 * exception serveur montrait la page anglaise par défaut de Next).
 *
 * Enveloppe de l'« écran d'entrée étroit » de la charte (§ 5, exception 1) —
 * la même que `/login` et `/signup` : colonne de 460 px centrée sur le canvas.
 * Il n'a rien d'autre à étaler qu'une phrase et un geste.
 *
 * Rien de technique ne s'affiche : ni message d'exception, ni pile. La seule
 * chose montrée est la `reference` — le digest que Next attache à une erreur
 * serveur, qui retrouve la ligne du journal sans rien dire de son contenu.
 */
export function EcranIncident({
  surTitre,
  titre,
  children,
  actions,
  reference,
}: {
  surTitre: string;
  titre: string;
  children: ReactNode;
  actions: ReactNode;
  reference?: string;
}) {
  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col justify-center bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[460px]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          {surTitre}
        </p>
        <h1 className="board-titre m-0 mt-3 text-[clamp(29px,3vw,39px)]">{titre}</h1>
        <div className="m-0 mt-4 max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {children}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>
        {reference ? (
          <p className="m-0 mt-8 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            Référence à communiquer au support :{" "}
            <span className="font-mono tabular-nums text-[color:var(--board-ink)]">{reference}</span>
          </p>
        ) : null}
      </div>
    </main>
  );
}
