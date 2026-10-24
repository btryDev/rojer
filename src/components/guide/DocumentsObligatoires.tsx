// Les documents obligatoires — y compris ceux que Rojer ne produit pas.
//
// La seconde des deux interfaces de l'ADR-025 § 8, et celle qui manquait le
// plus : le produit savait montrer ce qu'il fabrique, jamais ce qu'il ne
// fabrique pas. Le dirigeant qui n'avait que Rojer sous les yeux en concluait
// raisonnablement que sa documentation était couverte.
//
// POURQUOI ICI, ET PAS SUR UNE PAGE À ELLE. C'est le foyer qui demande le
// moins de nouveauté : la page « Comprendre vos obligations » existe, elle est
// déjà l'endroit où le produit explique ce que la loi attend, et elle portait
// justement la carte qui promettait ces documents-là. Une page de plus aurait
// ajouté une entrée de navigation que le lot suivant (A8) va de toute façon
// réorganiser en trois axes.
//
// CE QUI ÉTAIT ÉCRIT AVANT, ET QUI ÉTAIT FAUX. `OutilsConformite` portait une
// sixième carte, « Autres outils · À venir », sous une pastille « Bientôt »,
// listant « Registre unique du personnel, affichages obligatoires, fiche
// d'entreprise… ». Trois documents que le CLAUDE.md déclare hors périmètre.
// Une promesse tenait donc lieu de réponse, et sur le seul écran où le
// dirigeant venait chercher la liste de ce qu'il doit tenir. Mieux vaut une
// porte annoncée fermée qu'un bouton inerte (charte, interdit 19).
//
// Ce composant ne déclare rien : il rend `referentiels/documents-obligatoires`,
// dont chaque entrée porte un fondement vérifiable ou n'entre pas.

import { LegalBadge } from "@/components/ui-kit";
import {
  documentsNonProduits,
  documentsProduits,
  type DocumentObligatoire,
} from "@/lib/referentiels/documents-obligatoires";

/** L'ancre citée par la page des éléments exclus. */
export const ANCRE_DOCUMENTS = "documents-obligatoires";

export function DocumentsObligatoires() {
  const produits = documentsProduits();
  const ailleurs = documentsNonProduits();

  return (
    <section id={ANCRE_DOCUMENTS} className="scroll-mt-8">
      <header className="mb-10">
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          § Les documents obligatoires
        </p>
        <h2 className="board-titre mt-3 max-w-[20ch] text-[clamp(22px,2.2vw,27px)]">
          {/* ~~« Ce que vous devez tenir »~~ — promettait la liste complète
              sur neuf documents ; la liste est une décision de la
              propriétaire (audit du 2026-10-12, § 4.7). Le titre ne promet
              plus l'exhaustivité. */}
          Des documents que vous devez tenir,
          <br />
          <span className="text-[color:var(--board-blue-ink)]">
            y compris ailleurs qu&apos;ici.
          </span>
        </h2>
        <p className="mt-5 max-w-[var(--board-mesure)] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {/* Insécable devant le deux-points, comme les quarante autres
              endroits du dépôt qui l'écrivent déjà. Avec une espace ordinaire,
              la ligne cassait entre « compte » et « : », et le deux-points
              ouvrait la ligne suivante — un défaut intermittent, qui ne se voit
              qu'à la largeur où la coupure tombe là. */}
          Chaque ligne cite le texte qui la fonde, ouvrable sur Légifrance. La
          liste n&apos;est pas un compte&nbsp;: plusieurs de ces documents ne
          sont dus que dans certains cas, dits ligne par ligne. Et elle ne dit
          rien de votre situation — seulement ce que les textes demandent.
        </p>
      </header>

      <div className="flex flex-col gap-10">
        <BlocDocuments
          surTitre="Rojer les produit"
          chapeau="Ces documents se composent dans l'application, se mettent à jour au fil de vos saisies et s'exportent."
          documents={produits}
        />
        {/* La moitié qui justifie la liste, et qui vient en second : un
            dirigeant qui parcourt une liste mêlée retient ce qu'il a déjà, pas
            ce qui lui manque. */}
        <BlocDocuments
          surTitre="Rojer ne les produit pas"
          chapeau="Ils vous incombent quand même. Chacun dit où il se tient — l'outil ne les fabrique pas et ne vous les rappellera pas."
          documents={ailleurs}
        />
      </div>
    </section>
  );
}

function BlocDocuments({
  surTitre,
  chapeau,
  documents,
}: {
  surTitre: string;
  chapeau: string;
  documents: DocumentObligatoire[];
}) {
  return (
    <div>
      <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
        {surTitre}
      </p>
      <p className="mt-2 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        {chapeau}
      </p>

      <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
        {documents.map((d) => (
          <li
            key={d.id}
            className="flex flex-col gap-3 rounded-2xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] p-6"
          >
            <h3 className="m-0 text-[1.05rem] font-semibold leading-[1.3] tracking-[-0.012em]">
              {d.nom}
            </h3>

            <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
              {d.ceQueLeTexteDemande}
            </p>

            {d.quandIlEstDu ? (
              <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                <span className="font-semibold">Quand il est dû — </span>
                {d.quandIlEstDu}
              </p>
            ) : null}

            <div className="rounded-[18px] bg-[color:var(--board-slate-pale)] px-5 py-4">
              <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                {d.produitParRojer ? "Où le lire" : "Où le trouver"}
              </p>
              <p className="m-0 mt-2 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-ink)]">
                {d.produitParRojer ? d.ouDansRojer : d.ouLeTrouver}
              </p>
            </div>

            {/* Une pastille par fondement, dépliable sur la citation et le
                lien Légifrance. `charte="board"` sur chacune : le défaut du
                composant est « papier », et l'oublier rendrait un encart d'une
                autre famille au milieu de la carte, sans erreur ni
                avertissement. */}
            <div className="flex flex-wrap gap-2">
              {d.fondements.map((f) => (
                <LegalBadge
                  key={`${d.id}-${f.article}`}
                  charte="board"
                  reference={f.article}
                  href={f.url}
                  extrait={f.citationCle}
                >
                  <span className="block">{f.reference}</span>
                  <span className="mt-2 block text-[11.5px] text-[color:var(--board-slate-mid)]">
                    Version en vigueur depuis le {f.versionConstatee}, relevée
                    le {f.luLe}.
                  </span>
                </LegalBadge>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
