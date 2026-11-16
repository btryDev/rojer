"use client";

// Un mot de passe à choisir : un seul champ, la règle écrite AVANT la saisie,
// et un œil pour vérifier ce qu'on a tapé (retours de test du 2026-11-16). Le
// double champ « confirmer » est retiré : il ne protège que d'une faute
// recopiée deux fois, et le lien « mot de passe oublié » rattrape toute
// erreur. Même rendu que `ChampBoard`, dont il reprend les classes.

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { AIDE_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/mot-de-passe";

export function ChampMotDePasse({
  id = "password",
  name = "password",
  label,
}: {
  id?: string;
  name?: string;
  label: string;
}) {
  const [visible, setVisible] = useState(false);
  const idAide = `${id}-aide`;
  return (
    <div>
      <label className="label-board" htmlFor={id}>
        {label}
      </label>
      <p id={idAide} className="m-0 mb-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]">
        {AIDE_MOT_DE_PASSE}. Une phrase de quelques mots s&apos;en souvient mieux qu&apos;un mélange de signes.
      </p>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          required
          minLength={LONGUEUR_MIN_MOT_DE_PASSE}
          aria-describedby={idAide}
          className="champ-board pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      </div>
    </div>
  );
}
