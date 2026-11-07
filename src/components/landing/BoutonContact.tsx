"use client";

// Le bouton « Nous contacter » et son formulaire, en fenêtre. Posé dans le
// pied de page et dans le tarif (« Sur mesure », mise en route accompagnée),
// chacun avec son sujet déjà choisi. L'envoi ouvre la messagerie du
// visiteur, message rédigé (`mailtoContact`, provisoire).

import { useEffect, useId, useRef, useState } from "react";
import { PanneauModal } from "@/components/ui-kit/PanneauModal";
import { cn } from "@/lib/utils";
import { mailtoContact, MESSAGE_MAX, SUJETS_CONTACT, type SujetContact } from "./contact";

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
  const [parti, setParti] = useState(false);
  const id = useId();
  // Le bouton d'envoi disparaît avec le formulaire : le focus passe à la
  // confirmation, annoncée (`role="status"`), plutôt que de tomber sur body.
  const confirmation = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (parti) confirmation.current?.focus();
  }, [parti]);

  const fermer = () => {
    setOuvert(false);
    setParti(false);
  };

  function envoyer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const champ = (nom: string) => String(f.get(nom) ?? "");
    window.location.href = mailtoContact({
      sujet: champ("sujet") as SujetContact,
      nom: champ("nom"),
      email: champ("email"),
      structure: champ("structure"),
      message: champ("message"),
    });
    setParti(true);
  }

  return (
    <>
      <button type="button" onClick={() => setOuvert(true)} className={cn("lp-btn", className)}>
        {children}
      </button>
      <PanneauModal ouvert={ouvert} surFermer={fermer} surtitre="Contact" titre="Écrivez-nous">
        {parti ? (
          <>
            <p ref={confirmation} role="status" tabIndex={-1} className="m-0 outline-none">
              Votre messagerie s&apos;ouvre avec le message prêt : il ne reste
              qu&apos;à l&apos;envoyer. Si rien ne s&apos;ouvre, aucune messagerie
              n&apos;est réglée sur cet appareil : réessayez depuis un autre.
            </p>
            <div>
              <button type="button" onClick={fermer} className="lp-btn lp-btn-ink">
                Fermer
              </button>
            </div>
          </>
        ) : (
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
              <div>
                <label className="label-board" htmlFor={`${id}-nom`}>
                  Nom *
                </label>
                <input id={`${id}-nom`} name="nom" required autoComplete="name" maxLength={120} className="champ-board" />
              </div>
              <div>
                <label className="label-board" htmlFor={`${id}-email`}>
                  E-mail *
                </label>
                <input id={`${id}-email`} name="email" type="email" required autoComplete="email" maxLength={200} className="champ-board" />
              </div>
            </div>
            <div>
              <label className="label-board" htmlFor={`${id}-structure`}>
                Structure (facultatif)
              </label>
              <input id={`${id}-structure`} name="structure" autoComplete="organization" maxLength={160} className="champ-board" />
            </div>
            <div>
              <label className="label-board" htmlFor={`${id}-message`}>
                Message *
              </label>
              <textarea id={`${id}-message`} name="message" rows={5} required maxLength={MESSAGE_MAX} className="champ-board" />
            </div>
            <p className="m-0 text-[12px] text-[color:var(--board-slate-mid)]">
              L&apos;envoi ouvre votre messagerie, message rédigé. Rien n&apos;est
              enregistré par Rojer.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="lp-btn lp-btn-ink">
                Préparer le message
              </button>
              <button type="button" onClick={fermer} className="lp-btn lp-btn-clair">
                Annuler
              </button>
            </div>
          </form>
        )}
      </PanneauModal>
    </>
  );
}
