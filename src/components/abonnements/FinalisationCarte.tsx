"use client";
// Au retour de la page de Stripe : appliquer la formule choisie, dès
// l'ouverture (le webhook le fait aussi, si l'onglet a été fermé).

import { useEffect, useRef } from "react";
import { finaliserCarteAction } from "@/lib/abonnements/actions";

export function FinalisationCarte({ sessionId }: { sessionId: string }) {
  const lance = useRef(false);
  useEffect(() => {
    if (lance.current) return;
    lance.current = true;
    void finaliserCarteAction(sessionId);
  }, [sessionId]);
  return (
    <p role="status" className="m-0 text-[14px] leading-[1.55] text-[color:var(--board-slate-mid)]">
      Carte enregistrée : votre abonnement se met en place…
    </p>
  );
}
