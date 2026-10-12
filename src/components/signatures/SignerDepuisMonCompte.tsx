"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ObjetSignable } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { signerEnCompteConnecte } from "@/lib/signatures/actions";

type Raison = Exclude<
  Awaited<ReturnType<typeof signerEnCompteConnecte>>,
  { ok: true }
>["raison"];

const MESSAGES: Record<Raison, string> = {
  non_signable: "Ce document n'est plus à signer : il a été clos ou annulé.",
  deja_signee: "Cette partie a déjà signé ce document.",
  objet_introuvable: "Ce document n'existe plus.",
  fichier_introuvable: "Le document à signer n'est plus accessible sur le serveur.",
  stockage_non_configure:
    "Le stockage des fichiers n'est pas encore configuré sur ce serveur : le document ne peut pas être lu pour être signé.",
  non_implemente: "La signature de ce type de document n'est pas encore disponible.",
};

/**
 * La signature du dirigeant depuis son propre compte (audit du 2026-10-12,
 * constat 8). `signerEnCompteConnecte` existait, gardée et testée, et aucun
 * écran ne l'appelait : le dirigeant ne pouvait signer son plan ou son permis
 * qu'en s'envoyant un lien par courriel — et l'envoi de courriels n'est pas en
 * service en production.
 *
 * Deux temps, et non un clic : une signature est un acte, et un bouton seul se
 * déclenche par erreur. La partie n'est pas choisie ici — le serveur signe au
 * nom de l'entreprise utilisatrice, toujours (`signerEnCompteConnecte`).
 */
export function SignerDepuisMonCompte({
  etablissementId,
  objetType,
  objetId,
  auNomDe,
}: {
  etablissementId: string;
  objetType: ObjetSignable;
  objetId: string;
  /** Ce que la fiche appelle cette partie : « l'entreprise utilisatrice »,
   *  « le donneur d'ordre ». */
  auNomDe: string;
}) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function signer() {
    setErreur(null);
    startTransition(async () => {
      const r = await signerEnCompteConnecte({ etablissementId, objetType, objetId });
      if (r.ok) {
        setOuvert(false);
        router.refresh();
      } else {
        setErreur(MESSAGES[r.raison]);
      }
    });
  }

  if (!ouvert) {
    return (
      <Button type="button" variant="board" size="boardSm" onClick={() => setOuvert(true)}>
        Signer depuis mon compte
      </Button>
    );
  }

  return (
    <div className="rounded-[18px] bg-[color:var(--board-card)] p-4 ring-1 ring-[color:var(--board-slate-line)]">
      <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
        Vous signez au nom de {auNomDe}, avec votre compte. Seront enregistrés :
        votre adresse, votre adresse IP, l&apos;empreinte SHA-256 du document
        tel qu&apos;il se présente et l&apos;horodatage serveur.
      </p>
      {erreur && (
        <p className="m-0 mt-2 text-[13px] text-[color:var(--board-signal-ink)]">{erreur}</p>
      )}
      <div className="mt-3 flex items-center gap-2">
        <Button type="button" variant="board" size="boardSm" disabled={pending} onClick={signer}>
          {pending ? "Signature…" : "Signer"}
        </Button>
        <button
          type="button"
          onClick={() => {
            setOuvert(false);
            setErreur(null);
          }}
          className="text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]"
        >
          Annuler
        </button>
      </div>
    </div>
  );
}
