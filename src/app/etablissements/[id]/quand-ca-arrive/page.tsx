import { FilAriane } from "@/components/navigation/FilAriane";
import { LABEL_ITEM } from "@/components/layout/sidebar-nav";
import { requireEtablissement } from "@/lib/auth/scope";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import { listerQuandCaArrive } from "@/lib/quand-ca-arrive/lignes";
import { MentionAConfirmer } from "@/components/calendrier/MentionAConfirmer";
import { AideEcran } from "@/components/ui-kit/AideEcran";
import { TexteSource } from "@/components/ui-kit/TexteSource";

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
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <FilAriane
              crumbs={[
                { href: `/etablissements/${id}`, label: etablissement.raisonDisplay },
                { label: LABEL_ITEM["quand-ca-arrive"] },
              ]}
            />
            <h1 className="board-titre m-0 text-[clamp(22px,2.2vw,27px)]">
              Quand ça arrive
            </h1>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              Ce que vous devez faire quand un événement se produit : une
              embauche, un accident, une livraison, une canicule…
            </p>
          </div>
          <AideEcran titre="Comment lire cette page">
            <p className="m-0">
              Ces obligations n&apos;ont pas de date : elles deviennent dues
              quand un fait survient — une embauche, une première affectation à
              un travail sur écran, une opération de chargement ou de
              déchargement par une entreprise extérieure, la fin de certains
              arrêts de travail, un accident du travail grave, un épisode de
              chaleur intense.
            </p>
            <p className="m-0">
              Rojer ne sait pas quand ce fait arrive ; il ne peut donc ni vous
              le rappeler, ni vous dire où vous en êtes. Il vous dit la règle,
              pour que vous la connaissiez le jour venu.
            </p>
            <p className="m-0">
              Ce qu&apos;un fait rend dû à une personne ou à un appareil se lit
              sur sa fiche, dans Équipe et dans Équipements. Le livre de chaque
              carte ouvre le texte exact et ses articles.
            </p>
          </AideEcran>
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
                Parmi les obligations que Rojer porte pour votre établissement,
                aucune ne dépend d&apos;un fait à venir. Celles qui tiennent à
                une personne ou à un appareil se lisent sur leur fiche, dans
                Équipe et dans Équipements. Rojer ne porte pas toutes les
                obligations de cette nature que les textes prévoient.
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
                    {/* Le FAIT d'abord, en clair : c'est l'entrée par
                        laquelle le dirigeant se reconnaît. Le texte exact est
                        sous le livre. */}
                    <p className="m-0 max-w-[72ch] text-[15px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
                      {l.quand}
                    </p>
                    <p className="m-0 mt-1.5 max-w-[72ch] text-[14px] leading-[1.5] text-[color:var(--board-ink)]">
                      <span className="text-[color:var(--board-slate-mid)]">
                        →{" "}
                      </span>
                      {l.quoi}
                    </p>
                    {/* La marque des autres surfaces (D1) : la ligne est là
                        parce que la fiche se tait, pas parce qu'elle est due
                        à coup sûr (audit du 2026-10-12). */}
                    {(l.aConfirmer.length > 0 || l.pieceAttendue) && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <MentionAConfirmer phrases={l.aConfirmer} />
                        {l.pieceAttendue && (
                          <span className="inline-flex items-center rounded-full bg-[color:var(--board-slate-pale)] px-2 py-[3px] text-[11px] font-medium text-[color:var(--board-slate-ink)]">
                            Écrit à garder : {l.pieceAttendue}
                          </span>
                        )}
                      </div>
                    )}
                    <TexteSource articles={l.articles} className="mt-2">
                      <p>
                        <strong className="font-semibold">Quand :</strong>{" "}
                        {l.fait}
                      </p>
                      <p>
                        <strong className="font-semibold">
                          Ce qui est dû :
                        </strong>{" "}
                        {l.obligation.libelle}
                      </p>
                      {l.description && <p>{l.description}</p>}
                    </TexteSource>
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
