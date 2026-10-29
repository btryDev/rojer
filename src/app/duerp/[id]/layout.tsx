import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { SidebarAvecPastilles } from "@/components/layout/SidebarAvecPastilles";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { BarreDeListe } from "@/components/ui-kit/BarreDeListe";
import { BarreCompte } from "@/components/layout/BarreCompte";
import { getDuerp } from "@/lib/duerps/queries";
import { getOptionalUser } from "@/lib/auth/require-user";
import { listerEtablissementsDuCompte } from "@/lib/etablissements/queries";
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
  // Le DUERP partage la sidebar de l'établissement, pastilles et état des
  // registres compris (`SidebarAvecPastilles`) : sans eux, entrer dans le
  // wizard faisait disparaître les retards (ADR-015). Ils ne retardent plus
  // l'affichage (plan performance, lot 3).
  // La fratrie, pour le sélecteur de la gélule : le shell DUERP partage la
  // même barre, donc la même règle (ADR-028).
  const fratrie = await listerEtablissementsDuCompte();
  // Secteur affiché dans le contexte : celui choisi dans le wizard en priorité,
  // sinon suggestion par NAF (même règle que la page secteur elle-même).
  const refChoisi = duerp.referentielSecteurId
    ? trouverReferentielParId(duerp.referentielSecteurId)
    : null;
  const refParNaf = trouverReferentielParNaf(duerp.etablissement.codeNaf);
  const ref = refChoisi ?? refParNaf;

  const effectif = duerp.entreprise.effectif;
  const contexte = [
    `NAF ${duerp.etablissement.codeNaf}`,
    ...(ref ? [ref.nom] : []),
    `${effectif} salarié${effectif > 1 ? "s" : ""}`,
  ];

  return (
    <div className="grid min-h-screen grid-cols-1 lg:h-screen lg:grid-cols-[auto_1fr] lg:overflow-hidden">
      <SidebarAvecPastilles
        etablissement={{
          id: etab.id,
          raisonDisplay: etab.raisonDisplay,
          adresse: etab.adresse,
          effectifSurSite: etab.effectifSurSite,
          entrepriseId: etab.entrepriseId,
          estERP: etab.estERP,
        }}
        active="duerp"
      />

      {/* `relative` : la gélule de compte s'y positionne, en haut à droite. */}
      {/* La place de la gélule, réservée par défaut (voir le shell
          d'établissement). */}
      <div className="relative flex min-w-0 flex-col bg-[color:var(--board-canvas)] pt-[var(--reserve-gelule)] lg:overflow-y-auto">
        {/* Le compte se tient en haut à droite ici aussi : le shell DUERP
            partage la même sidebar, donc la même règle. */}
        <BarreCompte
          etablissementId={etab.id}
          email={user?.email ?? null}
          etablissements={fratrie}
        />
        {/* Le grand en-tête, sur chaque étape de l'assistant (décision de la
            propriétaire du 2026-10-25) — le même que la porte d'entrée
            (`etablissements/[id]/duerp`), pour que passer de l'une à
            l'autre ne se lise pas comme changer de page. Il remplace
            `AppTopbar`, son fil d'Ariane et sa pilule de secteur. */}
        <EnTetePage
          item="duerp"
          description="Votre évaluation des risques, unité de travail par unité. Tout est enregistré au fur et à mesure : vous pouvez vous arrêter et reprendre."
        />
        {/* Le contexte du document et sa sortie, au-dessus de l'étape : ce
            que l'en-tête portait à droite, il ne le porte plus. */}
        <div className="px-[var(--board-gutter)] pt-6">
          <BarreDeListe
            contexte={contexte}
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
