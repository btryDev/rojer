"use client";

// Le défibrillateur PARTAGÉ avec un établissement voisin (CCH, art. R. 157-3 ;
// ADR-057 § 4, décision de la propriétaire du 2026-11-06). Sans appareil au
// parc, la détention se déclare d'une case, ici et nulle part ailleurs : la
// maintenance et la déclaration Géo'DAE reviennent au voisin, aucune ligne ne
// naît chez soi. Une déclaration, pas une preuve (ADR-027). Le repère est posé
// par l'action (`basculerDaePartage`), jamais par le navigateur.

import { unstable_rethrow } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { basculerDaePartage } from "@/lib/etats-permanents/actions";

/** Le message quand l'action n'a pas répondu (réseau, serveur). */
const ERREUR_ENREGISTREMENT = "L'enregistrement n'a pas abouti. Réessayez.";

export function CasePartageDae({
  etablissementId,
  partage,
  libelle,
  fermeture = null,
}: {
  etablissementId: string;
  partage: boolean;
  /** Le libellé de la case — `NOTE_DAE_PARTAGE`, passé par le serveur. */
  libelle: string;
  /**
   * La saisie fermée (ADR-053 § 14), dite dès l'ouverture comme les
   * formulaires (`FermerLaSaisie`, qui ne voit pas cette case hors de tout
   * formulaire). Site gelé : cocher est fermé, décocher (retirer une
   * déclaration) reste ouvert ; sinon tout est fermé.
   */
  fermeture?: { motif: string; gel: boolean } | null;
}) {
  const [pending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);
  const idMotif = useId();
  const fermee = fermeture !== null && (!fermeture.gel || !partage);
  return (
    <div className="mt-3">
      <label className="flex items-center gap-2.5 text-[13px] leading-[1.5] text-[color:var(--board-slate-ink)]">
        <input
          type="checkbox"
          checked={partage}
          disabled={pending || fermee}
          aria-describedby={fermee ? idMotif : undefined}
          onChange={(e) => {
            const coche = e.target.checked;
            setErreur(null);
            startTransition(async () => {
              try {
                const res = await basculerDaePartage(etablissementId, coche);
                if (res.status === "error") setErreur(res.message);
              } catch (err) {
                // Une redirection (saisie fermée, ADR-053) n'est pas un échec : Next la reprend.
                unstable_rethrow(err);
                setErreur(ERREUR_ENREGISTREMENT);
              }
            });
          }}
          className="size-4 accent-[color:var(--board-blue-strong)]"
        />
        {libelle}
      </label>
      {fermee ? (
        <p id={idMotif} className="m-0 mt-1 text-[12.5px] text-[color:var(--board-slate-soft)]">
          {fermeture.motif}
        </p>
      ) : null}
      {erreur ? (
        <p role="alert" className="m-0 mt-1 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {erreur}
        </p>
      ) : null}
    </div>
  );
}
