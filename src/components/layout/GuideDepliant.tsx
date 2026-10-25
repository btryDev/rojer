"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Le dépliant du guide de mise en place : le bandeau, et sous lui la liste
 * des étapes, ouverte au clic sur « Toutes les étapes ».
 *
 * Client parce que le bouton vit DANS le bandeau, à côté du lien de la
 * prochaine étape, et la liste SOUS lui : un `<details>` exige que sa commande
 * soit son premier enfant, et un `<summary>` ne peut pas contenir de lien.
 * Le contenu (bandeau, étapes, questions posées sur place) reste rendu par le
 * serveur et passe ici en `children`.
 */
export function GuideDepliant({
  bandeau,
  action,
  ouvertAuDepart = false,
  children,
}: {
  /** La partie gauche du bandeau : photo, étape en cours, progression. */
  bandeau: ReactNode;
  /** Le geste de la prochaine étape, posé après le bouton — ou rien. */
  action: ReactNode;
  /**
   * Déplié d'emblée — quand la prochaine étape n'a pas de lien et se règle
   * dans la liste (une question posée sur place) : replié, le bandeau
   * annonçait une étape sans offrir de geste (relecture du 2026-10-25).
   */
  ouvertAuDepart?: boolean;
  /** La liste des étapes, montrée dépliée. */
  children: ReactNode;
}) {
  const [ouvert, setOuvert] = useState(ouvertAuDepart);
  const idListe = useId();
  return (
    <>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-4 bg-[color:var(--board-ink)] p-4 pr-5 text-white sm:pr-6">
        {bandeau}
        <div className="ml-auto flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            aria-expanded={ouvert}
            aria-controls={idListe}
            onClick={() => setOuvert((o) => !o)}
            className="inline-flex h-10 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-white ring-1 ring-white/25 transition-colors hover:bg-white/10"
          >
            {ouvert ? "Masquer les étapes" : "Toutes les étapes"}
            <ChevronDown
              aria-hidden
              className={"size-4 transition-transform " + (ouvert ? "rotate-180" : "")}
            />
          </button>
          {action}
        </div>
      </div>
      <div id={idListe} hidden={!ouvert}>
        {children}
      </div>
    </>
  );
}
