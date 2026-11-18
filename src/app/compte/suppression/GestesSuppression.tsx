"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { annulerSuppressionAction, demanderSuppressionAction, type EtatSuppression } from "@/lib/compte/actions-suppression";

const INITIAL: EtatSuppression = {};

/** Le nom du compte, puis le mot de passe : deux gestes délibérés avant un effacement. */
export function FormulaireSuppression({ compteId, nomCompte }: { compteId: string; nomCompte: string }) {
  const [etat, action, pending] = useActionState(demanderSuppressionAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-5">
      <ChampCompteAttendu compteId={compteId} />
      <ChampBoard
        id="nom"
        name="nom"
        label={`Tapez le nom du compte : ${nomCompte}`}
        autoComplete="off"
        spellCheck={false}
        requis
      />
      <ChampBoard id="password" name="password" type="password" label="Votre mot de passe" autoComplete="current-password" requis />
      <MessageFormulaire ton="alerte">{etat.erreur}</MessageFormulaire>
      <Button type="submit" variant="boardAttention" size="board" disabled={pending} className="w-full">
        {pending ? "Vérification…" : "Supprimer le compte dans 7 jours"}
      </Button>
    </form>
  );
}

export function AnnulationSuppression({ compteId }: { compteId: string }) {
  const [etat, action, pending] = useActionState(annulerSuppressionAction, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <ChampCompteAttendu compteId={compteId} />
      <MessageFormulaire ton="alerte">{etat.erreur}</MessageFormulaire>
      <Button type="submit" variant="board" size="board" disabled={pending}>
        {pending ? "Annulation…" : "Annuler la suppression"}
      </Button>
    </form>
  );
}
