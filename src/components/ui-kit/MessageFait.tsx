// La ligne verte qui dit qu'une saisie est enregistrée : « Rapport
// enregistré. », « Point ajouté. »… Une taille, une couleur — celles de
// l'erreur de validation (12,5 px), à l'encre « Fait » de la charte
// (`--board-green-ink`). Écrite à la main en cinq endroits, elle avait dérivé
// (13 px, 12,5 px, gras ou non) ; le 2026-10-28, une seule.
//
// Rendue même vide quand on lui passe `null` : une région `role="status"`
// présente avant le message est celle qu'un lecteur d'écran annonce.

export function MessageFait({ children }: { children?: React.ReactNode }) {
  return (
    <p role="status" className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
      {children}
    </p>
  );
}
