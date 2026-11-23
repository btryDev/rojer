// Le cadre des pages du parcours OAuth (ADR-062 § 7) : une colonne étroite
// centrée, comme `/login` — un geste ponctuel, pas une page du dossier.

import type { ReactNode } from "react";

export function CadreOAuth({ sourcil, titre, children }: { sourcil: string; titre: string; children: ReactNode }) {
  return (
    <main className="flex min-h-[calc(100vh-56px)] flex-col justify-center bg-[color:var(--board-canvas)] px-6 py-14 sm:px-10">
      <div className="mx-auto w-full max-w-[520px]">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">{sourcil}</p>
        <h1 className="board-titre m-0 mt-3 text-[clamp(26px,2.6vw,34px)]">{titre}</h1>
        <div className="carte-board mt-7 px-7 py-6 sm:px-8">{children}</div>
      </div>
    </main>
  );
}

export function DemandeExpiree() {
  return (
    <CadreOAuth sourcil="Connexion d'un assistant" titre="Cette demande n'est plus valable.">
      <p className="m-0 text-[14.5px] leading-[1.55] text-[color:var(--board-ink)]">
        La demande de connexion a expiré ou a été modifiée. Relancez la connexion depuis votre assistant.
      </p>
    </CadreOAuth>
  );
}
