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

import Link from "next/link";
import { ArrowUpRight, FileText } from "lucide-react";
import { LegalBadge, Textes } from "@/components/ui-kit";
import { ChevronRepli, LIEN_REPLI } from "@/components/ui/repli";
import {
  documentsNonProduits,
  documentsProduits,
  type DocumentObligatoire,
} from "@/lib/referentiels/documents-obligatoires";

/** L'ancre citée par la page des éléments exclus. */
export const ANCRE_DOCUMENTS = "documents-obligatoires";

type LienDocument = { href: string; libelle: string; fichier?: boolean };

/**
 * Où ouvrir un document que Rojer produit (2026-10-29, demande de la
 * propriétaire) : la page expliquait chaque document sans en ouvrir aucun, et
 * c'est ici qu'on vient le chercher quand un contrôleur le demande. Une
 * entrée par document produit — la garde (`DocumentsObligatoires.test.tsx`)
 * refuse un document produit sans lien.
 */
export function liensDuDocument(
  documentId: string,
  etablissementId: string,
): LienDocument[] {
  const base = `/etablissements/${etablissementId}`;
  switch (documentId) {
    case "duerp":
      return [{ href: `${base}/duerp`, libelle: "Ouvrir le DUERP" }];
    case "registre-securite":
      return [
        { href: `${base}/registre`, libelle: "Ouvrir le registre" },
        {
          href: `/api/etablissements/${etablissementId}/registre/pdf`,
          libelle: "PDF du registre",
          fichier: true,
        },
      ];
    case "registre-accessibilite":
      return [{ href: `${base}/accessibilite`, libelle: "Ouvrir le registre d'accessibilité" }];
    case "plan-prevention":
      return [{ href: `${base}/plan-prevention`, libelle: "Ouvrir les plans de prévention" }];
    default:
      return [];
  }
}

function LiensDocument({ liens }: { liens: LienDocument[] }) {
  if (liens.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {liens.map((l) =>
        l.fichier ? (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-semibold text-[color:var(--board-ink)] ring-1 ring-[color:rgba(10,10,10,.18)] transition-colors hover:bg-[color:var(--board-slate-pale)]"
          >
            <FileText aria-hidden className="size-4" />
            {l.libelle}
            <span className="sr-only">(nouvel onglet)</span>
          </a>
        ) : (
          <Link
            key={l.href}
            href={l.href}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-[color:var(--board-ink)] px-4 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
          >
            {l.libelle}
            <ArrowUpRight aria-hidden className="size-4" />
          </Link>
        ),
      )}
    </div>
  );
}

export function DocumentsObligatoires({ etablissementId }: { etablissementId?: string }) {
  const produits = documentsProduits();
  const ailleurs = documentsNonProduits();

  return (
    <section id={ANCRE_DOCUMENTS} className="scroll-mt-8">
      {/* ~~L'en-tête de la section (sur-titre, titre en deux lignes, chapeau)~~
          [2026-10-25 : il est devenu l'en-tête commun de la page
          (`EnTetePage`, page « Documents obligatoires ») ; son chapeau y est
          repris en deux phrases. Le titre ne promet toujours pas
          l'exhaustivité (audit du 2026-10-12, § 4.7).] */}

      <div className="flex flex-col gap-10">
        <BlocDocuments
          surTitre="Rojer les produit"
          chapeau="Ces documents se composent dans l'application, se mettent à jour au fil de vos saisies et s'exportent."
          documents={produits}
          etablissementId={etablissementId}
        />
        {/* La moitié qui justifie la liste, et qui vient en second : un
            dirigeant qui parcourt une liste mêlée retient ce qu'il a déjà, pas
            ce qui lui manque. */}
        <BlocDocuments
          surTitre="Rojer ne les produit pas"
          chapeau="Ils vous incombent quand même. Chacun dit où il se tient — l'outil ne les fabrique pas et ne vous les rappellera pas."
          documents={ailleurs}
          etablissementId={etablissementId}
        />
      </div>
    </section>
  );
}

function BlocDocuments({
  surTitre,
  chapeau,
  documents,
  etablissementId,
}: {
  surTitre: string;
  chapeau: string;
  documents: DocumentObligatoire[];
  /** Absent, les documents ne portent pas de lien (page sans dossier). */
  etablissementId?: string;
}) {
  return (
    <div>
      {/* Un `h2` : depuis que la page a l'en-tête commun (2026-10-25), ce
          sont les titres de ses deux parties — un sur-titre en `p` laissait
          le plan sauter du `h1` aux `h3` des documents. */}
      <h2 className="board-titre m-0 text-[20px]">{surTitre}</h2>
      <p className="mt-2 max-w-[var(--board-mesure)] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
        {chapeau}
      </p>

      <ul className="m-0 mt-5 grid list-none grid-cols-1 gap-4 p-0 lg:grid-cols-2">
        {documents.map((d) => (
          <li
            key={d.id}
            className="rounded-2xl border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)]"
          >
            {/* Sur ordinateur, la carte dépliée. Sur téléphone, le nom seul,
                le reste derrière lui (2026-10-29) : douze cartes dépliées
                faisaient six écrans, et on y cherche un document par son
                nom. */}
            <div className="flex flex-col gap-3 p-6 max-md:hidden">
              <h3 className="m-0 text-[1.05rem] font-semibold leading-[1.3] tracking-[-0.012em]">
                {d.nom}
              </h3>
              {etablissementId ? (
                <LiensDocument liens={liensDuDocument(d.id, etablissementId)} />
              ) : null}
              <CorpsDocument d={d} />
            </div>
            <details className="group md:hidden">
              <summary className={`${LIEN_REPLI} min-h-14 w-full px-5 py-3 text-[15px] leading-[1.3] text-[color:var(--board-ink)]`}>
                <ChevronRepli />
                {/* Un titre dans le `summary` : le plan de la page reste le
                    même sur téléphone, un `h3` par document. */}
                <h3 className="m-0 min-w-0 flex-1 text-[15px] font-semibold leading-[1.3]">{d.nom}</h3>
              </summary>
              <div className="flex flex-col gap-3 px-5 pb-5">
                <CorpsDocument d={d} />
              </div>
            </details>
            {etablissementId && liensDuDocument(d.id, etablissementId).length > 0 ? (
              <div className="px-5 pb-4 md:hidden">
                <LiensDocument liens={liensDuDocument(d.id, etablissementId)} />
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Ce que demande le texte, quand c'est dû, où le lire, et les textes. */
function CorpsDocument({ d }: { d: DocumentObligatoire }) {
  return (
    <>
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

      {/* Les fondements sous un seul livre : plusieurs « Texte » côte à
          côte ne se distinguaient pas. */}
      <Textes>
        {d.fondements.map((f) => (
          <LegalBadge
            key={`${d.id}-${f.article}`}
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
      </Textes>
    </>
  );
}
