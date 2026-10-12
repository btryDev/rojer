import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { LegalBadge } from "@/components/ui-kit";
import { SalarieCard } from "@/components/salaries/SalarieCard";
import { requireEtablissement } from "@/lib/auth/scope";
import { listerEquipe, libellesTitresDeclares } from "@/lib/salaries/queries";
import { cataloguerTitres } from "@/lib/salaries/catalogue";
import { texteInformation } from "@/lib/salaries/droits";
import { TexteInformation } from "@/components/salaries/TexteInformation";
import { CHAMP_ETAT, ENCRE_ETAT } from "@/lib/calendrier/etats";
import { FAITS_ACTIVITE } from "@/lib/etablissements/faits-activite";
import { chargerFaitsActivite } from "@/lib/etablissements/faits-activite-queries";

/**
 * L'annuaire de l'équipe — le troisième porteur d'échéance (ADR-023).
 *
 * Cet écran a une particularité que les deux autres annuaires n'ont pas, et
 * elle commande sa rédaction : **rien ici n'est déduit**. Le moteur sait qu'un
 * ascenseur déclaré appelle une vérification annuelle ; il ne sait pas qui,
 * dans l'effectif, opère au voisinage de pièces nues sous tension. Depuis
 * l'ADR-041, l'établissement déclare QUE des travailleurs le font (faits
 * d'activité, écran `equipe/risques`) ; qui, c'est le titre déclaré sur la
 * fiche de chacun. L'écran doit donc dire clairement que la couverture vient de
 * ce que l'employeur déclare, sans quoi une page vide se lirait « rien à faire ».
 */
export default async function EquipePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { etablissement } = await requireEtablissement(id);
  const now = new Date();
  const equipe = await listerEquipe(id, now);
  const titresDeclares = await libellesTitresDeclares(id);
  const catalogue = cataloguerTitres();
  const faits = await chargerFaitsActivite(id);
  // Les faits sans réponse, NOMMÉS : la passe Chrome du 2026-10-08 a vu le
  // bandeau compter juste et lister les cinq, réponses comprises.
  const NOM_COURT: Record<(typeof FAITS_ACTIVITE)[number]["champ"], string> = {
    manutentionManuelle: "manutention",
    travailSurEcran: "écran",
    operationsElectriques: "électricité",
    conduiteEngins: "engins",
    expositionCMR: "CMR",
  };
  const muets = faits ? FAITS_ACTIVITE.filter((f) => faits[f.champ] === null) : [];
  const sansReponse = muets.length;

  const enRetard = equipe
    .filter((s) => s.actif)
    .reduce((n, s) => n + s.titres.filter((t) => t.etat === "enRetard").length, 0);
  const actifs = equipe.filter((s) => s.actif).length;

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      <header className="border-b border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[var(--board-gutter)] py-[22px]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="min-w-0 flex-1">
            <Link
              href={`/etablissements/${id}`}
              className="board-eyebrow inline-flex items-center gap-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)] transition-colors hover:text-[color:var(--board-ink)]"
            >
              <ArrowLeft className="size-3" aria-hidden />
              {etablissement.raisonDisplay}
            </Link>
            <h1 className="board-titre m-0 mt-2.5 text-[clamp(22px,2.2vw,27px)]">
              Équipe
            </h1>
            <p className="m-0 mt-2 max-w-[68ch] text-[13.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
              Les personnes de votre effectif et les titres qu&apos;elles
              détiennent — habilitation, attestation, certificat. Un titre porte
              une échéance nominative : c&apos;est la personne qui est habilitée,
              pas le poste.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {enRetard > 0 && (
              <span
                className="inline-flex items-center gap-2 rounded-full px-4 py-[9px]"
                style={{
                  background: CHAMP_ETAT.enRetard,
                  color: ENCRE_ETAT.enRetard,
                }}
              >
                <span className="board-titre text-[20px] tabular-nums leading-none">
                  {enRetard}
                </span>
                <span className="board-eyebrow text-[9.5px] tracking-[0.12em]">
                  {enRetard > 1 ? "titres à renouveler" : "titre à renouveler"}
                </span>
              </span>
            )}
            <Link
              href={`/etablissements/${id}/equipe/nouveau`}
              className={buttonVariants({ variant: "board", size: "board" })}
            >
              <Plus className="size-3.5" aria-hidden />
              Ajouter une personne
            </Link>
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-7 px-[var(--board-gutter)] pt-6">
        {/* La porte d'entrée unique des faits d'activité (ADR-041) : tant
            qu'une question reste sans réponse, les formations qu'elle
            conditionne s'affichent « à confirmer ». */}
        <section className="carte-board flex flex-wrap items-center justify-between gap-4 px-7 py-5 sm:px-8">
          <div className="min-w-0 max-w-[64ch]">
            <p className="m-0 text-[14px] font-semibold leading-[1.4] text-[color:var(--board-ink)]">
              {sansReponse > 0
                ? "Évaluez les risques de vos salariés"
                : "Risques de vos salariés : répondu"}
            </p>
            <p className="m-0 mt-1 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              {sansReponse > 0
                ? `${sansReponse} question${sansReponse > 1 ? "s" : ""} sans réponse : ${muets.map((f) => NOM_COURT[f.champ]).join(", ")}. Elles décident des formations et du suivi dus à une partie de l'effectif.`
                : "Les formations et le suivi dus à une partie de l'effectif s'affichent sur la fiche de chaque personne."}
            </p>
          </div>
          <Link
            href={`/etablissements/${id}/equipe/risques`}
            className={buttonVariants({
              variant: sansReponse > 0 ? "board" : "boardClair",
              size: "boardSm",
            })}
          >
            {sansReponse > 0 ? "Évaluer les risques →" : "Revoir les réponses"}
          </Link>
        </section>

        {equipe.length === 0 ? (
          <section className="carte-board px-7 py-8 sm:px-8">
            <div className="flex max-w-[600px] flex-col gap-3">
              <h2 className="board-titre m-0 text-[22px]">
                Votre équipe n&apos;est pas encore renseignée
              </h2>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Commencez par les personnes qui détiennent un titre :
                l&apos;électricien habilité, le cariste, le titulaire du SST.
                Vous saurez quand leur titre expire, sans avoir à ouvrir un
                classeur.
              </p>
              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                Rojer ne devine pas qui fait quoi. Rien dans un intitulé de
                poste ne dit qu&apos;une personne travaille au voisinage de
                pièces sous tension — c&apos;est vous qui le savez, et
                c&apos;est vous qui déclarez ce qu&apos;elle détient.
              </p>
              <div className="mt-2">
                <Link
                  href={`/etablissements/${id}/equipe/nouveau`}
                  className={buttonVariants({ variant: "board", size: "board" })}
                >
                  <Plus className="size-3.5" aria-hidden />
                  Ajouter une personne
                </Link>
              </div>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {equipe.map((s) => (
              <SalarieCard key={s.id} etablissementId={id} salarie={s} />
            ))}
          </div>
        )}

        {/* Ce que l'écran ne couvre pas, dit par l'écran lui-même. Taire
            l'écart tromperait l'utilisateur sur sa propre couverture.

            ⚠ Ce bloc a menti pendant une journée, et la leçon vaut d'être
            gardée : il énumérait en dur « SST, CACES, autorisation de conduite,
            formations à la sécurité » comme non encodés, alors que le lot 7
            venait d'en encoder trois — et la liste réelle du catalogue
            s'affichait DEUX LIGNES PLUS HAUT, dérivée du référentiel. Un
            paragraphe écrit à la main sous une liste qui se calcule vieillit
            tout seul, et il vieillit en affirmant le contraire de ce qu'on lit
            juste au-dessus. Ce qui reste ci-dessous est donc formulé sans
            énumération figée. */}
        <section className="carte-board px-7 py-6 sm:px-8">
          <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
            Ce que couvre cet écran
          </p>
          <h2 className="board-titre m-0 mt-2 text-[22px]">
            {catalogue.length === 1
              ? "Un seul titre au catalogue, pour l'instant"
              : `${catalogue.length} titres au catalogue`}
          </h2>
          <p className="m-0 mt-3 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Rojer ne propose que les titres dont il a lu le texte fondateur à
            la source. Aujourd&apos;hui :{" "}
            {catalogue.map((o) => o.libelle).join(", ")}.
          </p>
          <p className="m-0 mt-3 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Cette liste n&apos;est pas tout ce qui existe en droit. D&apos;autres
            titres et suivis nominatifs peuvent vous concerner sans figurer ici,
            parce que le texte qui les porte n&apos;a pas encore été dépouillé.{" "}
            <strong>Continuez à suivre par vos moyens habituels ce que vous ne
            retrouvez pas dans cette liste.</strong>
          </p>
          <p className="m-0 mt-3 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Un cas mérite d&apos;être dit, parce qu&apos;on le cherche souvent
            ici : le <strong>CACES</strong>{" "}
            n&apos;y figure pas et n&apos;y
            figurera pas. Il ne relève pas du Code du travail — c&apos;est un
            dispositif conventionnel de l&apos;assurance maladie. Ce que le Code
            impose, lui, est dans la liste : une formation adéquate à la
            conduite et une autorisation de conduite délivrée par
            l&apos;employeur.
          </p>
          <p className="m-0 mt-3 max-w-[68ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            Un titre est nominatif : le Code fait délivrer l&apos;habilitation à
            un travailleur désigné, pas à un poste. Un suivi par fonction
            produirait un compteur — « deux caristes à habiliter » — et ne
            prouverait rien devant un contrôle.
          </p>
          <div className="mt-4">
            <LegalBadge
              charte="board"
              reference="Art. R. 4544-10 CT"
              href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000051500368"
            />
          </div>
        </section>

        {/* L'information des personnes (art. 13 RGPD). Elle est due, et elle
            incombe à l'employeur — l'outil ne peut pas informer à sa place.
            La carte n'apparaît que s'il y a quelqu'un à informer : avant, elle
            réclamerait un geste sans objet. */}
        {equipe.length > 0 && (
          <section className="carte-board px-7 py-6 sm:px-8">
            <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
              Votre obligation envers eux
            </p>
            <h2 className="board-titre m-0 mt-2 text-[22px]">
              Informer les personnes suivies
            </h2>
            <div className="mt-3">
              <TexteInformation
                texte={texteInformation({
                  raisonSociale: etablissement.raisonDisplay,
                  // Les titres RÉELLEMENT déclarés ici, jamais le
                  // catalogue : un document d'information qui décrit un
                  // traitement qui n'a pas lieu est faux, et il est remis à
                  // des personnes.
                  titresSuivis: titresDeclares,
                })}
              />
            </div>
          </section>
        )}

        {actifs > 0 && (
          <p className="m-0 px-1 text-[12px] text-[color:var(--board-slate-soft)]">
            {actifs} personne{actifs > 1 ? "s" : ""}{" "}
            dans l&apos;effectif
            {equipe.length > actifs &&
              ` · ${equipe.length - actifs} sortie${equipe.length - actifs > 1 ? "s" : ""}, conservée${equipe.length - actifs > 1 ? "s" : ""} pour la preuve`}
          </p>
        )}
      </div>
    </main>
  );
}
