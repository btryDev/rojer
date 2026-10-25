import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { BarreDeListe } from "@/components/ui-kit/BarreDeListe";
import { BarreCompte } from "@/components/layout/BarreCompte";
import { getDuerp } from "@/lib/duerps/queries";
import { getOptionalUser } from "@/lib/auth/require-user";
import { getEtatModules } from "@/lib/etablissements/modules";
import { listerEtablissementsDeLEntreprise } from "@/lib/etablissements/queries";
import { chargerSidebarCounts } from "@/lib/navigation/sidebar-counts";
import {
  trouverReferentielParId,
  trouverReferentielParNaf,
} from "@/lib/referentiels";

/**
 * Shell V2 pour les pages DUERP — aligne /duerp/[id]/* sur le même
 * chrome que /etablissements/[id]/* : rail gauche persistant (AppSidebar
 * avec l'item "DUERP" actif) + topbar sticky avec crumbs → raison sociale
 * → DUERP. L'ancien header éditorial centré a été remplacé ; le contenu
 * interne (fil du wizard, carte de secteur, tableaux de risques) garde sa
 * largeur max-w-5xl pour préserver la lecture de type « document ».
 *
 * Cette largeur est l'exception nommée de la charte board (§ 5, « la
 * largeur de lecture ») : ces pages se lisent en phrases longues, et une
 * ligne de 1400 px ne se lit pas. Elle porte sur la largeur, et sur rien
 * d'autre — le contenu est en charte board comme partout ailleurs, d'où
 * le canvas posé ici : des cartes blanches sur `--paper` ne se
 * détachaient plus du fond.
 */
export default async function DuerpLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [duerp, user] = await Promise.all([
    getDuerp(id),
    getOptionalUser(),
  ]);
  if (!duerp) notFound();

  const etab = duerp.etablissement;
  // Le DUERP partage la sidebar de l'établissement : sans cet état ni ces
  // compteurs, registres et pastilles y seraient qualifiés autrement
  // qu'ailleurs dans le produit — entrer dans le wizard faisait
  // disparaître les retards (ADR-015).
  // La fratrie vient avec, pour le sélecteur de la barre haute : le shell DUERP
  // partage la même barre, donc la même règle (ADR-028).
  const [modules, counts, fratrie] = await Promise.all([
    getEtatModules(etab.id, etab.estERP),
    chargerSidebarCounts(etab.id),
    listerEtablissementsDeLEntreprise(etab.entrepriseId),
  ]);
  // Secteur affiché dans le contexte : celui choisi dans le wizard en priorité,
  // sinon suggestion par NAF (même règle que la page secteur elle-même).
  const refChoisi = duerp.referentielSecteurId
    ? trouverReferentielParId(duerp.referentielSecteurId)
    : null;
  const refParNaf = trouverReferentielParNaf(duerp.entreprise.codeNaf);
  const ref = refChoisi ?? refParNaf;

  const effectif = duerp.entreprise.effectif;
  const contexte = [
    `NAF ${duerp.entreprise.codeNaf}`,
    ...(ref ? [ref.nom] : []),
    `${effectif} salarié${effectif > 1 ? "s" : ""}`,
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[auto_1fr] lg:overflow-hidden">
      <AppSidebar
        etablissement={{
          id: etab.id,
          raisonDisplay: etab.raisonDisplay,
          adresse: etab.adresse,
          effectifSurSite: etab.effectifSurSite,
          entrepriseId: etab.entrepriseId,
        }}
        active="duerp"
        counts={counts}
        modules={modules}
      />

      {/* `relative` : la gélule de compte s'y positionne, en haut à droite. */}
      <div className="relative flex min-w-0 flex-col bg-[color:var(--board-canvas)] lg:overflow-y-auto">
        {/* Le compte se tient en haut à droite ici aussi : le shell DUERP
            partage la même sidebar, donc la même règle. */}
        <BarreCompte
          etablissementId={etab.id}
          email={user?.email ?? null}
          etablissements={fratrie.map((e) => ({
            id: e.id,
            raisonDisplay: e.raisonDisplay,
          }))}
        />
        {/* Le grand en-tête, sur chaque étape de l'assistant (décision de la
            propriétaire du 2026-10-25) — le même que la porte d'entrée
            (`etablissements/[id]/duerp`), pour que passer de l'une à
            l'autre ne se lise pas comme changer de page. Il remplace
            `AppTopbar`, son fil d'Ariane et sa pilule de secteur. */}
        <EnTetePage
          item="duerp"
          titre="Votre DUERP"
          description="Votre évaluation des risques, unité de travail par unité. Tout est enregistré au fur et à mesure : vous pouvez vous arrêter et reprendre."
        />
        {/* Le contexte du document et sa sortie, au-dessus de l'étape : ce
            que l'en-tête portait à droite, il ne le porte plus. */}
        <div className="px-[var(--board-gutter)] pt-6">
          <BarreDeListe
            resume={
              <p className="m-0 flex flex-wrap items-center gap-x-2 text-[13px] text-[color:var(--board-slate-mid)]">
                {contexte.map((c, i) => (
                  <span key={c} className="flex items-center gap-x-2">
                    {i > 0 ? <span aria-hidden>·</span> : null}
                    {c}
                  </span>
                ))}
              </p>
            }
            action={
              <Link
                href={`/duerp/${id}/pdf/preview`}
                className={buttonVariants({
                  variant: "boardClair",
                  size: "boardSm",
                })}
              >
                PDF DUERP ↓
              </Link>
            }
          />
        </div>

        <div className="mx-auto w-full max-w-5xl px-6 py-12 sm:px-10 sm:py-14">
          {children}
        </div>
      </div>
    </div>
  );
}
