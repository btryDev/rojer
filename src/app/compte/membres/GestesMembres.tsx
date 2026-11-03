"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import {
  annulerInvitation,
  changerRoleMembre,
  inviterMembre,
  quitterCompte,
  retirerMembre,
  type EtatMembres,
} from "@/lib/membres/actions";

const INITIAL: EtatMembres = { status: "idle" };

/** Les rôles, dans l'ordre où on les propose (ADR-054 § 2). */
export const CHOIX_ROLES = [
  { valeur: "member", libelle: "Membre — saisit sur tous les établissements" },
  { valeur: "lecture", libelle: "Lecture seule — consulte et exporte" },
  { valeur: "owner", libelle: "Propriétaire — gère aussi les membres et l'abonnement" },
] as const;

function Message({ etat }: { etat: EtatMembres }) {
  return (
    <MessageFormulaire ton={etat.status === "error" ? "alerte" : "info"}>
      {etat.status === "idle" ? undefined : etat.message}
    </MessageFormulaire>
  );
}

export function FormulaireInvitation() {
  const [etat, action, pending] = useActionState(inviterMembre, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-5">
      <ChampBoard id="email" name="email" type="email" label="Adresse e-mail" autoComplete="off" required />
      <div>
        <label className="label-board" htmlFor="role">
          Rôle
        </label>
        <select id="role" name="role" defaultValue="member" className="champ-board">
          {CHOIX_ROLES.map((r) => (
            <option key={r.valeur} value={r.valeur}>
              {r.libelle}
            </option>
          ))}
        </select>
      </div>
      <Message etat={etat} />
      <Button type="submit" variant="board" size="board" disabled={pending} className="w-full">
        {pending ? "Envoi…" : "Envoyer l'invitation →"}
      </Button>
    </form>
  );
}

export function ChoixRole({ membreId, role }: { membreId: string; role: string }) {
  const [etat, action, pending] = useActionState(changerRoleMembre, INITIAL);
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="membreId" value={membreId} />
      <label className="sr-only" htmlFor={`role-${membreId}`}>
        Rôle
      </label>
      <select id={`role-${membreId}`} name="role" defaultValue={role} className="champ-board w-auto py-1.5 text-[13px]">
        {CHOIX_ROLES.map((r) => (
          <option key={r.valeur} value={r.valeur}>
            {r.libelle.split(" — ")[0]}
          </option>
        ))}
      </select>
      <Button type="submit" variant="boardClair" size="boardSm" disabled={pending}>
        Changer
      </Button>
      <Message etat={etat} />
    </form>
  );
}

export function RetraitMembre({ membreId }: { membreId: string }) {
  const [etat, action, pending] = useActionState(retirerMembre, INITIAL);
  return (
    <form action={action}>
      <input type="hidden" name="membreId" value={membreId} />
      <Button type="submit" variant="boardClair" size="boardSm" disabled={pending}>
        Retirer
      </Button>
      <Message etat={etat} />
    </form>
  );
}

export function AnnulationInvitation({ invitationId }: { invitationId: string }) {
  const [etat, action, pending] = useActionState(annulerInvitation, INITIAL);
  return (
    <form action={action}>
      <input type="hidden" name="invitationId" value={invitationId} />
      <Button type="submit" variant="boardClair" size="boardSm" disabled={pending}>
        Annuler
      </Button>
      <Message etat={etat} />
    </form>
  );
}

export function DepartDuCompte() {
  const [etat, action, pending] = useActionState(quitterCompte, INITIAL);
  return (
    <form action={action}>
      <Button type="submit" variant="boardClair" size="board" disabled={pending} className="w-full">
        Quitter ce compte
      </Button>
      <Message etat={etat} />
    </form>
  );
}
