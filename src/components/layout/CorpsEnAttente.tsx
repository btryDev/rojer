/**
 * Le corps d'un écran en attente, commun aux deux replis de chargement
 * (`ChargementNeutre`, `ChargementSection`) : le patron « Liste » de la
 * charte (`docs/charte-board.md` § 5), des `.carte-board` vides dans la
 * gouttière. Immobile : aucune surface du board ne pulse (charte § 7).
 */
export function CorpsEnAttente() {
  return (
    <div aria-hidden className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
      <div className="carte-board h-[180px]" />
      <div className="grid gap-7 md:grid-cols-2">
        <div className="carte-board h-[220px]" />
        <div className="carte-board h-[220px]" />
      </div>
    </div>
  );
}
