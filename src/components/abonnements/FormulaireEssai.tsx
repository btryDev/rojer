"use client";
// L'acceptation des conditions et le démarrage de l'essai (ADR-053 § 8). La
// case n'est jamais cochée d'avance ; le bouton ne part qu'avec elle. L'essai
// se fait sur Essentiel : la formule et la périodicité se choisissent en
// s'abonnant.

import { useActionState, useState } from "react";
import { CaseConditions } from "./CaseConditions";
import { Button } from "@/components/ui/button";
import { demarrerEssaiAction } from "@/lib/abonnements/actions";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";

/** `compteId` : le compte que montre la page, `null` si la personne n'en a encore aucun. */
export function FormulaireEssai({ disponible, compteId }: { disponible: boolean; compteId: string | null }) {
  const [etat, envoyer, enCours] = useActionState(demarrerEssaiAction, { status: "idle" });
  const [accepte, setAccepte] = useState(false);

  return (
    <form action={envoyer} className="flex flex-col gap-4">
      <ChampCompteAttendu compteId={compteId} />
      <CaseConditions accepte={accepte} onChange={setAccepte} />
      <MessageFormulaire ton="alerte">{etat.status === "error" ? etat.message : null}</MessageFormulaire>
      <MessageFormulaire ton="info">
        {disponible ? null : "L'essai ne peut pas démarrer pour le moment : réessayez dans quelques minutes."}
      </MessageFormulaire>
      <div>
        <Button type="submit" variant="board" size="board" disabled={!accepte || enCours || !disponible}>
          {enCours ? "Démarrage de l'essai…" : "Démarrer mon essai"}
        </Button>
      </div>
    </form>
  );
}
