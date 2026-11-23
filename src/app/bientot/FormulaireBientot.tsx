"use client";

import { Check } from "lucide-react";
import { useActionState, useEffect, useRef, useState } from "react";
import { demanderOuvertureAction } from "@/lib/demandes-ouverture/actions";
import { CHAMP_PIEGE, type EtatDemandeOuverture } from "@/lib/demandes-ouverture/formulaire";

const ETAT_INITIAL: EtatDemandeOuverture = {};

const ID_CHAMP = "bientot-email";
const ID_ERREUR = "bientot-email-erreur";

/**
 * L'adresse, et rien d'autre : le champ et le bouton sur une ligne. Une fois
 * notée, le formulaire cède la place à l'accusé de réception, qui redit
 * l'adresse — une faute de frappe se voit, et « Corriger l'adresse » rouvre le
 * champ, la saisie gardée.
 *
 * `etatInitial` : la réponse de départ, pour montrer un état sans passer par
 * l'action (tests).
 */
export function FormulaireBientot({ etatInitial = ETAT_INITIAL }: { etatInitial?: EtatDemandeOuverture } = {}) {
  const [etat, action, pending] = useActionState(demanderOuvertureAction, etatInitial);
  // Champ tenu ici : un refus (adresse mal tapée, limite) ne vide pas la saisie.
  const [email, setEmail] = useState("");
  const [correction, setCorrection] = useState(false);
  const notee = Boolean(etat.email) && !correction;

  // Le formulaire disparaît sous le doigt : le focus suit ce qui le remplace.
  const accuse = useRef<HTMLParagraphElement>(null);
  const champ = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (notee) accuse.current?.focus();
  }, [notee, etat]);
  useEffect(() => {
    if (correction) champ.current?.focus();
  }, [correction]);

  if (notee) {
    return (
      <div className="flex items-start gap-4">
        <span
          aria-hidden
          className="mt-0.5 flex size-10 flex-none items-center justify-center rounded-full bg-[color:var(--board-ink)] text-white"
        >
          <Check className="size-5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0">
          <p
            ref={accuse}
            tabIndex={-1}
            role="status"
            className="m-0 text-[1.0625rem] leading-[1.55] text-[color:var(--board-ink)] outline-none"
          >
            {`C'est noté. Nous vous écrirons à ${etat.email} le jour de l'ouverture.`}
          </p>
          <button
            type="button"
            onClick={() => setCorrection(true)}
            className="mt-2 text-[13px] font-semibold text-[color:var(--board-blue-ink)] underline decoration-[color:var(--board-blue-soft)] underline-offset-4 transition-colors hover:decoration-[color:var(--board-blue-ink)]"
          >
            Corriger l&apos;adresse
          </button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} onSubmit={() => setCorrection(false)}>
      <label htmlFor={ID_CHAMP} className="label-board">
        Votre adresse e-mail
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          ref={champ}
          id={ID_CHAMP}
          name="email"
          type="email"
          autoComplete="email"
          required
          maxLength={254}
          placeholder="vous@exemple.fr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(etat.erreur)}
          aria-describedby={etat.erreur ? ID_ERREUR : undefined}
          className="champ-board h-12 min-w-0 flex-1 text-[15px]"
        />
        <button
          type="submit"
          disabled={pending}
          className="lp-btn lp-btn-ink h-12 flex-none justify-center disabled:opacity-70"
        >
          {pending ? "Envoi…" : "Me prévenir"}
        </button>
      </div>
      {etat.erreur && (
        <p id={ID_ERREUR} className="m-0 mt-2 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {etat.erreur}
        </p>
      )}

      {/* Le piège à robots (`CHAMP_PIEGE`) : hors écran, hors tabulation,
          tu aux lecteurs d'écran. Une personne ne le voit pas. */}
      <div aria-hidden className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="bientot-piege">Ne pas remplir ce champ</label>
        <input id="bientot-piege" name={CHAMP_PIEGE} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
    </form>
  );
}
