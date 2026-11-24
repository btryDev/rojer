"use client";

// Une fiche à jeu de réponses unique — forme `formulaire`.
//
// « Téléphones utiles », par exemple : des faits qui changent rarement et
// dont il n'existe qu'une valeur courante. On la met à jour, on n'empile
// pas. C'est ce qui la distingue du journal, qui ne se corrige jamais
// (cf. `FicheJournal`).
//
// Le composant ne sait rien de la base : la page lui passe une action déjà
// liée à l'établissement et à la fiche, et les réponses déjà enregistrées.

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { ChampFiche } from "@/lib/registre/champs";
import { ChampSaisie } from "./ChampSaisie";
import { ETAT_INITIAL, type ActionFiche, type EtatFiche } from "./types";

export function FicheFormulaire({
  champs,
  action,
  valeurs,
  requis,
  libelleEnvoi = "Enregistrer la fiche",
  colonnes = 2,
}: {
  champs: readonly ChampFiche[];
  action: ActionFiche;
  /** Ce qui est déjà enregistré, par clé de champ. */
  valeurs?: Readonly<Record<string, string | null>>;
  /**
   * Les clés obligatoires. Le catalogue ne les distingue pas — et c'est
   * volontaire : une fiche de registre se remplit par ce qu'on sait, quitte
   * à revenir. L'appelant peut néanmoins en exiger.
   */
  requis?: readonly string[];
  libelleEnvoi?: string;
  /**
   * Deux colonnes par défaut : douze numéros de téléphone en pleine largeur
   * font une colonne interminable pour des réponses de dix caractères. Une
   * seule quand les réponses sont longues.
   */
  colonnes?: 1 | 2;
}) {
  const [state, formAction, pending] = useActionState<EtatFiche, FormData>(
    action,
    ETAT_INITIAL,
  );

  const err = (cle: string) =>
    state.status === "error" ? state.fieldErrors?.[cle]?.[0] : undefined;

  const obligatoires = new Set(requis ?? []);

  return (
    <form action={formAction} className="space-y-5">
      <div
        className={
          colonnes === 2
            ? "grid grid-cols-1 gap-4 sm:grid-cols-2"
            : "flex flex-col gap-4"
        }
      >
        {champs.map((champ) => (
          <div
            key={champ.cle}
            // Un texte long prend la rangée entière : en demi-colonne, il se
            // saisit sur quarante caractères de large.
            className={
              colonnes === 2 && champ.type === "texte_long"
                ? "sm:col-span-2"
                : undefined
            }
          >
            <ChampSaisie
              champ={champ}
              valeurInitiale={valeurs?.[champ.cle]}
              erreur={err(champ.cle)}
              requis={obligatoires.has(champ.cle)}
            />
          </div>
        ))}
      </div>

      {state.status === "error" && (
        <p className="m-0 text-[13px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p className="m-0 text-[13px] text-[color:var(--board-green-ink)]">
          Fiche enregistrée.
        </p>
      )}

      <Button type="submit" variant="board" size="board" enCours={pending}>
        {pending ? "Enregistrement…" : libelleEnvoi}
      </Button>
    </form>
  );
}
