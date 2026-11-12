"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SecteurCard } from "./SecteurCard";

type SecteurOption = {
  id: string;
  nom: string;
  description: string;
  codesNaf: string[];
};

export function AutresSecteurs({
  duerpId,
  secteurs,
  secteurChoisiId,
}: {
  duerpId: string;
  secteurs: SecteurOption[];
  secteurChoisiId: string | null;
}) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      <div>
        <Button
          data-ecriture
          type="button"
          variant="boardClair"
          size="boardSm"
          onClick={() => setOuvert((o) => !o)}
          aria-expanded={ouvert}
        >
          {ouvert
            ? "Masquer les autres secteurs"
            : `Voir les autres secteurs (${secteurs.length})`}
        </Button>
      </div>

      {ouvert && (
        <div className="grid gap-[22px] md:grid-cols-2 lg:grid-cols-3">
          {secteurs.map((r) => (
            <SecteurCard
              key={r.id}
              duerpId={duerpId}
              secteurId={r.id}
              nom={r.nom}
              description={r.description}
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
