"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import {
  leverPrescription,
  reactiverPrescription,
  supprimerPrescription,
  type PrescriptionActionState,
} from "@/lib/prescriptions/actions";

/**
 * Sortie de vie d'une prescription particulière (ADR-035).
 *
 * Deux voies, et une seule est la voie normale :
 *
 *  - **Lever** — l'arrêté a été rapporté, la mise en demeure levée, la
 *    prescription a cessé de produire effet à une date donnée. L'acte reste
 *    au dossier : c'est lui qui explique les vérifications déjà faites.
 *  - **Supprimer** — réservé à la saisie erronée, et refusé par le serveur
 *    dès qu'une ligne de calendrier issue de la prescription porte un rapport
 *    ou une action corrective. Sans ce refus, la preuve survivrait à sa
 *    justification : `Verification.prescriptionId` est en `ON DELETE SET
 *    NULL`, les lignes resteraient sans plus rien dire de quel acte elles
 *    venaient.
 *
 * Le bouton de suppression n'est donc pas seulement caché quand la
 * prescription porte une preuve — le serveur revérifie. Un client ne décide
 * pas de ce qu'on a le droit de détruire.
 */
export function PrescriptionActions({
  etablissementId,
  prescriptionId,
  estLevee,
  lignesAvecPreuve,
  dateDocument,
}: {
  etablissementId: string;
  prescriptionId: string;
  estLevee: boolean;
  lignesAvecPreuve: number;
  /** Borne basse de la date de levée : une levée ne précède pas son acte. */
  dateDocument: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [pendingAutre, startTransition] = useTransition();
  const [etatSuppr, setEtatSuppr] = useState<PrescriptionActionState | null>(
    null,
  );
  const { demander, confirmation } = useConfirmation();

  const lever = leverPrescription.bind(null, etablissementId, prescriptionId);
  const [etat, action, pending] = useActionState<
    PrescriptionActionState,
    FormData
  >(lever, { status: "idle" });

  if (estLevee) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="boardClair"
          size="boardSm"
          disabled={pendingAutre}
          onClick={() =>
            startTransition(async () => {
              await reactiverPrescription(etablissementId, prescriptionId);
            })
          }
        >
          {pendingAutre ? "Réactivation…" : "Annuler la levée"}
        </Button>
        <p className="m-0 text-[12px] text-[color:var(--board-slate-mid)]">
          La prescription reprendra effet et le calendrier sera régénéré.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="boardClair"
          size="boardSm"
          onClick={() => setOuvert(!ouvert)}
        >
          {ouvert ? "Annuler" : "Lever cette prescription"}
        </Button>

        {lignesAvecPreuve === 0 ? (
          <Button
            variant="boardClair"
            size="boardSm"
            disabled={pendingAutre}
            onClick={() =>
              demander({
                titre: "Supprimer cette prescription du dossier ?",
                detail:
                  "L'acte disparaît, et avec lui les lignes de calendrier " +
                  "qu'il imposait — plus rien ne dira d'où venaient ces " +
                  "vérifications. À n'employer que si la prescription a été " +
                  "saisie par erreur : si l'acte a réellement existé, levez-la " +
                  "plutôt, son effet s'arrête et l'historique reste.",
                agir: "Supprimer la prescription",
                alors: () =>
                  startTransition(async () => {
                    setEtatSuppr(
                      await supprimerPrescription(
                        etablissementId,
                        prescriptionId,
                      ),
                    );
                  }),
              })
            }
          >
            {pendingAutre ? "Suppression…" : "Supprimer"}
          </Button>
        ) : (
          <p className="m-0 max-w-[62ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            Suppression indisponible : {lignesAvecPreuve} vérification
            {lignesAvecPreuve > 1 ? "s" : ""} issue
            {lignesAvecPreuve > 1 ? "s" : ""} de cette prescription porte
            {lignesAvecPreuve > 1 ? "nt" : ""} un rapport ou une action.
          </p>
        )}
      </div>

      {confirmation}

      {etatSuppr?.status === "error" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {etatSuppr.message}
        </p>
      )}

      {ouvert && (
        <form action={action} className="flex flex-wrap items-end gap-3">
          <div>
            <label
              className="label-board"
              htmlFor={`dateFin-${prescriptionId}`}
            >
              Cesse de produire effet le
            </label>
            <input
              id={`dateFin-${prescriptionId}`}
              name="dateFin"
              type="date"
              min={dateDocument}
              required
              className="champ-board w-48"
            />
          </div>
          <Button
            type="submit"
            variant="board"
            size="boardSm"
            disabled={pending}
          >
            {pending ? "Enregistrement…" : "Confirmer la levée"}
          </Button>
          {etat.status === "error" && (
            <p className="m-0 w-full text-[12.5px] text-[color:var(--board-signal-ink)]">
              {etat.message}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
