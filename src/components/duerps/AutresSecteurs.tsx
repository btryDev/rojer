"use client";

import { useState } from "react";
import { SecteurCard } from "./SecteurCard";

type SecteurOption = {
  id: string;
  nom: string;
  description: string;
  nombreUnites: number;
  nombreRisques: number;
  codesNaf: string[];
};

export function AutresSecteurs({
  duerpId,
  secteurs,
  secteurChoisiId,
  alignDroite = false,
}: {
  duerpId: string;
  secteurs: SecteurOption[];
  secteurChoisiId: string | null;
  alignDroite?: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <button
        data-ecriture
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        className={`board-surtitre group inline-flex items-center gap-2 text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)] ${
          alignDroite ? "self-end" : ""
        }`}
      >
        {ouvert ? "Masquer les autres secteurs" : "Changer de secteur"}
        <span aria-hidden className="text-[13px] leading-none">
          {ouvert ? "−" : "+"}
        </span>
      </button>

      {ouvert && (
        <div className="col-span-full mt-8 grid gap-[22px] border-t border-[color:var(--board-slate-line)] pt-8 md:grid-cols-2 lg:grid-cols-3">
          {secteurs.map((r) => (
            <SecteurCard
              key={r.id}
              duerpId={duerpId}
              secteurId={r.id}
              nom={r.nom}
              description={r.description}
              nombreUnites={r.nombreUnites}
              nombreRisques={r.nombreRisques}
              codesNaf={r.codesNaf}
              recommande={false}
              dejaChoisi={secteurChoisiId === r.id}
            />
          ))}
        </div>
      )}
    </>
  );
}
