import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import {
  CarteFiche,
  ChampFiche,
  ChampsFiche,
  CorpsFiche,
  Cotation,
  EcranFiche,
  HeroFiche,
  PastilleRetard,
  type FaitFiche,
} from "@/components/ui-kit";
import { BadgeOrigine } from "@/components/actions/BadgeOrigine";
import { BadgeStatutAction } from "@/components/actions/BadgeStatutAction";
import { CloturerActionForm } from "@/components/actions/CloturerActionForm";
import { SupprimerActionButton } from "@/components/actions/SupprimerActionButton";
import { cloturerAction } from "@/lib/actions/plan";
import { getAction, origineDeLAction } from "@/lib/actions/queries";
import { LABEL_TYPE_ACTION } from "@/lib/actions/labels";
import { CRITICITE_ACTION_MAX } from "@/lib/actions/schema";
import { LABEL_RESULTAT } from "@/lib/rapports/schema";
import { classerDate, type RegistreLigne } from "@/lib/calendrier/etats";
import { formaterDateFr, formaterDateLongueFr } from "@/lib/dates";
import { estActionEnRetard } from "@/lib/dates/retard";
import { avecProvenance, lireProvenance } from "@/lib/navigation/provenance";
import { libellePorteur } from "@/lib/calendrier/labels";

export default async function ActionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; actionId: string }>;
  searchParams: Promise<{ de?: string }>;
}) {
  const { id, actionId } = await params;
  const { de } = await searchParams;
  const a = await getAction(actionId);
  if (!a || a.etablissementId !== id) notFound();

  // D'où l'on vient (calendrier, tableau de bord, une vérification…), et où
  // cette fiche vit de toute façon — le plan d'actions.
  const provenance = lireProvenance(de, id);
  const planActions = {
    href: `/etablissements/${id}/actions`,
    label: "Plan d'actions",
  };
  // Les liens que cette fiche pose s'annoncent eux-mêmes, sans réexpédier
  // la provenance reçue : la chaîne reste bornée à un saut.
  const depuisCetteFiche = `/etablissements/${id}/actions/${actionId}`;

  const origine = origineDeLAction(a);
  // La vérification d'origine : le rapport le plus récent (trié desc par la
  // requête) porte le constat ; à défaut, la date de réalisation, puis la
  // date prévue.
  const dernierRapport = a.verification?.rapports[0] ?? null;
  const dateConstat =
    dernierRapport?.dateRapport ??
    a.verification?.datePrevue ??
    null;
  const boundCloture = cloturerAction.bind(null, actionId);
  const estOuverte = a.statut === "ouverte" || a.statut === "en_cours";
  // Page serveur : l'horloge est lue une fois par requête. Deux `new Date()`
  // séparés par un `await` peuvent tomber de part et d'autre de minuit.
  const maintenant = new Date();
  const enRetard = estActionEnRetard(a, maintenant);

  // L'état porté par la tuile-date, dans le vocabulaire de la liste : une
  // action levée est « faite » quelle que soit son échéance, une action
  // sans date n'a pas de rendez-vous.
  const etat: RegistreLigne =
    a.statut === "levee"
      ? "faite"
      : !a.echeance
        ? "aPlanifier"
        : enRetard
          ? "enRetard"
          : classerDate(a.echeance, maintenant);

  const faits: FaitFiche[] = [
    {
      cle: "Échéance",
      valeur: a.echeance ? formaterDateLongueFr(a.echeance) : "Non datée",
      alerte: enRetard,
    },
    { cle: "Type de mesure", valeur: LABEL_TYPE_ACTION[a.type] },
  ];
  if (a.criticite !== null) {
    faits.push({
      cle: "Criticité",
      // L'échelle est nommée, jamais héritée : `Action.criticite` va de 1 à 5,
      // et non de 1 à 16 comme la criticité d'un risque du DUERP.
      valeur: <Cotation valeur={a.criticite} sur={CRITICITE_ACTION_MAX} />,
    });
  }
  faits.push({
    cle: "Responsable",
    valeur: a.responsable ?? (
      <span className="font-normal text-[color:var(--board-slate-soft)]">
        Non désigné
      </span>
    ),
  });

  return (
    <EcranFiche provenance={provenance} canonique={planActions}>
      <HeroFiche
        date={a.echeance}
        etat={etat}
        famille="travaux"
        surtitre="Correction · Plan d'actions"
        titre={a.libelle}
        faits={faits}
        pastilles={
          <>
            <BadgeStatutAction statut={a.statut} />
            {enRetard && a.echeance ? (
              <PastilleRetard echeance={a.echeance} maintenant={maintenant} />
            ) : null}
            <BadgeOrigine origine={origine} />
          </>
        }
        actions={
          <SupprimerActionButton
            id={a.id}
            redirectTo={(provenance ?? planActions).href}
          />
        }
      />

      <CorpsFiche
        principal={
          <>
            <CarteFiche titre="Ce qu'il y a à faire">
              {a.description ? (
                <p className="m-0 whitespace-pre-wrap text-[14.5px] leading-[1.6] text-[color:var(--board-ink)]">
                  {a.description}
                </p>
              ) : (
                <p className="m-0 text-[14px] text-[color:var(--board-slate-soft)]">
                  Aucune description n&apos;a été saisie pour cette action.
                </p>
              )}

              {/* Le rattachement vit dans la même carte que la consigne :
                  « d'où ça sort » et « ce qu'il faut faire » se lisent
                  ensemble, pas dans deux blocs séparés par une gouttière. */}
              {a.risque ? (
                <div className="mt-6 flex items-start gap-3.5 border-t border-[color:var(--board-slate-line)] pt-5">
                  <span
                    aria-hidden
                    className="grid size-[38px] flex-none place-items-center rounded-[14px] bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                  >
                    <ArrowUpRight className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                      Risque rattaché
                    </p>
                    <p className="m-0 mt-1.5 text-[14px] font-semibold leading-[1.35]">
                      {a.risque.libelle}
                    </p>
                    <p className="m-0 mt-1 text-[12.5px] text-[color:var(--board-slate-mid)]">
                      {a.risque.unite.nom}
                    </p>
                    <Link
                      href={`/duerp/${a.risque.unite.duerp.id}/risques/${a.risque.unite.id}/${a.risque.id}/mesures`}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
                    >
                      Ouvrir le risque dans le DUERP
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              ) : null}

              {a.verification ? (
                <div className="mt-6 flex items-start gap-3.5 border-t border-[color:var(--board-slate-line)] pt-5">
                  <span
                    aria-hidden
                    className="grid size-[38px] flex-none place-items-center rounded-[14px] bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"
                  >
                    <ArrowUpRight className="size-[18px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    {/* Ce renvoi regarde vers le passé : la vérification qui a
                        révélé l'écart, pas une échéance à venir. La date et le
                        résultat s'annoncent avant le clic, pour que le saut
                        vers une fiche datée de plusieurs mois ne surprenne pas. */}
                    <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                      {dateConstat
                        ? `Origine · écart constaté le ${formaterDateFr(dateConstat)}`
                        : "Origine · écart constaté lors d'une vérification"}
                    </p>
                    <p className="m-0 mt-1.5 text-[14px] font-semibold leading-[1.35]">
                      {a.verification.libelleObligation}
                    </p>
                    <p className="m-0 mt-1 text-[12.5px] text-[color:var(--board-slate-mid)]">
                      {/* Sans équipement, l'action naît d'une échéance
                          portée par l'établissement ou par un salarié
                          (ADR-022, ADR-023). */}
                      {libellePorteur(a.verification)}
                      {dernierRapport
                        ? ` · ${LABEL_RESULTAT[dernierRapport.resultat]}`
                        : null}
                    </p>
                    <Link
                      href={avecProvenance(
                        `/etablissements/${id}/verifications/${a.verification.id}`,
                        depuisCetteFiche,
                      )}
                      className="mt-2.5 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
                    >
                      {dateConstat
                        ? `Voir la vérification du ${formaterDateFr(dateConstat)}`
                        : "Voir la vérification d'origine"}
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              ) : null}
            </CarteFiche>

            {/* La clôture d'une action levée n'est plus un formulaire mais
                une preuve : elle reste sur la fiche, à demeure. */}
            {a.statut === "levee" ? (
              <CarteFiche titre="Clôture">
                <ChampsFiche>
                  <ChampFiche cle="Levée le">
                    {a.leveeLe ? formaterDateLongueFr(a.leveeLe) : "—"}
                  </ChampFiche>
                  {a.leveeCommentaire ? (
                    <ChampFiche cle="Justificatif">
                      <span className="whitespace-pre-wrap">
                        {a.leveeCommentaire}
                      </span>
                    </ChampFiche>
                  ) : null}
                </ChampsFiche>
              </CarteFiche>
            ) : null}
          </>
        }
        cote={
          estOuverte ? (
            <CarteFiche titre="Clôturer cette action">
              <p className="m-0 mb-4 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Décrivez ce qui a été fait et son résultat. Le justificatif
                reste attaché à la fiche&nbsp;: c&apos;est lui qu&apos;on
                présente en cas de contrôle.
              </p>
              <CloturerActionForm
                action={boundCloture}
                rapportsDisponibles={a.verification?.rapports.map((r) => ({
                  id: r.id,
                  label: `${formaterDateFr(r.dateRapport)} — ${
                    r.fichierNomOriginal
                  }`,
                }))}
              />
            </CarteFiche>
          ) : a.statut === "abandonnee" ? (
            <CarteFiche titre="État">
              <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                Cette action a été abandonnée. Elle reste au dossier&nbsp;: une
                mesure écartée fait partie de la traçabilité.
              </p>
            </CarteFiche>
          ) : null
        }
      />
    </EcranFiche>
  );
}
