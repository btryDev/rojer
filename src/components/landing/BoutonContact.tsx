"use client";

// Le bouton « Nous contacter » et son formulaire, en fenêtre. Posé dans le
// pied de page et dans le tarif (« Sur mesure », mise en route accompagnée),
// chacun avec son sujet déjà choisi. L'envoi ouvre la messagerie du
// visiteur, message rédigé (`mailtoContact`, provisoire) : l'interface est
// celle d'un formulaire ordinaire, et le jour du service d'e-mail, seul
// `envoyer` change (une action serveur à la place du mailto).

import { useEffect, useId, useRef, useState } from "react";
import { ChampBoard } from "@/components/ui-kit/ChampBoard";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { cn } from "@/lib/utils";
import { MAILTO_MAX, mailtoContact, MESSAGE_MAX, SUJETS_CONTACT, type SujetContact } from "./contact";

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
  // Après l'envoi, le formulaire reste là, rempli : rien ne dit que la
  // messagerie s'est vraiment ouverte (aucune n'est réglée sur certains
  // ordinateurs), et ce qui a été écrit ne doit pas se perdre.
  const [etat, setEtat] = useState<"saisie" | "parti" | "trop-long">("saisie");
  const id = useId();
  const statut = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (etat !== "saisie") statut.current?.focus();
  }, [etat]);

  const fermer = () => {
    setOuvert(false);
    setEtat("saisie");
  };

  function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const champ = (nom: string) => String(f.get(nom) ?? "");
    const lien = mailtoContact({
      sujet: champ("sujet") as SujetContact,
      nom: champ("nom"),
      email: champ("email"),
      structure: champ("structure"),
      message: champ("message"),
    });
    // Encodé, le message s'allonge (un « é » vaut 6 caractères) : au-delà,
    // certaines messageries tronquent ou n'ouvrent rien.
    if (lien.length > MAILTO_MAX) {
      setEtat("trop-long");
      return;
    }
    window.location.href = lien;
    setEtat("parti");
  }

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className={cn("lp-btn", className)}>
        {children}
      </button>
      <PanneauModal ouvert={ouvert} surFermer={fermer} surtitre="Contact" titre="Écrivez-nous">
        {etat !== "saisie" ? (
          // Tant que l'envoi ne passe pas par un service d'e-mail, rien ne
          // dit « envoyé » : le message part de la messagerie du visiteur.
          <p
            ref={statut}
            role="status"
            tabIndex={-1}
            className="m-0 rounded-[14px] bg-[color:var(--board-blue-pale)] px-4 py-3 text-[color:var(--board-ink)] outline-none"
          >
            {etat === "parti"
              ? "Votre messagerie s'ouvre avec votre message : envoyez-le pour qu'il nous parvienne. Si rien ne s'ouvre, aucune messagerie n'est réglée sur cet appareil."
              : "Votre message est trop long pour partir d'un seul envoi : raccourcissez-le un peu."}
          </p>
        ) : null}
        <form onSubmit={envoyer} className="space-y-4">
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
              <ChampBoard id={`${id}-nom`} label="Nom" requis name="nom" autoComplete="name" maxLength={120} />
              <ChampBoard id={`${id}-email`} label="E-mail" requis name="email" type="email" autoComplete="email" maxLength={200} />
            </div>
            <ChampBoard id={`${id}-structure`} label="Structure (facultatif)" name="structure" autoComplete="organization" maxLength={160} />
            <div>
              <label className="label-board" htmlFor={`${id}-message`}>
                Message *
              </label>
              <textarea id={`${id}-message`} name="message" rows={5} required maxLength={MESSAGE_MAX} className="champ-board" />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="lp-btn lp-btn-ink">
                Envoyer
              </button>
              <button type="button" onClick={fermer} className="lp-btn lp-btn-clair">
                {etat === "parti" ? "Fermer" : "Annuler"}
              </button>
            </div>
          </form>
      </PanneauModal>
    </>
  );
}
