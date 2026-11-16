"use client";

// Un mot de passe à choisir : un seul champ, la règle écrite AVANT la saisie,
// et un œil pour vérifier ce qu'on a tapé (retours de test du 2026-11-16). Le
// double champ « confirmer » est retiré : il ne protège que d'une faute
// recopiée deux fois, et le lien « mot de passe oublié » rattrape toute
// erreur. Le champ est un `ChampBoard` : même rendu, même aide, même erreur.

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ChampBoard } from "./ChampBoard";
import { AIDE_MOT_DE_PASSE, LONGUEUR_MIN_MOT_DE_PASSE } from "@/lib/auth/mot-de-passe";

export function ChampMotDePasse({ label, id = "password" }: { label: string; id?: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <ChampBoard
      id={id}
      name={id}
      label={label}
      type={visible ? "text" : "password"}
      autoComplete="new-password"
      required
      minLength={LONGUEUR_MIN_MOT_DE_PASSE}
      aideAvant
      aide={`${AIDE_MOT_DE_PASSE}. Une phrase de quelques mots s'en souvient mieux qu'un mélange de signes.`}
      suffixe={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-pressed={visible}
          aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
          className="flex size-full items-center justify-center text-[color:var(--board-slate-mid)] transition-colors hover:text-[color:var(--board-ink)]"
        >
          {visible ? <EyeOff aria-hidden className="size-4" /> : <Eye aria-hidden className="size-4" />}
        </button>
      }
    />
  );
}
