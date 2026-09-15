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
import { raisonDuRefus } from "@/lib/prescriptions/refus-suppression";

/**
 * Sortie de vie d'une prescription particulière (ADR-035).
 *
 * Deux voies, et une seule est la voie normale :
 *
 *  - **Lever** — l'arrêté a été rapporté, la mise en demeure levée, la
 *    prescription a cessé de produire effet à une date donnée. L'acte reste
 *    au dossier : c'est lui qui explique les vérifications déjà faites.
 *  - **Supprimer** — réservé à la saisie erronée, et refusé par le serveur
 *    dès qu'une ligne visée par la prescription porte une preuve faite sous
 *    l'acte — un rapport daté de l'acte ou après (`prescriptions/preuves.ts`,
 *    2026-09-15). Sans ce refus, la preuve survivrait à sa
 *    justification : `Verification.prescriptionId` est en `ON DELETE SET
 *    NULL`, les lignes resteraient sans plus rien dire de quel acte elles
 *    venaient.
 *
 * Le bouton de suppression n'est donc pas seulement caché quand la
 * prescription porte une preuve — le serveur revérifie. Un client ne décide
 * pas de ce qu'on a le droit de détruire.
 *
 * Levée ou non, la suppression suit LE MÊME compte que le serveur
 * (2026-09-15) : levée, une prescription restait sans bouton alors que le
 * serveur l'acceptait, et masquée, la suppression ne disait jamais pourquoi.
 * La raison vient de `raisonDuRefus`, la phrase même du refus serveur.
 */
export function PrescriptionActions({
  etablissementId,
  prescriptionId,
  estLevee,
  lignesAvecPreuve,
  dateDocument,
  effet,
}: {
  etablissementId: string;
  prescriptionId: string;
  estLevee: boolean;
  lignesAvecPreuve: number;
  /** Borne basse de la date de levée : une levée ne précède pas son acte. */
  dateDocument: string;
  effet: "renforce_periodicite" | "obligation_sur_mesure";
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

  // Ce que la suppression emporte, selon l'effet : un renforcement n'a pas de
  // lignes à lui — elles reprennent le rythme du référentiel ; une obligation
  // sur mesure n'existe que par l'acte.
  const detailSuppression =
    effet === "renforce_periodicite"
      ? "L'acte disparaît du dossier, et les vérifications qu'il renforçait " +
        "reprennent le rythme du référentiel — plus rien ne dira pourquoi il " +
        "a été plus court. À n'employer que si la prescription a été saisie " +
        "par erreur : si l'acte a réellement existé, levez-la plutôt, son " +
        "effet s'arrête et l'historique reste."
      : "L'acte disparaît, et avec lui les lignes de calendrier " +
        "qu'il imposait — plus rien ne dira d'où venaient ces " +
        "vérifications. À n'employer que si la prescription a été " +
        "saisie par erreur : si l'acte a réellement existé, levez-la " +
        "plutôt, son effet s'arrête et l'historique reste.";

  const suppression =
    lignesAvecPreuve === 0 ? (
          <Button
            variant="boardClair"
            size="boardSm"
            disabled={pendingAutre}
            onClick={() =>
              demander({
                titre: "Supprimer cette prescription du dossier ?",
                detail: detailSuppression,
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
            {`Suppression indisponible : ${raisonDuRefus(
              { effet, acte: dateDocument, levee: estLevee },
              lignesAvecPreuve,
            )}`}
          </p>
        );

  const erreurSuppression = etatSuppr?.status === "error" && (
    <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
      {etatSuppr.message}
    </p>
  );

  if (estLevee) {
    return (
      <div className="space-y-3">
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
          {suppression}
        </div>
        <p className="m-0 text-[12px] text-[color:var(--board-slate-mid)]">
          Annuler la levée : la prescription reprendra effet et le calendrier
          sera régénéré.
        </p>
        {confirmation}
        {erreurSuppression}
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

        {suppression}
      </div>

      {confirmation}

      {erreurSuppression}

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
