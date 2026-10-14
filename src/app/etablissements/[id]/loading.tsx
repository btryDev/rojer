/**
 * L'attente d'un écran de l'établissement (audit Next.js du 2026-10-14, M1).
 *
 * Toutes les routes sont dynamiques : sans ce fichier, un clic dans la barre
 * latérale ne donnait AUCUN retour tant que la réponse entière n'était pas
 * arrivée — le tableau de bord en attendait une centaine de requêtes. Next
 * enveloppe la page de ce segment dans un `<Suspense>` dont ceci est le
 * repli : le layout — barre latérale et barre de compte — reste en place, et
 * seule la colonne de droite attend.
 *
 * Aucun style nouveau : la charte n'a pas de squelette, alors l'attente porte
 * le patron « Liste » de la charte (`docs/charte-board.md` § 5) — le canvas,
 * le bandeau d'en-tête bord à bord, des `.carte-board` vides dans la
 * gouttière. Pas d'animation non plus : aucune surface du board ne pulse, et
 * la charte demande de respecter `prefers-reduced-motion` (§ 7, 22) ; une
 * forme immobile n'a rien à respecter.
 *
 * Un `notFound()` levé par une page imbriquée arrive désormais APRÈS le début
 * du flux : la réponse garde le statut 200, avec la page introuvable et un
 * `noindex` (documentation de Next, `loading.js` § « Status Codes »). La garde
 * de l'établissement, elle, vit dans le layout, au-dessus de ce repli : un
 * dossier étranger répond toujours 404.
 */
export default function ChargementEtablissement() {
  return (
    <main
      className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16"
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
