"use client";
// L'acceptation des conditions et le démarrage de l'essai (ADR-053 § 8). La
// case n'est jamais cochée d'avance ; le bouton ne part qu'avec elle. L'essai
// se fait sur Essentiel : la formule et la périodicité se choisissent en
// s'abonnant.

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { demarrerEssaiAction } from "@/lib/abonnements/actions";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { CASE_A_COCHER } from "@/components/ui-kit/case-a-cocher";

export function FormulaireEssai({ disponible }: { disponible: boolean }) {
  const [etat, envoyer, enCours] = useActionState(demarrerEssaiAction, { status: "idle" });
  const [accepte, setAccepte] = useState(false);

  return (
    <form action={envoyer} className="mt-8 flex flex-col gap-4">
      <label className="flex max-w-[var(--board-mesure)] items-start gap-3 text-[14px] leading-[1.5]">
        <input
          type="checkbox"
          name="accepte"
          value="oui"
          checked={accepte}
          onChange={(e) => setAccepte(e.target.checked)}
          className={CASE_A_COCHER}
        />
        <span>
          J&apos;accepte les{" "}
          <Link href="/conditions" target="_blank" className="underline underline-offset-4">
            conditions générales
          </Link>{" "}
          (s&apos;ouvrent dans un nouvel onglet).
        </span>
      </label>
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
