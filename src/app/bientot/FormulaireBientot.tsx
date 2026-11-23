"use client";

import { useActionState, useState } from "react";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { demanderOuvertureAction } from "@/lib/demandes-ouverture/actions";
import { CHAMP_PIEGE, type EtatDemandeOuverture } from "@/lib/demandes-ouverture/formulaire";

const ETAT_INITIAL: EtatDemandeOuverture = {};

/**
 * L'adresse, et rien d'autre. Une fois notée, le formulaire cède la place à
 * l'accusé de réception, qui redit l'adresse : une faute de frappe se voit.
 */
export function FormulaireBientot() {
  const [etat, action, pending] = useActionState(demanderOuvertureAction, ETAT_INITIAL);
  // Champ tenu ici : un refus (adresse mal tapée, limite) ne vide pas la saisie.
  const [email, setEmail] = useState("");

  if (etat.email) {
    return (
      <MessageFormulaire ton="info" className="text-[0.95rem]">
        {`C'est noté. Nous vous écrirons à ${etat.email} le jour de l'ouverture.`}
      </MessageFormulaire>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <ChampBoard
        id="bientot-email"
        name="email"
        type="email"
        label="E-mail"
        autoComplete="email"
        required
        maxLength={254}
        placeholder="vous@exemple.fr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        erreur={etat.erreur}
      />

      {/* Le piège à robots (`CHAMP_PIEGE`) : hors écran, hors tabulation,
          tu aux lecteurs d'écran. Une personne ne le voit pas. */}
      <div aria-hidden className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="bientot-piege">Ne pas remplir ce champ</label>
        <input id="bientot-piege" name={CHAMP_PIEGE} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>

      <div>
        <button type="submit" disabled={pending} className="lp-btn lp-btn-ink">
          {pending ? "Envoi…" : "Me prévenir"}
        </button>
      </div>
    </form>
  );
}
