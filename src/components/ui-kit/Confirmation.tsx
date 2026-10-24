"use client";

import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";

/**
 * La question qu'on pose avant un geste qui emporte quelque chose — posée
 * DANS la page, jamais par le navigateur.
 *
 * POURQUOI CE MODULE EXISTE. Un navigateur qui a déjà ouvert deux boîtes
 * natives propose « empêcher cette page d'ouvrir d'autres boîtes de dialogue ».
 * Cochée, la case fait rendre `false` à `confirm()` **sans rien afficher** : le
 * `if (!confirm(…)) return;` prend systématiquement la sortie, et le bouton
 * devient inerte pour le reste de la visite — le clic ne produit alors plus
 * rien du tout, pas même un message.
 *
 * Le correctif du 2026-09-04 a retiré le `confirm()` de l'onboarding en
 * affirmant que c'était le seul du dépôt. Il en restait **seize, dans quinze
 * fichiers**, et tous sauf deux gardaient une suppression : « Supprimer » qui
 * ne fait plus rien, définitivement, y compris sur l'établissement et sur
 * l'entreprise, qui emportent le dossier entier. Le défaut y mord plus fort
 * qu'à l'onboarding : là-bas le bouton inerte retenait quelqu'un sur un
 * questionnaire, ici il enferme un dossier qu'on ne peut plus nettoyer.
 *
 * POURQUOI UN HOOK ET NON UN BOUTON TOUT FAIT. Une carte de question veut la
 * largeur du bloc qu'elle commente, et les seize déclencheurs vivent dans des
 * places très différentes : une colonne d'actions `shrink-0` au bord d'une
 * ligne de liste, une rangée `flex-wrap` de pied de fiche, un lien maigre au
 * milieu d'une phrase. Un composant qui rendrait à la fois le bouton et la
 * carte imposerait à la carte la boîte du bouton — 110 px de large dans le
 * pire cas relevé (`HeroFiche`, dont la colonne d'actions est `flex-none`).
 *
 * Le hook sépare donc les deux : il tient l'état, l'accessibilité, l'emphase
 * et les mots de structure, et l'appelant décide **où** la carte s'insère. Ce
 * qu'il écrit tient en deux lignes — `demander({…})` sur le clic, `{confirmation}`
 * à l'endroit voulu — et rien de ce qui pourrait diverger ne lui appartient.
 *
 * CE QUE L'APPELANT NE PEUT PAS DÉFAIRE, et c'est le point : l'emphase. Sur
 * une question dont l'enjeu est de perdre quelque chose, **c'est le choix qui
 * perd qui porte le poids visuel**, et c'est l'erreur qu'il ne faut pas
 * reproduire — l'onboarding sortait « Quitter sans enregistrer » en pilule
 * d'encre pleine et « Reprendre la saisie » en contour, si bien que l'œil, le
 * pouce et la touche Entrée allaient tous les trois vers la porte qui détruit.
 * Ici c'est l'inverse, sans prop pour en décider : la porte qui ne détruit
 * rien est pleine et reçoit le focus, celle qui détruit est un contour à
 * l'encre du signal. La couleur ne porte jamais seule (interdit 10) — le
 * libellé dit le geste et son objet.
 */
export type Question = {
  /**
   * La question. Elle nomme **ce qui sera perdu**, jamais « êtes-vous sûr ? » :
   * une question qui ne dit pas son enjeu ne se répond pas, elle se clique.
   */
  titre: string;
  /**
   * Ce que le geste emporte, et ce qu'il laisse. Des faits, pas un
   * avertissement — « ses rapports restent au dossier » vaut mieux que
   * « attention, action irréversible ».
   */
  detail: ReactNode;
  /** Le bouton qui agit : un verbe et son objet. Jamais « OK », jamais « Oui ». */
  agir: string;
  /**
   * Le libellé de la porte de sortie. Le défaut « Ne rien changer » est vrai
   * des seize gestes gardés ici — suppression, retrait, clôture — et son
   * uniformité est utile : la sortie se reconnaît au même mot d'un écran à
   * l'autre. Ne le surcharger que là où il serait faux.
   */
  rester?: string;
  /** Ce qu'on fait si la réponse est oui. */
  alors: () => void;
};

export function useConfirmation(): {
  /** À appeler sur le clic du déclencheur, à la place de `confirm()`. */
  demander: (question: Question) => void;
  /**
   * La carte, ou `null`. À poser dans le flux, **sous** le bloc que la
   * question commente : elle s'insère, elle ne recouvre rien — un panneau
   * flottant redonnerait à un navigateur ou à une extension de quoi la faire
   * disparaître, ce qui est exactement le défaut qu'on retire.
   */
  confirmation: ReactNode;
} {
  const [question, setQuestion] = useState<Question | null>(null);
  const idTitre = useId();
  const idDetail = useId();

  const fermer = () => setQuestion(null);

  return {
    demander: (q: Question) => setQuestion(q),
    confirmation: question ? (
      <section
        // `alertdialog` — même rôle que la sortie de l'onboarding, pour que
        // les deux questions de l'application s'annoncent pareil. Elle n'est
        // pas modale : rien n'est masqué derrière, et c'est voulu (interdit
        // 21 — la commande reste sous les yeux, à sa place).
        role="alertdialog"
        aria-labelledby={idTitre}
        aria-describedby={idDetail}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            fermer();
          }
        }}
        // `min-w` plutôt qu'une largeur imposée : la carte prend la place de
        // son bloc quand il y en a, et se réserve de quoi rester lisible
        // quand elle naît dans une colonne d'actions étroite. `max-w-full`
        // la ramène dans les petits écrans, où 19 rem déborderait.
        className="mt-3 w-full min-w-[19rem] max-w-full rounded-[22px] bg-[color:var(--board-slate-pale)] px-5 py-4"
      >
        <p
          id={idTitre}
          className="m-0 max-w-[var(--board-mesure)] text-[14px] font-semibold leading-[1.4] text-[color:var(--board-ink)]"
        >
          {question.titre}
        </p>
        <p
          id={idDetail}
          className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]"
        >
          {question.detail}
        </p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          {/* Le focus va à la porte qui ne détruit rien, et c'est elle qui
              porte l'encre pleine. */}
          <Button
            type="button"
            variant="board"
            size="boardSm"
            autoFocus
            onClick={fermer}
          >
            {question.rester ?? "Ne rien changer"}
          </Button>
          <Button
            type="button"
            variant="boardClair"
            size="boardSm"
            className="text-[color:var(--board-signal-ink)]"
            onClick={() => {
              const { alors } = question;
              fermer();
              alors();
            }}
          >
            {question.agir}
          </Button>
        </div>
      </section>
    ) : null,
  };
}
