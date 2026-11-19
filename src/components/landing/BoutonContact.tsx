"use client";

// Le bouton « Nous contacter » et son formulaire, en fenêtre. Posé dans le
// pied de page, dans le tarif (« Sur mesure », mise en route accompagnée) et
// sur les pages d'information, chacun avec son sujet déjà choisi. Le message
// part du serveur (`envoyerMessageContact`) ; [2026-11-19 : il ouvrait la
// messagerie du visiteur par un lien `mailto:`, provisoire].

import { startTransition, useActionState, useEffect, useId, useRef, useState } from "react";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { envoyerMessageContact, type EtatContact } from "@/lib/contact/actions";
import { cn } from "@/lib/utils";
import {
  CHAMP_PIEGE,
  EMAIL_MAX,
  MESSAGE_MAX,
  NOM_MAX,
  STRUCTURE_MAX,
  SUJETS_CONTACT,
  type SujetContact,
} from "./contact";

export function BoutonContact({
  sujet = "Une question sur Rojer",
  className,
  children = "Nous contacter",
}: {
  sujet?: SujetContact;
  className?: string;
  children?: React.ReactNode;
}) {
  const [ouvert, setOuvert] = useState(false);
  const fermer = () => setOuvert(false);

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className={cn("lp-btn", className)}>
        {children}
      </button>
      {/* Le panneau fermé ne rend rien : chaque ouverture repart d'un formulaire vide. */}
      <PanneauModal ouvert={ouvert} surFermer={fermer} surtitre="Contact" titre="Écrivez-nous">
        <FormulaireContact sujet={sujet} fermer={fermer} />
      </PanneauModal>
    </>
  );
}

const ETAT_INITIAL: EtatContact = { status: "saisie" };

function FormulaireContact({ sujet, fermer }: { sujet: SujetContact; fermer: () => void }) {
  const [etat, envoyer, enCours] = useActionState(envoyerMessageContact, ETAT_INITIAL);
  const id = useId();
  const confirmation = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (etat.status === "envoye") confirmation.current?.focus();
  }, [etat.status]);

  if (etat.status === "envoye") {
    return (
      <div className="space-y-4">
        <p
          ref={confirmation}
          role="status"
          tabIndex={-1}
          className="m-0 rounded-[14px] bg-[color:var(--board-blue-pale)] px-4 py-3 text-[color:var(--board-ink)] outline-none"
        >
          Merci, votre message est bien parti. Nous vous répondons à {etat.email}.
        </p>
        <button type="button" onClick={fermer} className="lp-btn lp-btn-ink">
          Fermer
        </button>
      </div>
    );
  }

  // L'envoi passe par `onSubmit` et non par `action` : un formulaire branché
  // sur `action` se vide après chaque envoi, et un refus (limite, panne)
  // effacerait le message qu'on vient d'écrire.
  function soumettre(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const donnees = new FormData(e.currentTarget);
    startTransition(() => envoyer(donnees));
  }

  return (
    <form onSubmit={soumettre} className="space-y-4">
      <div>
        <label className="label-board" htmlFor={`${id}-sujet`}>
          Sujet
        </label>
        <select id={`${id}-sujet`} name="sujet" className="champ-board" defaultValue={sujet}>
          {SUJETS_CONTACT.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <ChampBoard id={`${id}-nom`} label="Nom" requis required name="nom" autoComplete="name" maxLength={NOM_MAX} />
        <ChampBoard
          id={`${id}-email`}
          label="E-mail"
          requis
          required
          name="email"
          type="email"
          autoComplete="email"
          maxLength={EMAIL_MAX}
        />
      </div>
      <ChampBoard
        id={`${id}-structure`}
        label="Structure (facultatif)"
        name="structure"
        autoComplete="organization"
        maxLength={STRUCTURE_MAX}
      />
      <div>
        <label className="label-board" htmlFor={`${id}-message`}>
          Message *
        </label>
        <textarea id={`${id}-message`} name="message" rows={5} required maxLength={MESSAGE_MAX} className="champ-board" />
      </div>
      {/* Le champ piège : invisible, hors du clavier, ignoré des lecteurs d'écran. */}
      <div aria-hidden="true" className="sr-only">
        <label htmlFor={`${id}-${CHAMP_PIEGE}`}>Ne pas remplir</label>
        <input id={`${id}-${CHAMP_PIEGE}`} name={CHAMP_PIEGE} type="text" tabIndex={-1} autoComplete="off" />
      </div>
      <p className="m-0 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
        Vos coordonnées ne servent qu&apos;à vous répondre.
      </p>
      {etat.status === "erreur" ? <MessageFormulaire ton="alerte">{etat.message}</MessageFormulaire> : null}
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={enCours} className="lp-btn lp-btn-ink">
          {enCours ? "Envoi…" : "Envoyer"}
        </button>
        <button type="button" onClick={fermer} className="lp-btn lp-btn-clair">
          Annuler
        </button>
      </div>
    </form>
  );
}
