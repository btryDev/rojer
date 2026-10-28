"use client";

import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { PrescriptionForm } from "./PrescriptionForm";

/**
 * Le geste principal de la page Prescriptions : un bouton au-dessus de la
 * liste, le formulaire dans une modal (2026-10-28, demande de la
 * propriétaire). Posé sous la liste, le formulaire s'éloignait à chaque
 * prescription ajoutée.
 *
 * `ouvertAuDepart` : la checklist du tableau de bord arrive avec
 * `?source=demande_assureur` pour déclarer — la modal s'ouvre d'elle-même,
 * sans quoi le renvoi aboutirait sur une liste.
 */
export function NouvellePrescription({
  ouvertAuDepart = false,
  ...propsFormulaire
}: Omit<React.ComponentProps<typeof PrescriptionForm>, "surSucces"> & {
  ouvertAuDepart?: boolean;
}) {
  const [ouvert, setOuvert] = useState(ouvertAuDepart);
  // La modal se ferme sur l'enregistrement : sans un mot ici, rien ne dirait
  // que c'est fait, et l'on risquerait de déclarer deux fois.
  const [enregistree, setEnregistree] = useState(false);
  const fermer = useCallback(() => setOuvert(false), []);
  const surSucces = useCallback(() => {
    setEnregistree(true);
    setOuvert(false);
  }, []);

  return (
    <>
      <p role="status" className="m-0 text-[13px] text-[color:var(--board-green-ink)]">
        {enregistree ? "Prescription enregistrée." : null}
      </p>
      <Button
        type="button"
        variant="board"
        size="board"
        onClick={() => {
          setEnregistree(false);
          setOuvert(true);
        }}
      >
        <Plus className="size-3.5" aria-hidden />
        Ajouter une prescription
      </Button>
      <PanneauModal
        ouvert={ouvert}
        surFermer={fermer}
        surtitre="Prescriptions"
        titre="Déclarer une prescription"
      >
        <PrescriptionForm {...propsFormulaire} surSucces={surSucces} />
      </PanneauModal>
    </>
  );
}
