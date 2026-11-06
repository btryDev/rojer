"use client";
// La saisie fermée annoncée DÈS L'OUVERTURE (ADR-053 § 14, lot D) : un
// formulaire qui écrit ne part plus pour être refusé après coup — React
// efface la saisie au retour, même en refus. Les boutons d'envoi des
// formulaires qui écrivent (server action) sont grisés, et leur envoi arrêté
// en capture, avant que React ne le prenne. Les formulaires de lecture
// (filtres) restent ouverts, comme ceux marqués `data-saisie-ouverte`
// (demander de l'aide, se déconnecter). Le refus du serveur reste le filet.
//
// Deux formes :
// - `FermerLaSaisie` enveloppe ce qu'elle ferme (une création au plafond, une
//   fiche gelée) : sa zone est la sienne, rendue côté serveur ;
// - `VerrouDeLaPage`, frère des pages dans une mise en page (`data-zone-saisie`),
//   ferme toute la page — panneaux en portail compris (`data-portail-saisie`) —
//   sans retarder son rendu.

import { useEffect, useRef } from "react";
import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";

/** Un formulaire qui écrit : une server action (React pose `javascript:` ou `POST`). */
export function formulaireQuiEcrit(form: HTMLFormElement): boolean {
  if (form.hasAttribute("data-saisie-ouverte")) return false;
  return (form.getAttribute("method") ?? "").toLowerCase() === "post" || (form.getAttribute("action") ?? "").startsWith("javascript:");
}

/** Arrête, en capture sur `cible`, l'envoi des formulaires qui écrivent et que `garde` retient. */
function arreterLesEnvois(cible: EventTarget, garde: (form: HTMLFormElement) => boolean): () => void {
  const arreter = (e: Event) => {
    const form = e.target;
    if (form instanceof HTMLFormElement && formulaireQuiEcrit(form) && garde(form)) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  cible.addEventListener("submit", arreter, true);
  return () => cible.removeEventListener("submit", arreter, true);
}

export function FermerLaSaisie({
  motif,
  className = "mb-4",
  children,
}: {
  motif: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const zone = useRef<HTMLDivElement>(null);
  useEffect(() => (motif && zone.current ? arreterLesEnvois(zone.current, () => true) : undefined), [motif]);
  return (
    <div ref={zone} data-zone-saisie data-saisie-fermee={motif ? "" : undefined} className="contents">
      {motif ? <BandeauAbonnement bandeau={{ ton: "ferme", message: motif }} className={className} /> : null}
      {children}
    </div>
  );
}

/**
 * La place du bandeau d'une page : la bande du haut, à gauche de la gélule du
 * compte — le seul endroit que l'en-tête de page ne recouvre pas (il remonte
 * sous la bande, `.sous-la-gelule`). Sur téléphone, en bas. La même que le
 * bandeau de l'abonnement (`BandeauAbonnementDuCompte`), qui ne s'affiche pas
 * en même temps (`saisieFermeeDuSite`).
 */
const DANS_LA_BANDE =
  "fixed inset-x-3 bottom-[calc(var(--reserve-nav-bas)+0.75rem)] z-40 " +
  "md:absolute md:inset-x-auto md:bottom-auto md:left-[var(--board-gutter)] md:top-[19px] md:w-fit " +
  "md:max-w-[calc(100%-var(--board-gutter)*2-9rem)]";

export function VerrouDeLaPage({ motif, annonce = false }: { motif: string | null; annonce?: boolean }) {
  const repere = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const zone = repere.current?.closest<HTMLElement>("[data-zone-saisie]");
    if (!zone || !motif) return;
    zone.dataset.saisieFermee = "";
    // Sur le document : un panneau en portail sort de la zone dans le DOM, pas de la page.
    const retirer = arreterLesEnvois(document, (form) => zone.contains(form) || form.closest("[data-portail-saisie]") !== null);
    return () => {
      delete zone.dataset.saisieFermee;
      retirer();
    };
  }, [motif]);
  return (
    <>
      <span ref={repere} hidden />
      {motif && annonce ? <BandeauAbonnement bandeau={{ ton: "ferme", message: motif }} compact className={DANS_LA_BANDE} /> : null}
    </>
  );
}
