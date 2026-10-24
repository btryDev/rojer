// Les pièces d'un appareil : ses photos et ses papiers.
//
// Les deux cartes sont posées **même vides**. Un emplacement qui
// n'apparaît qu'une fois rempli ne se remplit jamais : personne ne
// devine qu'on peut joindre la plaque signalétique d'un extincteur ou le
// contrat d'entretien de la hotte si rien ne le dit. L'état vide est
// donc le plus important des deux — il énonce ce qu'on attend et
// pourquoi.
//
// Ce que ces cartes ne sont pas : le registre. Un rapport de vérification
// est une preuve datée, rattachée à l'occurrence qu'il solde, et il vit
// au registre de sécurité. Ici, ce sont les papiers de l'objet — notice,
// facture, contrat — qui ne soldent rien et n'ont pas d'échéance.
//
// Le dépôt n'existe pas encore : l'équipement n'a aucune pièce jointe en
// base. Les zones d'ajout sont donc inertes et étiquetées « bientôt »,
// comme les entrées non implémentées de la barre latérale — mieux vaut
// une porte annoncée fermée qu'un bouton qui ne fait rien.

import { FileText, ImageIcon, Plus } from "lucide-react";
import { CarteFiche } from "@/components/ui-kit";

/** Une pièce jointe, telle que la carte l'affichera. Le type existe
 *  avant le modèle : c'est lui que la lecture devra rendre. */
export type PieceEquipement = {
  id: string;
  nom: string;
  /** « Notice », « Facture », « Contrat » — ou la date, pour une photo. */
  meta: string;
  href: string;
};

function Bientot() {
  // `--board-slate` est un ton de graduation, pas d'encre (~1,6:1 sur le
  // fond) : le seul mot qui dit que ces emplacements sont inertes était
  // illisible.
  return (
    <span className="board-eyebrow text-[9px] tracking-[0.1em] text-[color:var(--board-slate-mid)]">
      bientôt
    </span>
  );
}

export function CartePhotos({ photos = [] }: { photos?: PieceEquipement[] }) {
  return (
    <CarteFiche
      titreFort="Photos"
      droite={
        photos.length > 0 ? (
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            {photos.length} photo{photos.length > 1 ? "s" : ""}
          </p>
        ) : (
          <Bientot />
        )
      }
      corpsClassName="px-7 pb-7 pt-3 sm:px-8"
    >
      <p className="m-0 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        La plaque signalétique, l&apos;emplacement, l&apos;état constaté. Une
        photo datée vaut mieux qu&apos;une description quand il faut retrouver
        l&apos;appareil ou justifier son remplacement.
      </p>

      <div className="mt-[18px] flex flex-wrap gap-3">
        {photos.map((p) => (
          <span
            key={p.id}
            className="grid size-[92px] w-[118px] place-items-center rounded-[18px] bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate)]"
          >
            <ImageIcon className="size-[26px]" aria-hidden />
          </span>
        ))}
        {/* Un vrai `<button disabled>`, pas un `<span aria-disabled>` :
            sans `role`, `aria-disabled` n'est pas exposé, et l'élément
            n'était ni focusable ni annoncé. Il ressemblait pourtant à un
            bouton — bordure, icône, libellé. Le `title` porte le « bientôt »
            pour qui ne voit pas la mention en tête de carte. */}
        <button
          type="button"
          disabled
          title="Bientôt disponible"
          className="grid h-[92px] w-[118px] place-items-center gap-1.5 rounded-[18px] border border-dashed border-[color:var(--board-slate)] text-[color:var(--board-slate-soft)] disabled:cursor-not-allowed"
        >
          <Plus className="size-5" aria-hidden />
          <span className="text-[11.5px] font-semibold">Ajouter une photo</span>
          <span className="sr-only"> — bientôt disponible</span>
        </button>
      </div>
    </CarteFiche>
  );
}

export function CarteDocuments({
  documents = [],
}: {
  documents?: PieceEquipement[];
}) {
  return (
    <CarteFiche
      titreFort="Documents"
      droite={
        documents.length > 0 ? (
          <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            {documents.length} pièce{documents.length > 1 ? "s" : ""}
          </p>
        ) : (
          <Bientot />
        )
      }
      corpsClassName="px-7 pb-7 pt-3 sm:px-8"
    >
      <p className="m-0 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        Les papiers de l&apos;appareil&nbsp;: notice, facture, contrat
        d&apos;entretien. Les rapports de vérification, eux, restent au registre
        de sécurité — c&apos;est là qu&apos;on va les chercher en cas de
        contrôle.
      </p>

      {documents.length > 0 ? (
        <div className="mt-4 flex flex-col">
          {documents.map((d) => (
            <span
              key={d.id}
              className="flex items-center gap-3.5 border-t border-[color:var(--board-slate-line)] py-3 first:border-t-0"
            >
              <span className="grid size-[38px] flex-none place-items-center rounded-[13px] bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]">
                <FileText className="size-[18px]" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold leading-[1.3] text-[color:var(--board-ink)]">
                  {d.nom}
                </span>
                <span className="mt-0.5 block text-[12.5px] text-[color:var(--board-slate-mid)]">
                  {d.meta}
                </span>
              </span>
            </span>
          ))}
        </div>
      ) : null}

      <button
        type="button"
        disabled
        title="Bientôt disponible"
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-[18px] border border-dashed border-[color:var(--board-slate)] py-3 text-[12.5px] font-semibold text-[color:var(--board-slate-soft)] disabled:cursor-not-allowed"
      >
        <Plus className="size-4" aria-hidden />
        Ajouter un document
        <span className="sr-only"> — bientôt disponible</span>
      </button>
    </CarteFiche>
  );
}
