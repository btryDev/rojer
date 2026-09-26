import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { AideEcran } from "@/components/ui-kit/AideEcran";
import { LegalBadge } from "@/components/ui-kit/LegalBadge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/layout/EmptyState";
import { BadgeResultat } from "@/components/rapports/BadgeResultat";
import { SupprimerRapportButton } from "@/components/rapports/SupprimerRapportButton";
import { avecProvenance, origineDepuis } from "@/lib/navigation/provenance";
import { getEtablissement } from "@/lib/etablissements/queries";
import { composerRegistreDeLEtablissement } from "@/lib/registre/queries";
import { saisiePourSection } from "@/lib/registre/champs";
import {
  JaugeRegistre,
  LigneRegistre,
  PartieRegistre,
} from "@/components/registre";
import { alimentationDeLaPartie } from "@/lib/registre/alimentation";
import {
  bilanDuRegistre,
  completudeDeLaFiche,
} from "@/lib/registre/completude";
import { BandeauCouverture } from "@/components/perimetre/BandeauCouverture";
import { couvertureDuDossier } from "@/lib/perimetre/faits";
import { listerRapportsDeLEtablissement } from "@/lib/rapports/queries";
import {
  LABEL_DOMAINE,
  libellePorteur,
} from "@/lib/calendrier/labels";
import { obligationParId } from "@/lib/referentiels/conformite";
import type { DomaineObligation } from "@/lib/referentiels/conformite/types";
import { formaterDateCourteFr } from "@/lib/dates";

const DOMAINES_P1: DomaineObligation[] = ["electricite", "incendie", "aeration"];

function formatTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`;
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} Ko`;
  return `${(octets / 1024 / 1024).toFixed(1)} Mo`;
}

export default async function RegistrePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ domaine?: string; q?: string }>;
}) {
  const { id } = await params;
  const { domaine, q } = await searchParams;
  const etab = await getEtablissement(id);
  if (!etab) notFound();

  const base = `/etablissements/${id}`;
  const baseHref = `${base}/registre`;

  const filtreDomaine = DOMAINES_P1.includes(domaine as DomaineObligation)
    ? (domaine as DomaineObligation)
    : undefined;

  const rapports = await listerRapportsDeLEtablissement(id, {
    domaine: filtreDomaine,
    recherche: q,
  });
  const registre = await composerRegistreDeLEtablissement(id);

  // Ce que l'outil couvre, et ce qu'il ne couvre pas. Se lit AVANT le
  // registre : un dirigeant hors périmètre doit savoir que ce qui suit est
  // incomplet avant de le lire, pas après.
  const couverture = await couvertureDuDossier(id);

  // La complétude se lit fiche par fiche, jamais partie par partie : une même
  // partie mêle des fiches que l'outil recueille et d'autres non. Le
  // troisième argument dit quelles fiches se tiennent ailleurs — sans lui, la
  // jauge compte comme « pas encore outillé » tout ce qui n'a pas de
  // formulaire ici, c'est-à-dire l'inventaire et les vérifications, qui sont
  // tenus depuis toujours.
  const completudes = new Map(
    (registre?.parties ?? []).flatMap((partie) =>
      partie.sections.map(
        (due) =>
          [
            due.section.id,
            completudeDeLaFiche(
              saisiePourSection(due.section.id),
              registre?.contenus[due.section.id] ?? {},
              alimentationDeLaPartie(partie.id, base),
            ),
          ] as const,
      ),
    ),
  );
  const bilan = bilanDuRegistre([...completudes.values()]);

  // Le registre n'est pas le parent d'une vérification — le calendrier
  // l'est. Le lien emporte donc le registre, filtres compris, pour que le
  // retour ne renvoie pas ailleurs.
  const depuisCeRegistre = origineDepuis(baseHref, { domaine, q });
  const makeHref = (over: { domaine?: string; q?: string }) => {
    const p = new URLSearchParams();
    const d = over.domaine ?? filtreDomaine;
    const qq = over.q ?? q ?? "";
    if (d) p.set("domaine", d);
    if (qq) p.set("q", qq);
    const s = p.toString();
    return s ? `${baseHref}?${s}` : baseHref;
  };

  // Ce que la page doit expliquer mais qu'on ne lit qu'une fois — ce qu'est
  // ce document, sur quoi il se fonde, ce que l'outil fait et ne fait pas.
  // En texte courant au-dessus du contenu, ces notes coûtaient six lignes et
  // trois badges à chaque visite.
  const aide = (
    <AideEcran titre="Comment lire cette page">
      <p>
        Le registre de sécurité réunit, en un seul document, ce qu&apos;un
        contrôleur demande à voir : l&apos;organisation des secours,
        l&apos;inventaire des moyens, les vérifications et leurs rapports, les
        contrôles et les événements.
      </p>
      <p>
        Toutes les fiches ne concernent pas tout le monde. Celles qui figurent
        ci-dessous sont dues pour cet établissement, compte tenu de son régime
        et des équipements déclarés — chacune dit pourquoi elle est là.
      </p>
      <p>
        <strong>L&apos;outil stocke, il ne vérifie pas.</strong>{" "}
        Les contrôles
        doivent être réalisés par un organisme agréé ou une personne
        qualifiée ; l&apos;application conserve ce qu&apos;ils vous remettent
        et vous dit ce qui manque.
      </p>
      <div className="flex flex-wrap gap-2 pt-1">
        <LegalBadge
          charte="board"
          reference="Art. R. 143-44 CCH"
          href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000043819037"
          extrait="Dans les établissements soumis aux prescriptions du présent chapitre, il doit être tenu un registre de sécurité sur lequel sont reportés les renseignements indispensables à la bonne marche du service de sécurité."
        >
          <p>
            Le fondement du registre en établissement recevant du public. Il
            énumère ce qui doit y figurer : travaux d&apos;aménagement, état
            nominatif du service de sécurité, consignes, dates des contrôles et
            vérifications, dates des exercices de sécurité incendie.
          </p>
        </LegalBadge>
        <LegalBadge
          charte="board"
          reference="Art. L. 4711-1 CT"
          href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903383"
          extrait="Les attestations, consignes, résultats et rapports relatifs aux vérifications et contrôles mis à la charge de l'employeur au titre de la santé et de la sécurité au travail comportent des mentions obligatoires déterminées par voie réglementaire."
        />
        <LegalBadge
          charte="board"
          reference="Art. L. 4711-5 CT"
          href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000006903389"
          extrait="[…] l'employeur est autorisé à réunir ces informations dans un registre unique dès lors que cette mesure est de nature à faciliter la conservation et la consultation de ces informations."
        >
          <p>
            Cet article n&apos;institue pas le registre : il autorise seulement
            à réunir plusieurs registres en un seul, ce que fait cette page.
          </p>
        </LegalBadge>
        {/* La durée de conservation, que l'écran ne disait nulle part (dette
            relevée au corpus, `code-travail-incendie.ts`, et close avec le N5
            de l'ADR-034). Citation et lien relus à la source le 2026-09-01,
            version en vigueur depuis le 16/03/2009. */}
        <LegalBadge
          charte="board"
          reference="Art. D. 4711-3 CT"
          href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000020398142/"
          extrait="Sauf dispositions particulières, l'employeur conserve les documents concernant les observations et mises en demeure de l'inspection du travail ainsi que ceux concernant les vérifications et contrôles mis à la charge des employeurs au titre de la santé et de la sécurité au travail des cinq dernières années et, en tout état de cause, ceux des deux derniers contrôles ou vérifications."
        >
          <p>
            La durée de conservation des pièces de vérification : les cinq
            dernières années, et en tout état de cause les deux derniers
            contrôles. « Sauf dispositions particulières » : un texte spécial
            peut exiger plus longtemps.
          </p>
        </LegalBadge>
      </div>
    </AideEcran>
  );

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      {/* La bande de titre — l'identité de l'écran, et rien d'autre. Même
          strate que le calendrier : rail de contexte en mono, titre en grand,
          une phrase. Les commandes vivent plus bas, avec ce qu'elles
          règlent. */}
      <div className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] pb-8 pt-[26px]">
        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
          <Link
            href={base}
            className="board-eyebrow group -ml-0.5 inline-flex min-w-0 items-center gap-1.5 transition-colors hover:text-[color:var(--board-ink)]"
          >
            <ChevronRight
              aria-hidden
              className="size-3 flex-none rotate-180 transition-transform group-hover:-translate-x-0.5"
            />
            <span className="truncate">{etab.raisonDisplay}</span>
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
          <div className="min-w-0 flex-1">
            <h1 className="board-titre m-0 text-[clamp(29px,3vw,39px)]">
              Registre de sécurité
            </h1>
            <p className="m-0 mt-[11px] max-w-[62ch] text-[14.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              Le document que vous présentez à l&apos;inspection du travail et
              à la commission de sécurité, tenu au fil de l&apos;eau.
            </p>
          </div>
          <div className="flex flex-none flex-wrap items-center gap-2.5">
            <a
              href={`/api/etablissements/${id}/registre/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "board", size: "board" })}
            >
              Exporter le registre
            </a>
            <a
              href="https://www.btry.fr/solution/"
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({
                variant: "boardClair",
                size: "board",
              })}
            >
              Prendre rendez-vous
            </a>
            {aide}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-7">
        {couverture && (
          <BandeauCouverture
            couverture={couverture}
            hrefEtablissement={`${base}/modifier`}
            hrefEquipements={`${base}/equipements`}
          />
        )}

        {registre && registre.parties.length > 0 && (
          <>
            <JaugeRegistre bilan={bilan} />

            {/* Les fiches, dans l'ordre du document — celui où une commission
                le feuillettera. Une ligne chacune : ce qu'elles demandent se
                lit dans la fiche, pas dans la liste. */}
            {registre.parties.map((partie) => (
              <PartieRegistre
                key={partie.id}
                numero={partie.id}
                titre={partie.titre}
              >
                {partie.sections.map((due) => (
                  <LigneRegistre
                    key={due.section.id}
                    titre={due.section.titre}
                    href={avecProvenance(
                      `${baseHref}/${due.section.id}`,
                      depuisCeRegistre,
                    )}
                    completude={completudes.get(due.section.id)!}
                  />
                ))}
              </PartieRegistre>
            ))}
          </>
        )}

        {/* Les rapports archivés — la pièce que l'on ouvre en premier lors
            d'un contrôle. Ils alimentent les fiches 3.1 et 3.2, mais ils se
            consultent et se filtrent ici, en un seul endroit. */}
        <section id="rapports-archives" className="carte-board px-7 py-6 sm:px-8">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
            <h2 className="board-titre m-0 text-[17px]">Rapports archivés</h2>
            <p className="m-0 text-[12px] text-[color:var(--board-slate-mid)]">
              {rapports.length} {rapports.length > 1 ? "rapports" : "rapport"}
              {(q || filtreDomaine) && " pour ces filtres"}
            </p>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2.5">
            <form action={baseHref} method="get" className="flex items-center gap-2">
              {filtreDomaine && (
                <input type="hidden" name="domaine" value={filtreDomaine} />
              )}
              <input
                type="search"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Rechercher un organisme, un libellé…"
                className="champ-board min-w-[16rem]"
                aria-label="Rechercher un rapport"
              />
              <Button type="submit" variant="boardClair" size="boardSm">
                Filtrer
              </Button>
            </form>

            <span
              aria-hidden
              className="mx-1 h-[18px] w-px flex-none bg-[color:rgba(13,18,36,.14)]"
            />

            <Link
              href={makeHref({ domaine: "" })}
              className={
                "pastille-board transition-colors " +
                (!filtreDomaine
                  ? "bg-[color:var(--board-ink)] text-white"
                  : "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
              }
            >
              Tous
            </Link>
            {DOMAINES_P1.map((d) => (
              <Link
                key={d}
                href={makeHref({ domaine: d })}
                className={
                  "pastille-board transition-colors " +
                  (filtreDomaine === d
                    ? "bg-[color:var(--board-ink)] text-white"
                    : "bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)]")
                }
              >
                {LABEL_DOMAINE[d]}
              </Link>
            ))}
          </div>

          {/* ~~« L'article L. 4711-1 impose de le tenir à disposition d'un
              contrôleur »~~ — corrigé le 2026-09-20. L. 4711-1 dit que ces
              documents « COMPORTENT des mentions obligatoires déterminées par
              voie réglementaire » : le verbe porte sur leur contenu, il
              n'impose ni tenue ni mise à disposition. La conservation est à
              D. 4711-3. Cette page AFFICHE le verbatim de L. 4711-1 deux cents
              lignes plus haut : la phrase se démentait elle-même.

              C'est mot pour mot la correction faite le même jour sur
              `equipements/actions.ts`, et cet écran avait été examiné dans la
              foulée puis déclaré propre — sur son badge `L. 4711-5`, qui
              l'est. Relevé par la contre-lecture : vérifier une surface, ce
              n'est pas vérifier une ligne.

              ET CE COMMENTAIRE-CI A FAILLI S'AFFICHER. Écrit d'abord en `//`
              dans les enfants JSX, il était rendu comme du TEXTE, sur la page
              qu'il prétendait corriger. `tsc` ne l'a pas vu ; eslint si
              (`react/jsx-no-comment-textnodes`). */}
          <div className="mt-5">
            {rapports.length === 0 ? (
              q || filtreDomaine ? (
                <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  Aucun rapport ne correspond à ces filtres — essayez de les
                  retirer.
                </p>
              ) : (
                <EmptyState
                  titre="Vos rapports de vérification se rangent ici"
                  pourquoi="Chaque fois qu'un organisme ou une personne qualifiée vérifie une installation — électricité, extincteurs, hotte —, il vous remet un rapport. L'article D. 4711-3 fait conserver, « sauf dispositions particulières », les documents des vérifications des cinq dernières années « et, en tout état de cause, ceux des deux derniers contrôles ou vérifications ». Le registre numérique vous évite la boîte d'archive."
                  quoiFaire="ouvrez une vérification dans votre calendrier, déposez le fichier (PDF, photo, DOCX) et indiquez le résultat. L'outil met automatiquement à jour la prochaine échéance."
                  cta="Ouvrir le calendrier"
                  ctaHref={`${base}/calendrier`}
                  ctaSecondary={{
                    libelle: "Prendre rendez-vous",
                    href: "https://www.btry.fr/solution/",
                  }}
                />
              )
            ) : (
              <ul className="m-0 flex list-none flex-col p-0">
                {rapports.map((r) => {
                  const dom = obligationParId(
                    r.verification.obligationId,
                  )?.domaine;
                  return (
                    <li
                      key={r.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-3 border-t border-[color:var(--board-slate-line)] py-3.5 first:border-t-0 first:pt-0"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="m-0 truncate text-[14px] font-semibold leading-[1.3] tracking-[-0.015em] text-[color:var(--board-ink)]">
                          {r.verification.libelleObligation}
                        </p>
                        <p className="m-0 mt-1 truncate text-[12.5px] text-[color:var(--board-slate-mid)]">
                          {formaterDateCourteFr(r.dateRapport)}
                          <span className="mx-2 text-[color:var(--board-slate)]">
                            ·
                          </span>
                          {libellePorteur(r.verification)}
                          {r.organismeVerif && (
                            <>
                              <span className="mx-2 text-[color:var(--board-slate)]">
                                ·
                              </span>
                              {r.organismeVerif}
                            </>
                          )}
                          {dom && (
                            <>
                              <span className="mx-2 text-[color:var(--board-slate)]">
                                ·
                              </span>
                              {LABEL_DOMAINE[dom]}
                            </>
                          )}
                          <span className="mx-2 text-[color:var(--board-slate)]">
                            ·
                          </span>
                          {formatTaille(r.fichierTaille)}
                        </p>
                        {r.commentaires && (
                          <p className="m-0 mt-1 text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                            {r.commentaires}
                          </p>
                        )}
                      </div>
                      <BadgeResultat resultat={r.resultat} />
                      <div className="flex flex-none flex-wrap items-center gap-2">
                        <a
                          href={`/api/rapports/${r.id}/fichier`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={buttonVariants({
                            variant: "boardClair",
                            size: "boardSm",
                          })}
                        >
                          Ouvrir
                        </a>
                        <Link
                          href={avecProvenance(
                            `${base}/verifications/${r.verificationId}`,
                            depuisCeRegistre,
                          )}
                          className={buttonVariants({
                            variant: "boardClair",
                            size: "boardSm",
                          })}
                        >
                          Vérification
                        </Link>
                        <SupprimerRapportButton id={r.id} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
