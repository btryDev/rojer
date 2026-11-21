import Link from "next/link";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { lireProvenance } from "@/lib/navigation/provenance";
import { LegalBadge, PastilleFiche } from "@/components/ui-kit";
import { FilRetour } from "@/components/ui-kit/FilRetour";
import { OngletsPage } from "@/components/ui-kit/OngletsPage";
import { ChevronRepli } from "@/components/ui/repli";
import { SignaturesSansPartie } from "@/components/signatures/SignaturesParties";
import { repartirSignatures } from "@/lib/signatures/parties";
import { InformationInspectionForm } from "@/components/plan-prevention/InformationInspectionForm";
import {
  CorrectionEnCours,
  PropositionEnAttente,
  RappelCorrection,
  RappelProposition,
} from "@/components/plan-prevention/ContreSignatureFiche";
import { PanneauSignatures, type PartieVue } from "@/components/plan-prevention/PanneauSignatures";
import { HistoriquePlan } from "@/components/plan-prevention/HistoriquePlan";
import { AnnonceFiche } from "@/components/plan-prevention/AnnonceFiche";
import { statutPlanSignable } from "@/lib/signatures/etat-signable";
import { INSPECTION_SUR_PLAN_SIGNE } from "@/lib/signatures/verrou-contenu";
import { LIBELLE_METHODE_COURT } from "@/lib/signatures/methode";
import { BoutonCloturer, BoutonSupprimerPlan } from "@/components/plan-prevention/PlanActionsButtons";
import { PILULE_FICHE } from "@/components/plan-prevention/classes-fiche";
import { getPlanPrevention } from "@/lib/plan-prevention/queries";
import { etatAffichePlan } from "@/lib/plan-prevention/etats";
import {
  aUnLienOuUneSignature,
  etatDeLaPartie,
  ceQuiAttendLeDirigeant,
  correctionEnCours,
  historiqueDuPlan,
  motifLienPourLaFiche,
  type EtatPartie,
} from "@/lib/plan-prevention/fiche-signatures";
import { diagnostiquerPlan } from "@/lib/plan-prevention/schema";
import { complementsParPlace, precisionsLigne } from "@/lib/plan-prevention/complements";
import {
  rubriquesRenseignees,
  TEXTE_R4512_8,
  URL_R4512_8,
  rubriquesManquantes,
  texteRubrique,
} from "@/lib/plan-prevention/contenu-r4512-8";
import { HeuresReviseesForm } from "@/components/plan-prevention/HeuresReviseesForm";
import { ArticleEnClair } from "@/components/plan-prevention/ArticleEnClair";
import {
  CHAPITRE_R4512,
  CONSTAT_HEURES_REVISEES,
  R4512_7_1_EN_COURS,
  ligneHeuresRevisees,
  CONSTAT_R4512_1,
  CONSTAT_R4512_9,
  CONSTAT_R4512_11,
  CONSTAT_R4512_12,
  EN_CLAIR_R4463_8,
  EN_CLAIR_R4512_1,
  EN_CLAIR_R4512_9,
  EN_CLAIR_R4512_11,
  EN_CLAIR_R4512_12,
  EN_CLAIR_R4512_12_SI_ECRIT,
  EN_CLAIR_R4512_2_MOMENT,
  EN_CLAIR_R4512_7_EN_COURS,
  EXTRAIT_R4512_12,
  FAIT_DUREE_NON_RENSEIGNEE,
  R4463_8,
  R4512_1,
  R4512_2,
  R4512_9,
  R4512_11,
  SENS_R4512_7,
  URL_R4463_8,
  URL_R4512_1,
  URL_R4512_2,
  URL_R4512_7,
  URL_R4512_9,
  URL_R4512_11,
  URL_R4512_12,
  citeR4512_12,
} from "@/lib/plan-prevention/annonces-plan";
import {
  cleJourCivil,
  composantesCiviles,
  FUSEAU_REFERENCE,
  formaterDateFr,
  formaterDateLongueFr,
  formaterJourMoisFr,
} from "@/lib/dates";

/**
 * La fiche d'un plan de prévention.
 *
 * [2026-11-21, maquette V3 validée par la propriétaire] L'en-tête — tuile du
 * jour, référence, nature des travaux, bande de faits, UNE pastille d'état —,
 * puis deux onglets, choisis par l'adresse (`?onglet=suivi`) et rendus au
 * serveur :
 * - « Plan de prévention » : le plan d'un seul tenant, une carte, des
 *   sections séparées d'un filet ; chaque rubrique de `R. 4512-8` remplie est
 *   une section sous son titre ; les vides se disent en une ligne tant que le
 *   plan n'est pas figé ; les blocs réglementaires d'avant restent tous, en
 *   bas, repliés ;
 * - « Suivi » : l'action requise (la proposition, la correction en cours, ou
 *   la signature), les signatures, puis ce qui s'est passé.
 * `?openSign=1` ouvre l'onglet « Suivi », qui porte la fenêtre de signature.
 *
 * ~~(2026-11-19, lots 3 et 4, maquette V2) l'en-tête, la barre d'actions
 * (historique, PDF, clôturer, supprimer), le bandeau de la proposition, le
 * panneau Signatures, puis le contenu du plan carte par carte~~.
 */

type OngletFiche = "plan" | "suivi";

const FMT_JOUR = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU_REFERENCE, day: "2-digit" });
const FMT_MOIS = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU_REFERENCE, month: "short" });

/** « 8 h », « 8 h 30 » */
function heureCourte(d: Date): string {
  const { heure, minute } = composantesCiviles(d);
  return minute === 0 ? `${heure} h` : `${heure} h ${String(minute).padStart(2, "0")}`;
}

function numero(n: number): string {
  return `PP-${String(n).padStart(3, "0")}`;
}

function vueDeLaPartie(e: EtatPartie): PartieVue {
  if (e.etat === "rien") return { etat: "rien" };
  if (e.etat === "signee") {
    return {
      etat: "signee",
      nom: e.signature.signataireNom,
      quand: e.signature.horodatageIso,
      methode: LIBELLE_METHODE_COURT[e.signature.methode],
      signatureId: e.signature.id,
    };
  }
  return {
    etat: e.etat,
    lienId: e.lien.id,
    nom: e.lien.nomDestinataire,
    email: e.lien.emailDestinataire,
    envoyeLe: e.lien.createdAt,
    expireLe: e.lien.expireLe,
    ouvert: e.etat === "lien_envoye" ? e.ouvert : false,
    motif: e.etat === "lien_revoque" ? motifLienPourLaFiche(e.lien.revoqueMotif) : null,
  };
}

const DISCRET = "text-[color:var(--board-slate-mid)]";

/** Une section du plan, séparée de la précédente par un filet (maquette V3). */
function Section({ titre, children }: { titre?: string; children: ReactNode }) {
  return (
    <section className="border-t border-[color:var(--board-slate-pale)] py-[26px] first:border-t-0">
      {titre && <h2 className="board-titre m-0 mb-3.5 text-[22px]">{titre}</h2>}
      {children}
    </section>
  );
}

/** Les faits d'une section : la clé à gauche, la valeur à côté (une colonne sur téléphone). */
function Faits({ children }: { children: ReactNode }) {
  return <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-2.5 md:grid-cols-[220px_minmax(0,1fr)]">{children}</dl>;
}

function Fait({ cle, children }: { cle: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-[14px] text-[color:var(--board-slate-mid)]">{cle}</dt>
      <dd className="m-0 mb-1.5 whitespace-pre-wrap text-[14.5px] leading-[1.55] md:mb-0">{children}</dd>
    </>
  );
}

/** Un bloc réglementaire, dans le repli du bas. */
function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <div className="border-t border-[color:var(--board-slate-pale)] pt-5 first:border-t-0 first:pt-0">
      <h3 className="m-0 mb-2.5 font-display text-[17px] font-semibold tracking-[-0.01em]">{titre}</h3>
      {children}
    </div>
  );
}

export default async function PlanPreventionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; planId: string }>;
  searchParams: Promise<{ de?: string; openSign?: string; onglet?: string }>;
}) {
  const { id, planId } = await params;
  const { de, openSign, onglet: ongletDemande } = await searchParams;
  const provenance = lireProvenance(de, id);
  const registre = {
    href: `/etablissements/${id}/plan-prevention`,
    label: "Plans de prévention",
  };
  // `?openSign=1` ouvre la fenêtre de signature, qui vit dans « Suivi ».
  const onglet: OngletFiche = ongletDemande === "suivi" || openSign === "1" ? "suivi" : "plan";

  const plan = await getPlanPrevention(id, planId);
  if (!plan) notFound();

  // Le plan entier, révision en cours de chantier comprise : le diagnostic lit
  // les champs dont il a besoin (`diagnostiquerPlan`), comme le ZIP.
  const diag = diagnostiquerPlan(plan);

  // Les compléments repris de RiskBoard : horaires avec la période, CSE avec
  // l'inspection, le reste dans sa section.
  const complements = complementsParPlace(plan);

  // Clos ou annulé : aucune demande de signature ne part plus d'ici. Le
  // serveur la refuserait de toute façon (`etat-signable.ts`).
  const planSignable = statutPlanSignable(plan.statut);
  // Figé (signé, clos ou annulé) : le plan ne se complète plus ; les
  // rubriques vides ne se signalent plus (décision de la propriétaire,
  // 2026-11-21). Remplies, elles s'affichent toujours, chacune sa section.
  const fige = !planSignable || plan.signatures.length > 0;
  const rubriquesRemplies = rubriquesRenseignees(plan);
  const manquantes = fige ? [] : rubriquesManquantes(plan);
  // La partie est un fait enregistré, pas une déduction de l'adresse
  // (`repartirSignatures`, 2026-10-12).
  const signatures = repartirSignatures("plan_prevention", plan.signatures);
  const signatureEU = signatures.parPartie.entreprise_utilisatrice;
  const signatureEF = signatures.parPartie.entreprise_exterieure;
  // ADR-061 : une proposition de l'entreprise extérieure attend une décision
  // — aucune signature ne se recueille avant.
  const enAttente = plan.propositionEnAttente;
  const liens = plan.liens ?? [];
  const propositions = plan.propositions ?? [];

  const maintenant = new Date();
  const eu = vueDeLaPartie(etatDeLaPartie("entreprise_utilisatrice", signatureEU ?? null, liens, maintenant));
  const ee = vueDeLaPartie(etatDeLaPartie("entreprise_exterieure", signatureEF ?? null, liens, maintenant));
  // UNE pastille d'état (maquette V3) : la proposition qui attend l'emporte
  // sur le statut, qu'elle suspend.
  const pastille = enAttente
    ? { ton: "proche" as const, mot: "Modification proposée" }
    : etatAffichePlan(plan.statut, aUnLienOuUneSignature(liens, plan.signatures.length));
  // « Corriger » (lot 4) : appliquée, la correction court jusqu'à la
  // signature du dirigeant.
  const correction = correctionEnCours({
    planSignable,
    propositionEnAttente: Boolean(enAttente),
    euSignee: Boolean(signatureEU),
    propositions,
  });
  // Ce qui attend le dirigeant : UN calcul, pour la pastille de « Suivi » et
  // les cartes d'action du panneau (`ceQuiAttendLeDirigeant`).
  const attente = ceQuiAttendLeDirigeant({
    planSignable,
    lectureSeule: plan.lectureSeule ?? false,
    propositionEnAttente: Boolean(enAttente),
    correctionEnCours: Boolean(correction),
    eu: eu.etat,
    ee: ee.etat,
  });
  const lienAuteur = enAttente ? liens.find((l) => l.id === enAttente.accessTokenId) : undefined;
  const reference = numero(plan.numero);
  const fiche = `/etablissements/${id}/plan-prevention/${plan.id}`;
  const modifier = `${fiche}/modifier`;
  const objet = plan.naturesTravaux.replace(/\s+/g, " ").trim();

  const adresseOnglet = (o: OngletFiche) => {
    const q = new URLSearchParams();
    if (de) q.set("de", de);
    if (o === "suivi") q.set("onglet", "suivi");
    const s = q.toString();
    return s ? `${fiche}?${s}` : fiche;
  };
  const suivi = adresseOnglet("suivi");

  const memeJour = cleJourCivil(plan.dateDebut) === cleJourCivil(plan.dateFin);
  const bande: { cle: string; valeur: string }[] = [
    { cle: "Entreprise extérieure", valeur: plan.entrepriseExterieureRaison },
    {
      cle: "Date",
      valeur: memeJour
        ? formaterJourMoisFr(plan.dateDebut)
        : `${formaterJourMoisFr(plan.dateDebut)} → ${formaterJourMoisFr(plan.dateFin)}`,
    },
    // Les horaires saisis l'emportent ; sinon ceux que les dates portent.
    {
      cle: "Horaires",
      valeur: complements.horaires?.texte ?? `${heureCourte(plan.dateDebut)} – ${heureCourte(plan.dateFin)}`,
    },
    { cle: "Lieu", valeur: plan.lieux },
    {
      cle: "Intervenants",
      valeur: `${plan.efEffectifIntervenant} personne${plan.efEffectifIntervenant > 1 ? "s" : ""}`,
    },
  ];

  const periode = memeJour
    ? `Le ${formaterDateLongueFr(plan.dateDebut)}, de ${heureCourte(plan.dateDebut)} à ${heureCourte(plan.dateFin)}`
    : `Du ${formaterDateLongueFr(plan.dateDebut)} à ${heureCourte(plan.dateDebut)} au ${formaterDateLongueFr(plan.dateFin)} à ${heureCourte(plan.dateFin)}`;
  const duree = [
    plan.dureeHeuresEstimee ? `${plan.dureeHeuresEstimee} h` : "Non renseignée",
    diag.seuil400 ? "seuil des 400 h franchi" : null,
    plan.travauxDangereux ? "travaux déclarés dangereux" : "travaux non déclarés dangereux",
  ]
    .filter(Boolean)
    .join(" · ");
  const inspectionAInformer = diag.ecritObligatoire && !plan.inspectionTravailInformeeLe;

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      {/* L'EN-TÊTE (maquette V3) : centré, sur la trame de points. */}
      <header className="entete-trame">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center gap-3.5 px-4 pb-7 pt-8 text-center md:px-6 md:pt-11">
          <FilRetour provenance={provenance} canonique={registre} className="self-start" />
          <span
            className="flex size-16 flex-none flex-col items-center justify-center rounded-[16px] bg-[color:var(--board-ink)] text-white"
            aria-hidden
          >
            <span className="font-display text-[26px] font-bold leading-none tabular-nums">
              {FMT_JOUR.format(plan.dateDebut)}
            </span>
            <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em]">
              {FMT_MOIS.format(plan.dateDebut)}
            </span>
          </span>
          <div className="flex w-full min-w-0 flex-col items-center gap-1">
            <p className="board-eyebrow m-0 text-[11px] tracking-[0.14em] text-[color:var(--board-slate-soft)]">
              Plan de prévention {reference}
              <span className="sr-only"> · début le {formaterDateLongueFr(plan.dateDebut)}</span>
            </p>
            <h1
              title={objet}
              className="board-titre m-0 max-w-full truncate text-[34px] leading-[1.05] md:text-[48px]"
            >
              {objet}
            </h1>
          </div>
          <dl className="m-0 mt-2 flex max-w-full flex-wrap justify-center rounded-[22px] border border-[color:var(--board-slate-line)] bg-white/80">
            {bande.map((b, i) => (
              <div key={b.cle} className="flex">
                {i > 0 && (
                  <span aria-hidden className="my-3 hidden w-px self-stretch bg-[color:var(--board-slate-line)] md:block" />
                )}
                <div className="flex min-w-[110px] max-w-[280px] flex-col items-center gap-1 px-6 py-3.5">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-[color:var(--board-slate-soft)]">
                    {b.cle}
                  </dt>
                  <dd className="m-0 max-w-full truncate font-display text-[17px] font-semibold tracking-[-0.01em] md:text-[19px]" title={b.valeur}>
                    {b.valeur}
                  </dd>
                </div>
              </div>
            ))}
          </dl>
          <PastilleFiche ton={pastille.ton}>{pastille.mot}</PastilleFiche>
          <div className="mt-2.5">
            <OngletsPage
              libelle={`Plan de prévention ${reference}`}
              onglets={[
                { href: adresseOnglet("plan"), label: "Plan de prévention", actif: onglet === "plan" },
                {
                  href: suivi,
                  label: "Suivi",
                  actif: onglet === "suivi",
                  alerte: attente ? 1 : 0,
                  libelleAlerte: "une action vous attend",
                  tonAlerte: "proche",
                },
              ]}
            />
          </div>
        </div>
      </header>

      <div className="px-[var(--board-gutter)]">
        <div className="mx-auto flex w-full max-w-[980px] flex-col gap-[18px] pt-[22px]">
          <AnnonceFiche>
            {onglet === "suivi" ? (
              <div className="flex flex-col gap-[18px]">
                {/* Les cartes d'action lisent `attente`, comme la pastille : rien
                    en lecture seule (2026-11-21) — l'état reste dit par la
                    pastille d'en-tête et par l'historique. */}
                {attente === "proposition" && enAttente && (
                  <PropositionEnAttente
                    proposition={enAttente}
                    plan={plan}
                    auteur={lienAuteur?.nomDestinataire ?? lienAuteur?.emailDestinataire ?? null}
                  />
                )}
                {attente === "correction" && (
                  <CorrectionEnCours
                    raisonEE={plan.entrepriseExterieureRaison}
                    modifierHref={modifier}
                    signerHref={`${suivi}&openSign=1`}
                  />
                )}

                <PanneauSignatures
                  etablissementId={id}
                  planId={plan.id}
                  reference={reference}
                  objet={objet}
                  raisonEU={plan.raisonEU ?? "l'entreprise utilisatrice"}
                  raisonEE={plan.entrepriseExterieureRaison}
                  euChefNom={plan.euChefNom}
                  efChefNom={plan.efChefNom}
                  efChefEmail={plan.efChefEmail}
                  vous={plan.vous ?? { nom: "", email: "" }}
                  eu={eu}
                  ee={ee}
                  planSignable={planSignable}
                  propositionEnAttente={Boolean(enAttente)}
                  attente={attente}
                  ouvrirSigner={openSign === "1"}
                />

                <SignaturesSansPartie signatures={signatures.sansPartie} />

                <HistoriquePlan
                  etablissementId={id}
                  evenements={historiqueDuPlan({
                    creeLe: plan.createdAt,
                    raisonEE: plan.entrepriseExterieureRaison,
                    liens,
                    signatures: [...plan.signatures, ...(plan.signaturesRevoquees ?? [])],
                    propositions,
                    maintenant,
                  })}
                />
              </div>
            ) : (
              <div className="flex flex-col gap-[18px]">
                {attente === "proposition" && enAttente && <RappelProposition proposition={enAttente} plan={plan} suiviHref={suivi} />}
                {attente === "correction" && <RappelCorrection raisonEE={plan.entrepriseExterieureRaison} suiviHref={suivi} />}

                {/* Supprimer reste avec les autres gestes du plan. */}
                <div className="flex flex-wrap justify-end gap-2.5">
                  {planSignable && (
                    <Link data-ecriture href={modifier} className={PILULE_FICHE}>
                      Modifier
                    </Link>
                  )}
                  <a href={`/api/etablissements/${id}/plan-prevention/${plan.id}/pdf`} className={PILULE_FICHE}>
                    Télécharger le PDF
                  </a>
                  {(plan.statut === "valide" || plan.statut === "attente_signatures") && (
                    <BoutonCloturer planId={plan.id} entete />
                  )}
                  <BoutonSupprimerPlan planId={plan.id} entete />
                </div>

                {/* LE PLAN, D'UN SEUL TENANT (maquette V3). */}
                <article className="carte-board px-6 pb-4 pt-1 md:px-10">
                  <Section titre="Les parties">
                    <Faits>
                      <Fait cle="Entreprise utilisatrice">
                        {plan.raisonEU ? `${plan.raisonEU} — ` : ""}
                        {plan.euChefNom}
                        {plan.euChefFonction ? `, ${plan.euChefFonction}` : ""}
                        {plan.euChefTelephone ? ` · ${plan.euChefTelephone}` : ""}
                      </Fait>
                      <Fait cle="Entreprise extérieure">
                        {plan.entrepriseExterieureRaison}
                        {plan.entrepriseExterieureSiret ? ` · SIRET ${plan.entrepriseExterieureSiret}` : ""} —{" "}
                        {plan.efChefNom} · {plan.efChefEmail}
                        {plan.efChefTelephone ? ` · ${plan.efChefTelephone}` : ""}
                        <br />
                        <span className={DISCRET}>
                          {plan.entrepriseExterieureAdresse ? `${plan.entrepriseExterieureAdresse} · ` : ""}
                          {plan.efEffectifIntervenant} intervenant{plan.efEffectifIntervenant > 1 ? "s" : ""}
                        </span>
                      </Fait>
                    </Faits>
                  </Section>

                  <Section titre="Les travaux">
                    <Faits>
                      <Fait cle="Nature">{plan.naturesTravaux}</Fait>
                      <Fait cle="Période">{periode}</Fait>
                      {complements.horaires && <Fait cle={complements.horaires.libelle}>{complements.horaires.texte}</Fait>}
                      <Fait cle="Lieux">{plan.lieux}</Fait>
                      <Fait cle="Durée estimée">{duree}</Fait>
                      {diag.ecritObligatoire && <Fait cle="Plan écrit">Obligatoire</Fait>}
                    </Faits>
                  </Section>

                  <Section titre="Inspection commune">
                    {plan.inspectionDate ? (
                      <Faits>
                        <Fait cle="Date">{formaterDateLongueFr(plan.inspectionDate)}</Fait>
                        {plan.inspectionParticipants && <Fait cle="Participants">{plan.inspectionParticipants}</Fait>}
                        {complements.cse && <Fait cle={complements.cse.libelle}>{complements.cse.texte}</Fait>}
                      </Faits>
                    ) : (
                      // Le moment de R. 4512-2, pas celui de R. 4512-6 (C40) ;
                      // le texte sous le livre.
                      <>
                        <p className="m-0 text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                          Aucune date d&apos;inspection commune enregistrée. {EN_CLAIR_R4512_2_MOMENT}
                          {/* Signé, le plan ne la prend plus (B5) : la fiche dit la
                              même issue que l'écran « Modifier ». */}
                          {planSignable && plan.signatures.length > 0 && <> {INSPECTION_SUR_PLAN_SIGNE}</>}
                        </p>
                        <LegalBadge className="mt-2" reference="Art. R. 4512-2 CT" href={URL_R4512_2} extrait={R4512_2} />
                        {complements.cse && (
                          <div className="mt-3.5">
                            <Faits>
                              <Fait cle={complements.cse.libelle}>{complements.cse.texte}</Fait>
                            </Faits>
                          </div>
                        )}
                      </>
                    )}
                  </Section>

                  <Section titre="Risques d'interférence et mesures">
                    {plan.lignes.length === 0 ? (
                      <p className="m-0 text-[14px] text-[color:var(--board-slate-mid)]">
                        Aucun risque d&apos;interférence n&apos;est encore écrit dans ce plan.
                      </p>
                    ) : (
                      <div className="text-[14px]">
                        {/* Un tableau sur écran large, une carte par risque
                            sur téléphone : les intitulés de colonne y
                            passent dans chaque ligne. */}
                        <div
                          aria-hidden
                          className="hidden border-b border-[color:var(--board-slate-line)] pb-2.5 font-medium md:grid md:grid-cols-[36%_1fr_1fr] md:gap-3"
                        >
                          <span>Risque</span>
                          <span>Votre mesure</span>
                          <span>Sa mesure</span>
                        </div>
                        <ol className="m-0 list-none p-0">
                          {plan.lignes.map((l, i) => (
                            <li
                              key={l.id}
                              className="grid grid-cols-1 gap-1.5 border-b border-[color:var(--board-slate-pale)] py-3 last:border-b-0 md:grid-cols-[36%_1fr_1fr] md:gap-3"
                            >
                              <div>
                                <p className="m-0 whitespace-pre-wrap font-semibold">
                                  {i + 1}. {l.risque}
                                </p>
                                {/* Famille, lieu, fréquence (2026-11-21) :
                                    seulement ce qui est rempli. */}
                                {precisionsLigne(l).map((p) => (
                                  <p key={p} className="m-0 mt-0.5 text-[13px] text-[color:var(--board-slate-mid)]">
                                    {p}
                                  </p>
                                ))}
                              </div>
                              <p className="m-0 whitespace-pre-wrap">
                                <span className="text-[color:var(--board-slate-mid)] md:sr-only">Votre mesure : </span>
                                {l.mesureEntrepriseUtilisatrice || (
                                  <span className="text-[color:var(--board-slate-soft)]">À compléter</span>
                                )}
                              </p>
                              <p className="m-0 whitespace-pre-wrap">
                                <span className="text-[color:var(--board-slate-mid)] md:sr-only">Sa mesure : </span>
                                {l.mesureEntrepriseExterieure || (
                                  <span className="text-[color:var(--board-slate-soft)]">À compléter</span>
                                )}
                              </p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </Section>

                  {/* LES RUBRIQUES DE R. 4512-8 REMPLIES, chacune sa section
                      sous son titre (2026-11-21) : plus de catégorie
                      « Contenu minimal ». */}
                  {rubriquesRemplies.map((r) => (
                    <Section key={r.numero} titre={r.titre}>
                      {r.numero === 1 ? (
                        <ul className="m-0 flex list-none flex-col gap-3 p-0">
                          {plan.phasesDangereuses.map((f) => (
                            <li key={f.id}>
                              <p className="m-0 text-[14.5px] font-semibold leading-[1.4]">{f.phase}</p>
                              <p className="m-0 mt-1 whitespace-pre-wrap text-[14px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                                {f.moyensPrevention || (
                                  <span className="text-[color:var(--board-slate-soft)]">Moyens de prévention à compléter</span>
                                )}
                              </p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="m-0 whitespace-pre-wrap text-[14.5px] leading-[1.6]">{texteRubrique(plan, r.numero)}</p>
                      )}
                    </Section>
                  ))}

                  {/* Non figé : les rubriques vides en une ligne, sans titre ni
                      décompte. Rien ne bloque. */}
                  {manquantes.length > 0 && (
                    <Section>
                      <p className="m-0 text-[14px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                        À compléter : {manquantes.map((r) => r.titre).join(" ; ")}.{" "}
                        {planSignable && (
                          <Link
                            data-ecriture
                            href={modifier}
                            className="text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline"
                          >
                            Compléter
                          </Link>
                        )}
                      </p>
                    </Section>
                  )}

                  {/* Repris de RiskBoard (2026-11-21), facultatifs : la section
                      n'existe que si l'un d'eux est rempli. Horaires et CSE
                      sont dits plus haut, à côté de ce qu'ils précisent. */}
                  {complements.autres.length > 0 && (
                    <Section titre="Compléments">
                      <Faits>
                        {complements.autres.map((x) => (
                          <Fait key={x.cle} cle={x.libelle}>
                            {x.texte}
                          </Fait>
                        ))}
                      </Faits>
                    </Section>
                  )}

                  {/* LE SUIVI RÉGLEMENTAIRE, en bas et replié (maquette V3) :
                      rien n'en est retiré. */}
                  <Section>
                    <details className="group">
                      <summary className="flex min-h-6 cursor-pointer list-none flex-wrap items-center gap-2 text-[14.5px] font-semibold text-[color:var(--board-ink)] [&::-webkit-details-marker]:hidden">
                        <ChevronRepli />
                        Textes et suivi réglementaire
                        <span className="text-[13px] font-normal text-[color:var(--board-slate-mid)]">
                          · R. 4512-6 à R. 4512-12, heures prévisibles, autres articles
                          {inspectionAInformer ? " · inspection du travail à informer" : ""}
                        </span>
                      </summary>
                      <div className="mt-5 flex flex-col gap-5">
                        {diag.ecritObligatoire && (
                          <Bloc titre="Pourquoi l'écrit est obligatoire">
                            <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.6]">
                              {diag.raisons.map((raison) => (
                                <li key={raison}>{raison}</li>
                              ))}
                            </ul>
                            <LegalBadge className="mt-3" reference="Art. R. 4512-7 CT" href={URL_R4512_7}>
                              {SENS_R4512_7}
                            </LegalBadge>
                          </Bloc>
                        )}
                        {/* R. 4512-12, cité quand l'écrit est obligatoire ET
                            quand la durée manque — l'incertitude ne réduit pas
                            la couverture. */}
                        {citeR4512_12(diag.ecrit) && (
                          <Bloc titre="Inspection du travail">
                            {diag.ecrit === "indetermine" && (
                              <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                                {FAIT_DUREE_NON_RENSEIGNEE}
                              </p>
                            )}
                            <p className={`m-0 text-[14px] leading-[1.6] ${diag.ecrit === "indetermine" ? "mt-2" : ""}`}>
                              {diag.ecrit === "indetermine" ? EN_CLAIR_R4512_12_SI_ECRIT : EN_CLAIR_R4512_12}
                            </p>
                            <p className="m-0 mt-3 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                              {CONSTAT_R4512_12}
                            </p>
                            <LegalBadge
                              className="mt-3"
                              reference="Art. R. 4512-12 CT"
                              href={URL_R4512_12}
                              extrait={EXTRAIT_R4512_12}
                            />
                            {/* C45 : la trace déclarée du 2°. */}
                            <InformationInspectionForm
                              planId={plan.id}
                              informeeLe={plan.inspectionTravailInformeeLe ? cleJourCivil(plan.inspectionTravailInformeeLe) : null}
                              informeeLeTexte={
                                plan.inspectionTravailInformeeLe ? formaterDateLongueFr(plan.inspectionTravailInformeeLe) : null
                              }
                            />
                          </Bloc>
                        )}
                        {/* R. 4512-7, 1°, seconde phrase (2026-10-12) : le
                            seuil vaut aussi quand il apparaît en cours de
                            chantier. Hors empreinte. */}
                        <Bloc titre="Heures prévisibles en cours de chantier">
                          <p className="m-0 text-[14px] leading-[1.6]">
                            {plan.heuresPrevisiblesRevisees != null && plan.heuresPrevisiblesReviseesLe
                              ? `${ligneHeuresRevisees(
                                  plan.heuresPrevisiblesRevisees,
                                  formaterDateFr(plan.heuresPrevisiblesReviseesLe),
                                )}.`
                              : "Aucune révision notée."}
                          </p>
                          <p className="m-0 mt-2 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                            {EN_CLAIR_R4512_7_EN_COURS} {CONSTAT_HEURES_REVISEES}
                          </p>
                          <LegalBadge
                            className="mt-2"
                            reference="Art. R. 4512-7 CT"
                            href={URL_R4512_7}
                            extrait={R4512_7_1_EN_COURS}
                          />
                          {planSignable && (
                            <HeuresReviseesForm planId={plan.id} dejaNotees={plan.heuresPrevisiblesRevisees !== null} />
                          )}
                        </Bloc>

                        {/* TROIS ARTICLES QUI DISENT CE QUE LE PLAN CONTIENT,
                            ET QUE CE PLAN NE PORTE PAS. Écrits un par un : la
                            garde des extraits lit la `reference` littérale. */}
                        <Bloc titre="Ce que d'autres articles demandent au plan">
                          <ul className="m-0 flex list-none flex-col gap-4 p-0 text-[13.5px] leading-[1.6]">
                            <li>
                              <ArticleEnClair texte={EN_CLAIR_R4512_9} constat={CONSTAT_R4512_9}>
                                <LegalBadge className="mt-2" reference="Art. R. 4512-9 CT" href={URL_R4512_9} extrait={R4512_9} />
                              </ArticleEnClair>
                            </li>
                            <li>
                              <ArticleEnClair texte={EN_CLAIR_R4512_11} constat={CONSTAT_R4512_11}>
                                <LegalBadge className="mt-2" reference="Art. R. 4512-11 CT" href={URL_R4512_11} extrait={R4512_11} />
                              </ArticleEnClair>
                            </li>
                            <li>
                              <ArticleEnClair texte={EN_CLAIR_R4463_8}>
                                <LegalBadge className="mt-2" reference="Art. R. 4463-8 CT" href={URL_R4463_8} extrait={R4463_8} />
                              </ArticleEnClair>
                            </li>
                          </ul>
                        </Bloc>

                        {/* R. 4512-1 à part : il ne demande rien AU PLAN. */}
                        <Bloc titre="Nouveaux sous-traitants">
                          <ArticleEnClair texte={EN_CLAIR_R4512_1} constat={CONSTAT_R4512_1}>
                            <LegalBadge className="mt-2" reference="Art. R. 4512-1 CT" href={URL_R4512_1} extrait={R4512_1}>
                              {CHAPITRE_R4512}
                            </LegalBadge>
                          </ArticleEnClair>
                        </Bloc>

                        <Bloc titre="Les textes">
                          <div className="flex flex-wrap gap-2">
                            <LegalBadge reference="Art. R. 4512-8 CT" href={URL_R4512_8}>
                              {/* LE VERBATIM SE COMPOSE, IL NE SE RECOPIE PAS (`contenu-r4512-8.ts`). */}
                              {TEXTE_R4512_8}
                            </LegalBadge>
                            <LegalBadge
                              reference="Art. R. 4512-6 à R. 4512-12 CT"
                              href="https://www.legifrance.gouv.fr/codes/id/LEGISCTA000018529787/"
                            >
                              Le plan de prévention est établi conjointement par le chef de l&apos;entreprise
                              utilisatrice et celui de l&apos;entreprise extérieure avant toute intervention, à la suite
                              d&apos;une inspection commune des lieux. Il précise les mesures de prévention prises par
                              chaque entreprise face aux risques d&apos;interférence.
                            </LegalBadge>
                          </div>
                        </Bloc>
                      </div>
                    </details>
                  </Section>
                </article>
              </div>
            )}
          </AnnonceFiche>
        </div>
      </div>
    </main>
  );
}
