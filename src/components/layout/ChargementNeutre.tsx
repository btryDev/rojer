/**
 * Le repli de chargement sans en-tête de section : le tableau de bord, et les
 * fiches et formulaires (une action, un équipement, un salarié…), dont
 * l'en-tête dépend de la donnée chargée.
 *
 * Il était le corps de `etablissements/[id]/loading.tsx` (audit Next.js du
 * 2026-10-14, M1), seul repli de l'application ; sorti en composant le
 * 2026-10-28 (plan performance, lot 3) quand les pages d'entrée ont reçu le
 * leur (`ChargementSection`). Les sous-dossiers de fiche le reprennent pour
 * ne pas hériter de l'en-tête de leur liste : la fiche d'un équipement qui
 * s'annoncerait « Équipements » puis changerait de titre.
 *
 * Aucun style nouveau : la charte n'a pas de squelette, alors l'attente porte
 * le patron « Liste » de la charte (`docs/charte-board.md` § 5) — le canvas,
 * le bandeau d'en-tête bord à bord, des `.carte-board` vides dans la
 * gouttière. Pas d'animation non plus : aucune surface du board ne pulse, et
 * la charte demande de respecter `prefers-reduced-motion` (§ 7, 22) ; une
 * forme immobile n'a rien à respecter.
 */
export function ChargementNeutre() {
  return (
    <main
      className="flex flex-1 flex-col bg-[color:var(--board-card)] pb-16"
      aria-busy="true"
    >
      <div className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <p
          role="status"
          className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]"
        >
          Chargement…
        </p>
        <div
          aria-hidden
          className="mt-3 h-[30px] w-[min(420px,70%)] rounded-[10px] bg-[color:var(--board-slate-pale)]"
        />
      </div>
      <div
        aria-hidden
        className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6"
      >
        <div className="carte-board h-[180px]" />
        <div className="grid gap-7 md:grid-cols-2">
          <div className="carte-board h-[220px]" />
          <div className="carte-board h-[220px]" />
        </div>
      </div>
    </main>
  );
}
