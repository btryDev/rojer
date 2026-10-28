import Link from "next/link";
import { BarreDeListe } from "@/components/ui-kit/BarreDeListe";
import { EnTetePage } from "@/components/entete-page/EnTetePage";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/EmptyState";
import { LegalBadge, PastilleRetard } from "@/components/ui-kit";
import { BadgeStatutAction } from "@/components/actions/BadgeStatutAction";
import { getEtablissement } from "@/lib/etablissements/queries";
import { exigenceEcheanceActions } from "@/lib/actions/echeance-exigee";
import { compterActions, listerActions } from "@/lib/actions/queries";
import { LABEL_TYPE_ACTION } from "@/lib/actions/labels";
import { formaterDateCourteFr } from "@/lib/dates";
import { estActionEnRetard } from "@/lib/dates/retard";
import { avecProvenance, origineDepuis } from "@/lib/navigation/provenance";
import { ORDRE_SELON_L4121_2 } from "@/lib/verbatim/l4121-2-ordre";
import { LigneTitreDeLaMesure } from "@/components/salaries/LigneTitreDeLaMesure";

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return formaterDateCourteFr(d);
}

// La pilule de filtre du board : encre pleine quand elle est active, contour
// discret sinon (même geste que la barre de filtres du calendrier). Le mot
// porte l'état, la couleur ne fait que l'appuyer.
const CHIP_BASE =
  "inline-flex items-center rounded-full border px-4 py-[7px] text-[12.5px] font-semibold transition-colors";
const CHIP_INACTIF =
  "border-[color:rgba(10,10,10,.16)] bg-[color:var(--board-card)] text-[color:var(--board-ink)] hover:bg-[color:var(--board-blue-pale)]";

/**
 * Un chiffre du plan et ce qu'il compte.
 *
 * Sous-bloc creux plutôt que carte : cinq cartes à rayon 30 alignées
 * lisaient comme cinq objets indépendants alors que c'est une seule rangée
 * de lecture. Seul « en retard » prend le champ de son état, et seulement
 * s'il y a quelque chose à signaler — un zéro rose ferait passer un écran
 * calme pour une alerte.
 */
function Compteur({
  legende,
  valeur,
  precision,
  alerte,
}: {
  legende: string;
  valeur: number;
  precision?: string | null;
  alerte?: boolean;
}) {
  const enAlerte = Boolean(alerte) && valeur > 0;
  return (
    <div
      className={
        "rounded-[22px] px-4 py-3.5 " +
        (enAlerte
          ? "bg-[color:var(--board-signal)]"
          : "bg-[color:var(--board-slate-pale)]")
      }
    >
      <p
        className={
          "board-eyebrow m-0 text-[10px] tracking-[0.16em] " +
          (enAlerte
            ? "text-[color:var(--board-signal-ink)]"
            : "text-[color:var(--board-slate-soft)]")
        }
      >
        {legende}
      </p>
      <p
        className={
          "board-titre m-0 mt-1.5 text-[26px] tabular-nums " +
          (enAlerte
            ? "text-[color:var(--board-signal-ink)]"
            : "text-[color:var(--board-ink)]")
        }
      >
        {valeur}
      </p>
      {precision ? (
        <p className="board-eyebrow m-0 mt-1 text-[9.5px] tracking-[0.14em] text-[color:var(--board-slate-soft)]">
          {precision}
        </p>
      ) : null}
    </div>
  );
}

export default async function PlanActionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ enCours?: string }>;
}) {
  const { id } = await params;
  const { enCours } = await searchParams;
  const etab = await getEtablissement(id);
  if (!etab) notFound();

  // Défaut : plan d'actions = ce qu'il reste à faire (ouverte/en_cours).
  // L'utilisateur peut passer `?enCours=0` pour inclure les levées/abandons
  // dans une vue audit (même route, cf. toggle ci-dessous).
  const enCoursSeulement = enCours !== "0";

  // Le plan d'actions, ce sont les mesures du DUERP, et elles seules
  // (ADR-048, lot 3, décision de la propriétaire du 2026-10-24) : les points
  // à corriger vivent sur les équipements. Liste et compteurs sur le même
  // filtre, sinon l'en-tête annonce ce que la liste ne montre pas.
  const [actions, compteurs] = await Promise.all([
    listerActions(id, { origine: "duerp", enCoursSeulement }),
    compterActions(id, new Date(), { origine: "duerp" }),
  ]);
  // Un seul `new Date()` pour toute la page — composant serveur, l'horloge
  // est lue une fois par requête : la pastille de retard compte ses jours
  // sur la même seconde que le test de dépassement.
  const maintenant = new Date();

  const baseHref = `/etablissements/${id}/actions`;
  // Le calendrier de mise en œuvre n'est imposé qu'à partir de cinquante
  // salariés (L. 4121-3-1). En dessous, la tuile compte sans rien exiger.
  const exigence = exigenceEcheanceActions({
    entreprise: etab.entreprise.effectif,
    site: etab.effectifSurSite,
  });
  // Ce que les fiches ouvertes d'ici devront savoir pour y revenir : le
  // plan d'actions *avec ses filtres*, pas la liste par défaut.
  const depuisCetteListe = origineDepuis(baseHref, { enCours });
  const makeHref = (over: { enCours?: string }): string => {
    const p = new URLSearchParams();
    // L'état "en cours seulement" est le défaut implicite (pas de param).
    // Seul le mode "tout afficher" est explicite via ?enCours=0.
    const e = over.enCours ?? (enCoursSeulement ? undefined : "0");
    if (e !== undefined) p.set("enCours", e);
    const q = p.toString();
    return q ? `${baseHref}?${q}` : baseHref;
  };

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      {/* Le titre est le nom du rail (2026-10-24) ; la phrase dit ce que la
          liste porte et où vit ce qu'elle ne porte pas : les points à
          corriger d'un contrôle se suivent sur leur équipement (ADR-048). */}
      <EnTetePage
        item="actions"
        description={
          <>
            Les mesures de prévention prévues dans votre DUERP, à suivre
            jusqu&apos;au bout. Les points relevés par un contrôle se suivent,
            eux, sur la fiche de leur{" "}
            <Link
              href={`/etablissements/${id}/equipements`}
              className="font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
            >
              équipement
            </Link>{" "}
            ou, pour un contrôle de tout le site, de leur contrôle au{" "}
            <Link
              href={`/etablissements/${id}/calendrier`}
              className="font-medium text-[color:var(--board-blue-ink)] underline underline-offset-4"
            >
              calendrier
            </Link>
            .
          </>
        }
      />

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        <BarreDeListe
          aide={
            <LegalBadge
              reference="Art. L. 4121-2 CT"
              href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000033019913"
              extrait="L'employeur met en oeuvre les mesures prévues à l'article L. 4121-1 sur le fondement des principes généraux de prévention suivants : 1° Eviter les risques ; 2° Evaluer les risques qui ne peuvent pas être évités ; 3° Combattre les risques à la source ; […]"
            >
              <p>
                {ORDRE_SELON_L4121_2}{" "}
                Rojer signale les risques du DUERP
                traités uniquement par des EPI, de la formation ou de
                l&apos;organisation.
              </p>
            </LegalBadge>
          }
          action={
            <a
              href={`/api/etablissements/${id}/plan-actions/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "boardClair", size: "board" })}
            >
              Exporter PDF
            </a>
          }
        />
        {/* Indicateurs */}
        <section className="carte-board px-7 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Compteur legende="À couvrir" valeur={compteurs.totalACouvrir} />
            <Compteur legende="En cours" valeur={compteurs.enCours} />
            <Compteur legende="En retard" valeur={compteurs.enRetard} alerte />
            {/* Sans échéance, une action n'apparaît sur aucun calendrier :
                elle n'a pas de jour où se poser (ADR-010). Ce compteur
                existait depuis l'origine sans être affiché nulle part — la
                seule trace de ces actions était un commentaire dans le code. */}
            <Compteur
              legende={exigence.exigee ? "À dater" : "Sans échéance"}
              valeur={compteurs.sansEcheance}
              precision={exigence.reference}
            />
            <Compteur
              legende="Levées (30 j)"
              valeur={compteurs.leveesRecemment}
            />
          </div>
        </section>

        {/* Filtre */}
        <section className="flex flex-wrap items-center gap-2">
          {/* Second axe de filtre, et non un état : il porte le glacier —
              le registre « calme et actif » — quand il quitte son défaut,
              pas l'ambre qui appartient à l'attention. */}
          <Link
            href={
              enCoursSeulement
                ? makeHref({ enCours: "0" }) // basculer vers « tout afficher »
                : makeHref({ enCours: "" }) // retour au défaut
            }
            className={
              `${CHIP_BASE} ` +
              (enCoursSeulement
                ? CHIP_INACTIF
                : "border-transparent bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]")
            }
          >
            {enCoursSeulement
              ? "Inclure levées / abandons"
              : "✓ Toutes (levées incluses)"}
          </Link>
        </section>

        {actions.length === 0 ? (
          enCoursSeulement && compteurs.leveesRecemment > 0 ? (
            <p className="carte-board m-0 px-7 py-5 text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)] sm:px-8">
              Aucune action à couvrir actuellement.{" "}
              <Link
                href={makeHref({ enCours: "0" })}
                className="font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
              >
                Voir aussi les {compteurs.leveesRecemment} levée
                {compteurs.leveesRecemment > 1 ? "s" : ""} récente
                {compteurs.leveesRecemment > 1 ? "s" : ""}
              </Link>
              .
            </p>
          ) : (
            <EmptyState
              titre="Le plan d'actions reprend les mesures de votre DUERP"
              pourquoi="Chaque mesure de prévention prévue dans votre DUERP remonte ici, avec son échéance et son responsable. Une mesure mise en place se clôture avec ce qui a été fait."
              quoiFaire="remplissez votre DUERP : les mesures s'ajouteront seules. Les points à corriger relevés par un contrôle, eux, se notent et se suivent sur la fiche du contrôle ou de l'équipement."
              ctaSecondary={{
                libelle: "Voir les équipements",
                href: `/etablissements/${id}/equipements`,
              }}
            />
          )
        ) : (
          <ul className="carte-board m-0 list-none p-0">
            {actions.map((a) => {
              // LE prédicat, pas une comparaison d'instants : le jour dit, dès
              // 2 h à Paris, la pastille disait « En retard » quand le compteur
              // de la même page ne la comptait pas (ADR-011, relecture système
              // du 2026-09-14).
              const echeanceDepassee = estActionEnRetard(a, maintenant);
              return (
                // Le filet se pose sur la ligne, jamais sur son contenu :
                // `first:` doit désigner la première ligne de la liste.
                <li
                  key={a.id}
                  className="flex items-start justify-between gap-4 border-t border-[color:var(--board-slate-line)] px-7 py-5 first:border-t-0 sm:px-8"
                >
                  <div className="min-w-0 flex-1">
                    <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
                      {a.libelle}
                    </p>
                    <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-slate-mid)]">
                      {LABEL_TYPE_ACTION[a.type]}
                      <span className="mx-2 text-[color:var(--board-slate)]">
                        ·
                      </span>
                      Échéance : {formatDate(a.echeance)}
                      {a.responsable && (
                        <>
                          <span className="mx-2 text-[color:var(--board-slate)]">
                            ·
                          </span>
                          {a.responsable}
                        </>
                      )}
                      {a.criticite !== null && (
                        <>
                          <span className="mx-2 text-[color:var(--board-slate)]">
                            ·
                          </span>
                          Criticité {a.criticite}
                        </>
                      )}
                    </p>
                    {a.description && (
                      <p className="m-0 mt-1.5 max-w-[var(--board-mesure)] text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                        {a.description}
                      </p>
                    )}
                    <LigneTitreDeLaMesure
                      referentielMesureId={a.referentielMesureId}
                      etablissementId={id}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="flex flex-none flex-col items-end gap-2">
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <BadgeStatutAction statut={a.statut} />
                      {/* Le retard s'ajoute au statut, il ne le remplace
                          pas — et il dit le nombre de jours, que personne
                          ne devrait avoir à soustraire. */}
                      {echeanceDepassee && a.echeance ? (
                        <PastilleRetard
                          echeance={a.echeance}
                          maintenant={maintenant}
                        />
                      ) : null}
                    </div>
                    <Link
                      href={avecProvenance(
                        `/etablissements/${id}/actions/${a.id}`,
                        depuisCetteListe,
                      )}
                      className={buttonVariants({
                        variant: "boardClair",
                        size: "boardSm",
                      })}
                    >
                      Détail
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
