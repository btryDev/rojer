/**
 * L'attente d'une étape du DUERP (plan performance, lot 3, 2026-10-29).
 *
 * Le shell DUERP (`layout.tsx`) rend déjà l'en-tête, la barre de contexte et
 * la colonne de lecture : seul le corps de l'étape attend ici. Sans ce
 * fichier, la page bloquait le premier envoi et rien ne s'affichait tant
 * qu'elle n'était pas prête ; avec lui, le shell part tout de suite, et la
 * barre latérale peut ne plus attendre ses pastilles (`SidebarAvecPastilles`).
 *
 * Posé à la racine de `/duerp/[id]` et nulle part plus bas : Next rattache un
 * repli au segment enfant, ici le dossier de l'étape (« unites »,
 * « risques »…), jamais aux paramètres d'URL — passer d'une étape à l'autre
 * le montre, rien d'autre (voir `etablissements/[id]/loading.tsx`).
 *
 * Des `.carte-board` vides, immobiles (charte § 7 : aucune surface ne pulse).
 */
export default function ChargementEtapeDuerp() {
  return (
    <div className="flex flex-col gap-7">
      <p role="status" className="sr-only">
        Chargement…
      </p>
      <div aria-hidden className="carte-board h-[160px]" />
      <div aria-hidden className="carte-board h-[260px]" />
    </div>
  );
}
