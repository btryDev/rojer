import { AIDE_MATIERES, LIEN_TABLEAU_CLP } from "@/lib/etablissements/questions";

/**
 * L'aide de la question des matières (R. 4227-34), telle que la fiche et le
 * parcours de création l'affichent sous la question (2026-10-13,
 * `lot/question-matieres`). Les mots viennent de `etablissements/questions.ts`,
 * et de là seulement : ce composant les met en page, il n'en écrit aucun.
 *
 * Sans hook ni état : il s'insère aussi bien dans un composant client (le
 * formulaire, le parcours) que serveur. La taille et la couleur du texte sont
 * celles de l'écran hôte, passées par `className`.
 */
export function AideQuestionMatieres({
  id,
  className,
}: {
  id?: string;
  className?: string;
}) {
  return (
    <div id={id} className={className}>
      {AIDE_MATIERES.map((paragraphe, i) => (
        <p key={i} className={i === 0 ? "m-0" : "m-0 mt-1.5"}>
          {paragraphe}
        </p>
      ))}
      <p className="m-0 mt-1.5">
        {LIEN_TABLEAU_CLP.intro}{" "}
        <a
          href={LIEN_TABLEAU_CLP.url}
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          {LIEN_TABLEAU_CLP.libelle}
        </a>
      </p>
    </div>
  );
}
