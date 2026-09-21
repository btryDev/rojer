import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireEtablissement } from "@/lib/auth/scope";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import { listerQuandCaArrive } from "@/lib/quand-ca-arrive/lignes";

export const metadata = {
  title: "Quand ça arrive — Rojer",
};

/**
 * « Quand ça arrive » — la fiche du troisième porteur (ADR-037).
 *
 * Ce que cette page ne porte JAMAIS, et c'est sa règle : ni date, ni état, ni
 * case, ni compteur, ni retard. Une obligation événementielle redevient due au
 * fait suivant ; tout ce qui ressemblerait à un solde mentirait le lendemain.
 * Elle n'écrit rien et ne lit aucune déclaration : elle dit la règle, pour CE
 * dossier, telle que le moteur la retient.
 *
 * Elle ne dit pas non plus que rien n'est dû en ce moment — le produit ne sait
 * pas si le fait est survenu. D'où le chapeau, et l'absence de tout vert.
 */
export default async function QuandCaArrivePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);
  const equipements = await listerEquipementsDeLEtablissement(id);
  const groupes = listerQuandCaArrive(
    etablissement,
    equipements.map((eq) => ({
      id: eq.id,
      libelle: eq.libelle,
      categorie: eq.categorie,
      caracteristiques: (eq.caracteristiques ?? null) as Record<
        string,
        unknown
      > | null,
    })),
  );

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <div className="min-w-0">
          <Link
            href={`/etablissements/${id}`}
            className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
          >
            <ArrowLeft className="size-3" aria-hidden />
            {etablissement.raisonDisplay}
          </Link>
          <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
            Quand ça arrive
          </h1>
          <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
            Des obligations qui n&apos;ont pas de date : elles deviennent dues
            quand un fait survient chez vous — une embauche, un changement de
            poste, une livraison. Rojer ne sait pas quand ce fait arrive ; il ne
            peut donc ni vous le rappeler, ni vous dire que vous êtes à jour. Il
            vous dit la règle, pour que vous la connaissiez le jour venu.
          </p>
        </div>
      </header>

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        {groupes.length === 0 ? (
          <section className="carte-board px-7 py-8 sm:px-8">
            <div className="flex max-w-[600px] flex-col gap-3">
              <h2 className="board-titre m-0 text-[22px]">
                Rien de cette nature pour ce dossier
              </h2>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Aucune des obligations que votre dossier déclenche ne dépend
                d&apos;un fait à venir parmi celles que Rojer porte. Cela ne
                veut pas dire qu&apos;aucun texte n&apos;en prévoit : voyez « Ce
                que Rojer ne couvre pas ».
              </p>
            </div>
          </section>
        ) : (
          groupes.map((g) => (
            <section key={g.domaine} className="carte-board px-7 py-6 sm:px-8">
              <h2 className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                {g.libelle}
              </h2>
              <ul className="m-0 mt-3 flex list-none flex-col gap-5 p-0">
                {g.lignes.map((l) => (
                  <li
                    key={l.obligation.id}
                    className="border-t border-[color:var(--board-slate-line)] pt-5 first:border-t-0 first:pt-0"
                  >
                    {/* Le FAIT d'abord : c'est l'entrée par laquelle le
                        dirigeant se reconnaît. L'obligation vient ensuite. */}
                    <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                      Quand
                    </p>
                    <p className="m-0 mt-1 max-w-[72ch] text-[14.5px] font-semibold leading-[1.45] text-[color:var(--board-ink)]">
                      {l.fait}
                    </p>
                    <p className="board-eyebrow m-0 mt-3 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                      Ce qui est dû
                    </p>
                    <p className="m-0 mt-1 max-w-[72ch] text-[14px] leading-[1.5] text-[color:var(--board-ink)]">
                      {l.obligation.libelle}
                    </p>
                    <p className="m-0 mt-1.5 max-w-[72ch] text-[13px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                      {l.obligation.description}
                    </p>
                    {l.pieceAttendue && (
                      <p className="m-0 mt-2 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                        Le texte attend un écrit : {l.pieceAttendue}.
                      </p>
                    )}
                    <p className="m-0 mt-2 text-[12px] leading-[1.5] text-[color:var(--board-slate-soft)]">
                      {l.article}
                    </p>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </main>
  );
}
