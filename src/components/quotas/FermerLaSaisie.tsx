"use client";
// La saisie fermée annoncée DÈS L'OUVERTURE (ADR-053 § 14, lot D) : un
// formulaire qui écrit ne part plus pour être refusé après coup — ce qui
// faisait perdre ce qui avait été saisi. Dans la zone (`data-zone-saisie`)
// qui le contient, ce composant grise les boutons d'envoi des formulaires qui
// écrivent (server action) et arrête leur envoi, avant que React ne le
// prenne. Les formulaires de lecture (filtres, recherche) restent ouverts,
// comme ceux marqués `data-saisie-ouverte` (demander de l'aide). Le refus du
// serveur reste le filet.

import { useEffect, useRef } from "react";
import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";

/** Un formulaire qui écrit : une server action (React pose `javascript:` ou `POST`). */
export function formulaireQuiEcrit(form: HTMLFormElement): boolean {
  if (form.closest("[data-saisie-ouverte]")) return false;
  return (form.getAttribute("method") ?? "").toLowerCase() === "post" || (form.getAttribute("action") ?? "").startsWith("javascript:");
}

export function FermerLaSaisie({
  motif,
  annonce = false,
  className = "mb-4",
}: {
  motif: string | null;
  /** Dire le motif ici (sinon un autre bandeau le dit déjà). */
  annonce?: boolean;
  className?: string;
}) {
  const repere = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const zone = repere.current?.closest<HTMLElement>("[data-zone-saisie]");
    if (!zone || !motif) return;
    zone.dataset.saisieFermee = "";
    // En capture, sur la zone : avant que l'envoi ne remonte à React.
    const arreter = (e: Event) => {
      const form = e.target;
      if (form instanceof HTMLFormElement && formulaireQuiEcrit(form)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    zone.addEventListener("submit", arreter, true);
    return () => {
      delete zone.dataset.saisieFermee;
      zone.removeEventListener("submit", arreter, true);
    };
  }, [motif]);
  return (
    <>
      <span ref={repere} hidden />
      {motif && annonce ? <BandeauAbonnement bandeau={{ ton: "ferme", message: motif }} className={className} /> : null}
    </>
  );
}
