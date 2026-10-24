import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Le champ de formulaire de la charte board (`docs/charte-board.md` § 5).
 *
 * Il existait déjà deux fois : les classes `.label-board` / `.champ-board`
 * dans `globals.css`, et `ChampSaisie` dans le module registre — mais ce
 * dernier prend un descripteur propre au registre, il n'est pas réutilisable
 * ailleurs. Résultat : chaque formulaire migré recopiait les mêmes six lignes,
 * ou renonçait et gardait les primitives `Input`/`Label` au rayon de 6 px, qui
 * « sonnent comme un encart d'un autre logiciel au milieu d'une carte à
 * rayon 30 ».
 *
 * Ce composant est la forme courte. Il porte trois choses qu'on oublie une fois
 * sur deux quand on écrit un champ à la main :
 *
 * - l'astérisque des champs requis, posé par `requis` plutôt qu'écrit dans le
 *   libellé — pour qu'il soit toujours au même endroit ;
 * - `aria-describedby` qui chaîne l'aide ET l'erreur, pas seulement l'une des
 *   deux ;
 * - l'erreur en `--board-signal-ink`, jamais en `text-destructive` qui
 *   appartient à l'autre charte.
 */
export function ChampBoard({
  id,
  label,
  erreur,
  aide,
  requis,
  className,
  ...props
}: {
  id: string;
  label: string;
  /** Message de validation, rendu sous le champ et lié par `aria-describedby`. */
  erreur?: string;
  /** Précision affichée sous le champ. Une phrase, pas une infobulle : une
   *  infobulle n'existe pas au doigt. */
  aide?: ReactNode;
  requis?: boolean;
} & InputHTMLAttributes<HTMLInputElement>) {
  const idAide = aide ? `${id}-aide` : undefined;
  const idErreur = erreur ? `${id}-erreur` : undefined;
  const decrit = [idAide, idErreur].filter(Boolean).join(" ") || undefined;

  return (
    <div className={className}>
      <label className="label-board" htmlFor={id}>
        {label}
        {requis && " *"}
      </label>
      <input
        id={id}
        className="champ-board"
        aria-invalid={Boolean(erreur)}
        aria-describedby={decrit}
        required={requis}
        {...props}
      />
      {aide && (
        <p
          id={idAide}
          className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
        >
          {aide}
        </p>
      )}
      {erreur && (
        <p
          id={idErreur}
          className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]"
        >
          {erreur}
        </p>
      )}
    </div>
  );
}

/**
 * Une section de formulaire : sur-titre, titre, et le rappel de ce que la
 * section attend.
 *
 * Les formulaires en charte papier numérotaient leurs sections
 * (« 1. Identité »). La numérotation ne se garde que si l'ordre porte une
 * information — un vrai déroulé, une chronologie. Sur un formulaire dont on
 * remplit les champs dans l'ordre qu'on veut, elle décore.
 */
export function SectionChamps({
  titre,
  chapeau,
  children,
}: {
  titre: string;
  chapeau?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <header>
        <h2 className="board-titre m-0 text-[17px]">{titre}</h2>
        {chapeau && (
          <p className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
            {chapeau}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}
