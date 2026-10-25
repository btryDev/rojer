import { requireEtablissement } from "@/lib/auth/scope";
import { listerEquipementsDeLEtablissement } from "@/lib/equipements/queries";
import { listerQuandCaArrive } from "@/lib/quand-ca-arrive/lignes";
import { MentionAConfirmer } from "@/components/calendrier/MentionAConfirmer";
import { AideEcran } from "@/components/ui-kit/AideEcran";
import { TexteSource } from "@/components/ui-kit/TexteSource";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { OngletsEnPlace } from "@/components/etats-permanents/OngletsEnPlace";
import { ChevronRepli } from "@/components/ui/repli";

export const metadata = {
  title: "En cas de… — Rojer",
};

/**
 * « En cas de… » — ~~« Quand ça arrive »~~, la fiche du troisième porteur
 * (ADR-037). [2026-10-24, décision de la propriétaire : un onglet de « Ce qui
 * doit être en place » plutôt qu'une entrée du menu — c'est de l'informatif,
 * et le dirigeant trouve au même endroit ce qui doit exister et ce qu'il
 * devra faire si tel événement arrive.]
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
export default async function EnCasDePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ decoupe?: string }>;
}) {
  const { id } = await params;
  // La découpe de l'autre onglet, reconduite par les liens d'onglet.
  const { decoupe } = await searchParams;
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
      {/* L'en-tête de « Ce qui doit être en place » : un onglet, pas une
          page — l'onglet actif dit qu'on est sur le second. */}
      <EnTetePage
        item="etats-permanents"
        description="Ce que vous devez faire quand un événement se produit : une embauche, un accident, une livraison, une canicule…"
      >
        <OngletsEnPlace
          etablissementId={id}
          actif="evenement"
          decoupe={decoupe === "geste" ? "geste" : undefined}
        />
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
                Cliquez sur un événement pour voir ce qu&apos;il rend dû ; le
                livre ouvre ensuite le texte exact et ses articles. Ce qu&apos;un
                fait rend dû à une personne ou à un appareil se lit sur sa fiche,
                dans Équipe et dans Équipements.
              </p>
            </AideEcran>
      </EnTetePage>

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
                    className="border-t border-[color:var(--board-slate-line)] pt-4 first:border-t-0 first:pt-0"
                  >
                    {/* Une ligne dépliable par fait (demande de la propriétaire
                        du 2026-10-22) : le FAIT reste visible, c'est l'entrée
                        par laquelle le dirigeant se reconnaît ; ce qui est dû
                        et le texte exact se déplient. La marque « à confirmer »
                        (D1, audit du 2026-10-12) et l'écrit à garder restent
                        sur la ligne fermée : ils ne se cachent pas. */}
                    <details className="group">
                      <summary className="flex min-h-6 cursor-pointer list-none items-start gap-2 [&::-webkit-details-marker]:hidden">
                        <span className="mt-[3px] text-[color:var(--board-slate-ink)]">
                          <ChevronRepli />
                        </span>
                        <span className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
                          <span className="max-w-[var(--board-mesure)] text-[15px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
                            {l.quand}
                          </span>
                          <MentionAConfirmer phrases={l.aConfirmer} />
                          {l.pieceAttendue && (
                            <span className="inline-flex items-center rounded-full bg-[color:var(--board-slate-pale)] px-2 py-[3px] text-[11px] font-medium text-[color:var(--board-slate-ink)]">
                              Écrit à garder : {l.pieceAttendue}
                            </span>
                          )}
                        </span>
                      </summary>
                      <div className="pl-6">
                        <p className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[14px] leading-[1.5] text-[color:var(--board-ink)]">
                          <span className="text-[color:var(--board-slate-mid)]">
                            →{" "}
                          </span>
                          {l.quoi}
                        </p>
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
                      </div>
                    </details>
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
