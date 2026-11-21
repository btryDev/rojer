import Link from "next/link";
import { notFound } from "next/navigation";
import { lireProvenance } from "@/lib/navigation/provenance";
import { CarteFiche, LegalBadge, PastilleFiche, TitreSection } from "@/components/ui-kit";
import { FilRetour } from "@/components/ui-kit/FilRetour";
import { SignaturesSansPartie } from "@/components/signatures/SignaturesParties";
import { repartirSignatures } from "@/lib/signatures/parties";
import { InformationInspectionForm } from "@/components/plan-prevention/InformationInspectionForm";
import { CorrectionEnCours, PropositionEnAttente } from "@/components/plan-prevention/ContreSignatureFiche";
import { PanneauSignatures, type PartieVue } from "@/components/plan-prevention/PanneauSignatures";
import { HistoriquePlan } from "@/components/plan-prevention/HistoriquePlan";
import { AnnonceFiche } from "@/components/plan-prevention/AnnonceFiche";
import { statutPlanSignable } from "@/lib/signatures/etat-signable";
import { INSPECTION_SUR_PLAN_SIGNE } from "@/lib/signatures/verrou-contenu";
import { LIBELLE_METHODE_COURT } from "@/lib/signatures/methode";
import { BoutonCloturer, BoutonSupprimerPlan } from "@/components/plan-prevention/PlanActionsButtons";
import { getPlanPrevention } from "@/lib/plan-prevention/queries";
import { etatAffichePlan } from "@/lib/plan-prevention/etats";
import {
  aUnLienOuUneSignature,
  etatDeLaPartie,
  historiqueDuPlan,
  motifLienPourLaFiche,
  type EtatPartie,
} from "@/lib/plan-prevention/fiche-signatures";
import { diagnostiquerPlan } from "@/lib/plan-prevention/schema";
import {
  CHAPEAU_R4512_8,
  RUBRIQUES_R4512_8,
  TEXTE_R4512_8,
  URL_R4512_8,
  rubriquesManquantes,
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
  formaterDateCourteFr,
  formaterDateFr,
  formaterDateLongueFr,
} from "@/lib/dates";

/**
 * La fiche d'un plan de prévention (2026-11-19, lots 3 et 4 du chantier
 * d'interface, maquette V2 validée par la propriétaire).
 *
 * Dans l'ordre : l'en-tête centré (date, référence, nature des travaux,
 * bande d'intervention, statut affiché), la barre d'actions (historique,
 * PDF, clôturer, supprimer), le bandeau de la proposition ou de la
 * correction en cours, le panneau Signatures, puis le contenu du plan et
 * tous les blocs réglementaires d'avant, sans en retirer un. L'encadré
 * « Cycle de vie » n'existe plus : ses gestes sont dans l'en-tête, le
 * panneau et le contenu.
 */

const FMT_JOUR = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU_REFERENCE, day: "2-digit" });
const FMT_MOIS = new Intl.DateTimeFormat("fr-FR", { timeZone: FUSEAU_REFERENCE, month: "short" });

/** « 8 h », « 8 h 30 » */
function heureCourte(d: Date): string {
  const { heure, minute } = composantesCiviles(d);
  return minute === 0 ? `${heure} h` : `${heure} h ${String(minute).padStart(2, "0")}`;
}

function horaires(debut: Date, fin: Date): string {
  if (cleJourCivil(debut) === cleJourCivil(fin)) return `${heureCourte(debut)} → ${heureCourte(fin)}`;
  return `${formaterDateCourteFr(debut)} ${heureCourte(debut)} → ${formaterDateCourteFr(fin)} ${heureCourte(fin)}`;
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

const ETIQUETTE = "board-eyebrow m-0 text-[10.5px] tracking-[0.12em] text-[color:var(--board-slate-soft)]";
const LIEN_MODIFIER = "text-[14px] text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline";

export default async function PlanPreventionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; planId: string }>;
  searchParams: Promise<{ de?: string; openSign?: string }>;
}) {
  const { id, planId } = await params;
  const { de, openSign } = await searchParams;
  const provenance = lireProvenance(de, id);
  const registre = {
    href: `/etablissements/${id}/plan-prevention`,
    label: "Plans de prévention",
  };

  const plan = await getPlanPrevention(id, planId);
  if (!plan) notFound();

  // Le plan entier, révision en cours de chantier comprise : le diagnostic lit
  // les champs dont il a besoin (`diagnostiquerPlan`), comme le ZIP.
  const diag = diagnostiquerPlan(plan);

  // Les cinq rubriques de `R. 4512-8`, et celles que CE plan ne porte pas.
  // Le calcul vit dans `contenu-r4512-8.ts` : la fiche et le ZIP de contrôle
  // doivent dire la même chose du même plan.
  const manquantes = rubriquesManquantes(plan);
  const texteRubrique: Record<number, string | null> = {
    2: plan.adaptationMateriels,
    3: plan.instructionsTravailleurs,
    4: plan.organisationSecours,
    5: plan.participationCroisee,
  };

  // Clos ou annulé : aucune demande de signature ne part plus d'ici. Le
  // serveur la refuserait de toute façon (`etat-signable.ts`).
  const planSignable = statutPlanSignable(plan.statut);
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
  const statutAffiche = etatAffichePlan(plan.statut, aUnLienOuUneSignature(liens, plan.signatures.length));
  // « Corriger » (lot 4) : appliquée, la correction court jusqu'à la
  // signature du dirigeant.
  const correction =
    planSignable && !enAttente && !signatureEU
      ? propositions.find((p) => p.corrigeeLe && !p.finaliseeLe)
      : undefined;
  const lienAuteur = enAttente ? liens.find((l) => l.id === enAttente.accessTokenId) : undefined;
  const historique = historiqueDuPlan({
    creeLe: null,
    raisonEE: plan.entrepriseExterieureRaison,
    liens,
    signatures: [...plan.signatures, ...(plan.signaturesRevoquees ?? [])],
    propositions,
    maintenant,
  });
  const reference = numero(plan.numero);
  const fiche = `/etablissements/${id}/plan-prevention/${plan.id}`;
  const modifier = `${fiche}/modifier`;
  const objet = plan.naturesTravaux.replace(/\s+/g, " ").trim();

  const bande: { cle: string; valeur: string }[] = [
    { cle: "Entreprise extérieure", valeur: plan.entrepriseExterieureRaison },
    { cle: "Horaires", valeur: horaires(plan.dateDebut, plan.dateFin) },
    { cle: "Lieu", valeur: plan.lieux },
    {
      cle: "Intervenants",
      valeur: `${plan.efEffectifIntervenant} personne${plan.efEffectifIntervenant > 1 ? "s" : ""}`,
    },
  ];

  return (
    <main className="flex flex-1 flex-col bg-[color:var(--board-canvas)] pb-16">
      {/* L'EN-TÊTE (maquette V2) : centré, sur la trame de points. */}
      <header className="entete-trame">
        <div className="mx-auto flex w-full max-w-[1180px] flex-col items-center gap-3.5 px-4 pb-10 pt-8 text-center md:px-6 md:pt-11">
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
                <div className="flex min-w-[120px] max-w-[280px] flex-col items-center gap-1 px-6 py-3.5">
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
          <div className="flex flex-wrap justify-center gap-2">
            <PastilleFiche ton={statutAffiche.ton}>{statutAffiche.mot}</PastilleFiche>
            {/* Le seuil réglementaire n'est pas un statut : il dit ce que la
                loi impose, pas où en est le dossier. */}
            {diag.ecritObligatoire && <PastilleFiche ton="neutre">Plan écrit obligatoire</PastilleFiche>}
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-6 px-[var(--board-gutter)]">
        <div className="flex flex-wrap justify-center gap-2.5 pt-[22px]">
          <HistoriquePlan reference={reference} evenements={historique} etablissementId={id} />
          <a
            href={`/api/etablissements/${id}/plan-prevention/${plan.id}/pdf`}
            className="inline-flex min-h-11 items-center rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-card)] px-[18px] text-[14px] text-[color:var(--board-ink)] transition-colors hover:bg-[color:var(--board-slate-pale)]"
          >
            Télécharger le PDF
          </a>
          {(plan.statut === "valide" || plan.statut === "attente_signatures") && (
            <BoutonCloturer planId={plan.id} entete />
          )}
          <BoutonSupprimerPlan planId={plan.id} entete />
        </div>

        <AnnonceFiche>
          <div className="flex flex-col gap-6">
            {enAttente && (
              <PropositionEnAttente
                proposition={enAttente}
                plan={plan}
                auteur={lienAuteur?.nomDestinataire ?? lienAuteur?.emailDestinataire ?? null}
              />
            )}
            {correction && (
              <CorrectionEnCours
                raisonEE={plan.entrepriseExterieureRaison}
                modifierHref={modifier}
                signerHref={`${fiche}?openSign=1`}
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
              correctionEnCours={Boolean(correction)}
              ouvrirSigner={openSign === "1"}
            />

            <SignaturesSansPartie signatures={signatures.sansPartie} />

            {plan.statut === "clos" && (
              <p className="m-0 text-center text-[13.5px] text-[color:var(--board-green-ink)]">
                Plan clos — l&apos;intervention est terminée.
              </p>
            )}

            {/* LES RISQUES D'INTERFÉRENCE, comme la maquette : trois colonnes
                sur un creux, qui passent en une colonne sur téléphone. */}
            <section className="carte-board flex flex-col gap-3.5 px-6 py-6 md:px-8 md:py-[26px]" aria-labelledby="risques-titre">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="risques-titre" className="board-titre m-0 text-[24px] md:text-[28px]">
                  {`${plan.lignes.length} risque${plan.lignes.length > 1 ? "s" : ""} d'interférence`}
                </h2>
                {planSignable && (
                  <Link data-ecriture href={modifier} className={LIEN_MODIFIER}>
                    Modifier
                  </Link>
                )}
              </div>
              {plan.lignes.length === 0 ? (
                <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">
                  Aucun risque d&apos;interférence n&apos;est encore écrit dans ce plan.
                </p>
              ) : (
                plan.lignes.map((l, i) => (
                  <div
                    key={l.id}
                    className="grid grid-cols-1 gap-3 rounded-[18px] bg-[color:var(--board-slate-pale)] px-[18px] py-3.5 text-[14.5px] md:grid-cols-3"
                  >
                    <div>
                      <p className={ETIQUETTE}>Risque {i + 1}</p>
                      <p className="m-0 mt-0.5 whitespace-pre-wrap font-medium">{l.risque}</p>
                    </div>
                    <div>
                      <p className={ETIQUETTE}>Votre mesure</p>
                      <p className="m-0 mt-0.5 whitespace-pre-wrap">
                        {l.mesureEntrepriseUtilisatrice || (
                          <span className="text-[color:var(--board-slate-soft)]">À compléter</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className={ETIQUETTE}>Sa mesure</p>
                      <p className="m-0 mt-0.5 whitespace-pre-wrap">
                        {l.mesureEntrepriseExterieure || (
                          <span className="text-[color:var(--board-slate-soft)]">À compléter</span>
                        )}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </section>

            {/* LES PARTIES ET LA PÉRIODE — les faits de l'ancien bandeau,
                durée et seuil des 400 h compris. */}
            <section className="carte-board flex flex-col gap-4 px-6 py-6 md:px-8 md:py-[26px]" aria-labelledby="parties-titre">
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 id="parties-titre" className="board-titre m-0 text-[22px]">
                  Parties et période
                </h2>
                {planSignable && (
                  <Link data-ecriture href={modifier} className={LIEN_MODIFIER}>
                    Modifier
                  </Link>
                )}
              </div>
              <dl className="m-0 grid grid-cols-1 gap-x-6 gap-y-3 text-[14px] md:grid-cols-2">
                <div>
                  <dt className={ETIQUETTE}>Entreprise extérieure</dt>
                  <dd className="m-0 mt-0.5">
                    {plan.entrepriseExterieureRaison}
                    {plan.entrepriseExterieureSiret ? ` · SIRET ${plan.entrepriseExterieureSiret}` : ""}
                    <br />
                    <span className="text-[color:var(--board-slate-mid)]">
                      {plan.efChefNom} · {plan.efChefEmail} · {plan.efEffectifIntervenant} intervenant
                      {plan.efEffectifIntervenant > 1 ? "s" : ""}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className={ETIQUETTE}>Entreprise utilisatrice</dt>
                  <dd className="m-0 mt-0.5">
                    {plan.euChefNom}
                    {plan.euChefFonction ? ` · ${plan.euChefFonction}` : ""}
                  </dd>
                </div>
                <div>
                  <dt className={ETIQUETTE}>Période</dt>
                  <dd className="m-0 mt-0.5">
                    Du {formaterDateCourteFr(plan.dateDebut)} à {heureCourte(plan.dateDebut)} au{" "}
                    {formaterDateCourteFr(plan.dateFin)} à {heureCourte(plan.dateFin)}
                  </dd>
                </div>
                <div>
                  <dt className={ETIQUETTE}>Durée estimée</dt>
                  <dd className="m-0 mt-0.5">
                    {plan.dureeHeuresEstimee ? `${plan.dureeHeuresEstimee} h` : "—"}
                    {diag.seuil400 && (
                      <span className="text-[color:var(--board-slate-mid)]"> · seuil des 400 h franchi</span>
                    )}
                  </dd>
                </div>
                <div className="md:col-span-2">
                  <dt className={ETIQUETTE}>Lieux</dt>
                  <dd className="m-0 mt-0.5 whitespace-pre-wrap">{plan.lieux}</dd>
                </div>
              </dl>
            </section>

            <CarteFiche titre="Nature des travaux">
              <p className="m-0 whitespace-pre-wrap text-[14.5px] leading-[1.6]">{plan.naturesTravaux}</p>
            </CarteFiche>

            <CarteFiche
              titre="Inspection commune préalable"
              // Ardoise et non ambre sur « à planifier » : c'est l'absence
              // de rendez-vous, pas une urgence (charte, interdit 4).
              droite={
                plan.inspectionDate ? (
                  <PastilleFiche ton="fait">Réalisée</PastilleFiche>
                ) : (
                  <PastilleFiche ton="neutre">À planifier</PastilleFiche>
                )
              }
            >
              {plan.inspectionDate ? (
                <>
                  <p className="m-0 text-[14px]">
                    Effectuée le <strong>{formaterDateLongueFr(plan.inspectionDate)}</strong>.
                  </p>
                  {plan.inspectionParticipants && (
                    <p className="m-0 mt-3 whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                      <span className="board-eyebrow mr-2 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                        Participants
                      </span>
                      {plan.inspectionParticipants}
                    </p>
                  )}
                </>
              ) : (
                // Le moment de R. 4512-2, pas celui de R. 4512-6 (C40) ; le
                // texte sous le livre.
                <>
                  <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                    Aucune date d&apos;inspection commune enregistrée. {EN_CLAIR_R4512_2_MOMENT}
                    {/* Signé, le plan ne la prend plus (B5) : la fiche dit la
                        même issue que l'écran « Modifier ». */}
                    {planSignable && plan.signatures.length > 0 && <> {INSPECTION_SUR_PLAN_SIGNE}</>}
                  </p>
                  <LegalBadge className="mt-2" reference="Art. R. 4512-2 CT" href={URL_R4512_2} extrait={R4512_2} />
                </>
              )}
            </CarteFiche>

            {/* LE CONTENU QUE R. 4512-8 IMPOSE, ET CE QUE CE PLAN N'EN PORTE
                PAS. Une rubrique vide se dit ici plutôt que de s'omettre :
                c'est le dirigeant qui remet ce plan. Rien ne bloque. */}
            <TitreSection
              surtitre="Contenu minimal · art. R. 4512-8"
              titre={
                manquantes.length === 0
                  ? "Les cinq rubriques sont renseignées"
                  : `${manquantes.length} rubrique${manquantes.length > 1 ? "s" : ""} sur 5 non renseignée${
                      manquantes.length > 1 ? "s" : ""
                    }`
              }
            />

            {manquantes.length > 0 && (
              <CarteFiche titre="Ce que ce plan ne dit pas encore">
                <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">{CHAPEAU_R4512_8}</p>
                <ul className="m-0 mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.6]">
                  {manquantes.map((r) => (
                    <li key={r.numero}>
                      <strong>
                        {r.numero}° {r.titre}
                      </strong>
                    </li>
                  ))}
                </ul>
              </CarteFiche>
            )}

            {RUBRIQUES_R4512_8.map((r) => (
              <CarteFiche
                key={r.numero}
                titre={`${r.numero}° ${r.titre}`}
                droite={
                  r.renseignee(plan) ? (
                    <PastilleFiche ton="fait">Renseignée</PastilleFiche>
                  ) : (
                    <PastilleFiche ton="neutre">Non renseignée</PastilleFiche>
                  )
                }
              >
                {r.numero === 1 ? (
                  plan.phasesDangereuses.length > 0 ? (
                    <ul className="m-0 flex list-none flex-col gap-3 p-0">
                      {plan.phasesDangereuses.map((f) => (
                        <li key={f.id}>
                          <p className="m-0 text-[14px] font-semibold leading-[1.4]">{f.phase}</p>
                          <p className="m-0 mt-1 whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                            {f.moyensPrevention || (
                              <span className="text-[color:var(--board-slate-soft)]">Moyens de prévention à compléter</span>
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                      Aucune phase d&apos;activité dangereuse enregistrée.
                    </p>
                  )
                ) : /* `r.renseignee(plan)` : un seul juge, la pastille et le corps. */
                r.renseignee(plan) ? (
                  <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.6]">{texteRubrique[r.numero]}</p>
                ) : (
                  <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">Non renseigné.</p>
                )}
              </CarteFiche>
            ))}

            <LegalBadge className="mt-1" reference="Art. R. 4512-8 CT" href={URL_R4512_8}>
              {/* LE VERBATIM SE COMPOSE, IL NE SE RECOPIE PAS (`contenu-r4512-8.ts`). */}
              {TEXTE_R4512_8}
            </LegalBadge>

            {/* LE SUIVI RÉGLEMENTAIRE, après le contenu (cahier de reprise
                § 1.1) : rien n'en est retiré. */}
            {diag.ecritObligatoire && (
              <CarteFiche titre="Pourquoi l'écrit est obligatoire">
                <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[14.5px] leading-[1.6]">
                  {diag.raisons.map((raison) => (
                    <li key={raison}>{raison}</li>
                  ))}
                </ul>
                <LegalBadge className="mt-3" reference="Art. R. 4512-7 CT" href={URL_R4512_7}>
                  {SENS_R4512_7}
                </LegalBadge>
              </CarteFiche>
            )}
            {/* R. 4512-12, cité quand l'écrit est obligatoire ET quand la
                durée manque — l'incertitude ne réduit pas la couverture. */}
            {citeR4512_12(diag.ecrit) && (
              <CarteFiche titre="Inspection du travail">
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
              </CarteFiche>
            )}
            {/* R. 4512-7, 1°, seconde phrase (2026-10-12) : le seuil vaut aussi
                quand il apparaît en cours de chantier. Hors empreinte. */}
            <CarteFiche titre="Heures prévisibles en cours de chantier">
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
            </CarteFiche>

            {/* TROIS ARTICLES QUI DISENT CE QUE LE PLAN CONTIENT, ET QUE CE
                PLAN NE PORTE PAS. Écrits un par un : la garde des extraits lit
                la `reference` littérale. */}
            <CarteFiche titre="Ce que d'autres articles demandent au plan">
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
            </CarteFiche>

            {/* R. 4512-1 à part : il ne demande rien AU PLAN. */}
            <CarteFiche titre="Nouveaux sous-traitants">
              <ArticleEnClair texte={EN_CLAIR_R4512_1} constat={CONSTAT_R4512_1}>
                <LegalBadge className="mt-2" reference="Art. R. 4512-1 CT" href={URL_R4512_1} extrait={R4512_1}>
                  {CHAPITRE_R4512}
                </LegalBadge>
              </ArticleEnClair>
            </CarteFiche>

            <div className="pt-2">
              <LegalBadge
                reference="Art. R. 4512-6 à R. 4512-12 CT"
                href="https://www.legifrance.gouv.fr/codes/id/LEGISCTA000018529787/"
              >
                Le plan de prévention est établi conjointement par le chef de l&apos;entreprise utilisatrice et celui
                de l&apos;entreprise extérieure avant toute intervention, à la suite d&apos;une inspection commune des
                lieux. Il précise les mesures de prévention prises par chaque entreprise face aux risques
                d&apos;interférence.
              </LegalBadge>
            </div>
          </div>
        </AnnonceFiche>
      </div>
    </main>
  );
}
