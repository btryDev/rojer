"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { demanderOuvertureAction } from "@/lib/demandes-ouverture/actions";
import { CHAMP_PIEGE, type EtatDemandeOuverture } from "@/lib/demandes-ouverture/formulaire";
import { BoutonOccupe } from "@/components/ui/bouton-occupe";

const ETAT_INITIAL: EtatDemandeOuverture = {};

const ID_CHAMP = "bientot-email";
const ID_ERREUR = "bientot-email-erreur";

/**
 * L'adresse, et rien d'autre : le champ et le bouton sur une ligne. Une fois
 * notée, le formulaire cède la place à l'accusé de réception, qui redit
 * l'adresse. ~~« Corriger l'adresse » rouvre le champ~~ [2026-11-23,
 * relecture : la correction laissait l'adresse mal tapée en base, qui aurait
 * reçu l'e-mail d'ouverture — retirée ; une autre adresse se laisse en
 * rechargeant la page.]
 *
 * `etatInitial` : la réponse de départ, pour montrer un état sans passer par
 * l'action (tests).
 */
export function FormulaireBientot({ etatInitial = ETAT_INITIAL }: { etatInitial?: EtatDemandeOuverture } = {}) {
  const [etat, action, pending] = useActionState(demanderOuvertureAction, etatInitial);
  // Champ tenu ici : un refus (adresse mal tapée, limite) ne vide pas la saisie.
  const [email, setEmail] = useState("");
  const notee = Boolean(etat.email);

  // Le formulaire disparaît sous le doigt : le focus suit ce qui le remplace.
  const accuse = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (notee) accuse.current?.focus();
  }, [notee]);

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
        </div>
      </div>
    );
  }

  return (
    <form action={action}>
      {/* Le chapeau dit déjà quoi saisir : l'intitulé reste pour les
          lecteurs d'écran, la pilule porte le champ et le bouton d'un seul
          tenant (2026-11-23, « pas très bien organisé »). */}
      <label htmlFor={ID_CHAMP} className="sr-only">
        Votre adresse e-mail
      </label>
      <div
        className={`flex items-center gap-2 rounded-full bg-[color:var(--board-slate-pale)] p-1.5 pl-5 transition-[background-color,box-shadow] duration-150 focus-within:bg-[color:var(--board-card)] focus-within:shadow-[inset_0_0_0_2px_var(--board-blue-strong)] ${
          etat.erreur
            ? "shadow-[inset_0_0_0_1px_var(--board-signal-ink)]"
            : "shadow-[inset_0_0_0_1px_var(--board-slate-line)]"
        }`}
      >
        <input
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
          className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-[color:var(--board-ink)] outline-none placeholder:text-[color:var(--board-slate-soft)]"
        />
        <BoutonOccupe
          type="submit"
          enCours={pending}
          className="lp-btn lp-btn-ink h-11 flex-none justify-center disabled:opacity-70"
        >
          {pending ? "Envoi…" : "Me prévenir"}
        </BoutonOccupe>
      </div>
      {etat.erreur && (
        <p id={ID_ERREUR} role="alert" className="m-0 mt-2 pl-5 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {etat.erreur}
        </p>
      )}
      {/* Au moment où l'adresse est demandée, ce qu'on en fait : une ligne,
          alignée sur le texte du champ. Le détail (effacement sur demande,
          durée) est dans la politique de confidentialité. */}
      <p className="m-0 mt-3 pl-5 text-[0.8125rem] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Votre adresse ne sert qu&apos;à cet e-mail, puis elle est effacée.{" "}
        <Link
          href="/legal/confidentialite"
          className="font-medium text-[color:var(--board-ink)] underline decoration-[color:var(--board-slate-line)] underline-offset-4 transition-colors hover:decoration-[color:var(--board-ink)]"
        >
          Confidentialité
        </Link>
      </p>

      {/* Le piège à robots (`CHAMP_PIEGE`) : hors écran, hors tabulation,
          tu aux lecteurs d'écran. Une personne ne le voit pas. */}
      <div aria-hidden className="absolute -left-[10000px] top-auto h-px w-px overflow-hidden">
        <label htmlFor="bientot-piege">Ne pas remplir ce champ</label>
        <input id="bientot-piege" name={CHAMP_PIEGE} type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </div>
    </form>
  );
}
