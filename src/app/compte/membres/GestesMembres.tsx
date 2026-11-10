"use client";

import { useActionState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { useConfirmation } from "@/components/ui-kit/Confirmation";
import { ChampCompteAttendu } from "@/components/compte/ChampCompteAttendu";
import type { Role } from "@/lib/auth/roles";
import {
  annulerInvitation,
  changerRoleMembre,
  choisirCompte,
  inviterMembre,
  quitterCompte,
  retirerMembre,
  type EtatMembres,
} from "@/lib/membres/actions";

const INITIAL: EtatMembres = { status: "idle" };

/** Les rôles, dans l'ordre où on les propose (ADR-054 § 2). */
const CHOIX_ROLES = [
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

export function FormulaireInvitation({ compteId }: { compteId: string }) {
  const [etat, action, pending] = useActionState(inviterMembre, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-5">
      <ChampCompteAttendu compteId={compteId} />
      <ChampBoard id="email" name="email" type="email" label="Adresse e-mail" autoComplete="off" requis />
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

export function ChoixRole({ membreId, role }: { membreId: string; role: Role }) {
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

export function RetraitMembre({ membreId, nom }: { membreId: string; nom: string }) {
  const [etat, action, pending] = useActionState(retirerMembre, INITIAL);
  const formulaire = useRef<HTMLFormElement>(null);
  const { demander, confirmation } = useConfirmation();
  return (
    <form ref={formulaire} action={action}>
      <input type="hidden" name="membreId" value={membreId} />
      <Button
        type="button"
        variant="boardClair"
        size="boardSm"
        disabled={pending}
        onClick={() =>
          demander({
            titre: `Retirer ${nom} du compte ?`,
            detail: "Son accès aux dossiers se ferme tout de suite ; ce qu'elle y a saisi reste au compte.",
            agir: `Retirer ${nom}`,
            alors: () => formulaire.current?.requestSubmit(),
          })
        }
      >
        Retirer
      </Button>
      {confirmation}
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

/** `nomCompte` : nommé quand la personne a plusieurs comptes, pour qu'elle sache lequel elle quitte. */
export function DepartDuCompte({ compteId, nomCompte }: { compteId: string; nomCompte: string | null }) {
  const [etat, action, pending] = useActionState(quitterCompte, INITIAL);
  const formulaire = useRef<HTMLFormElement>(null);
  const { demander, confirmation } = useConfirmation();
  return (
    <form ref={formulaire} action={action}>
      <ChampCompteAttendu compteId={compteId} />
      <Button
        type="button"
        variant="boardClair"
        size="board"
        disabled={pending}
        className="w-full"
        onClick={() =>
          demander({
            titre: nomCompte ? `Quitter le compte ${nomCompte} ?` : "Quitter ce compte ?",
            detail: "Vous perdez l'accès à ses dossiers. Pour revenir, il faudra qu'un propriétaire vous invite de nouveau.",
            agir: "Quitter le compte",
            alors: () => formulaire.current?.requestSubmit(),
          })
        }
      >
        Quitter ce compte
      </Button>
      {confirmation}
      <Message etat={etat} />
    </form>
  );
}

export function ChoixCompte({ comptes, actif }: { comptes: { compteId: string; nom: string }[]; actif: string }) {
  const [etat, action, pending] = useActionState(choisirCompte, INITIAL);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div>
        <label className="label-board" htmlFor="compte">
          Compte
        </label>
        <select id="compte" name="compte" defaultValue={actif} className="champ-board">
          {comptes.map((c) => (
            <option key={c.compteId} value={c.compteId}>
              {c.nom}
            </option>
          ))}
        </select>
      </div>
      <Message etat={etat} />
      <Button type="submit" variant="boardClair" size="board" disabled={pending} className="w-full">
        Travailler sur ce compte
      </Button>
    </form>
  );
}
