import { notFound } from "next/navigation";
import { ETAT_PLAN } from "@/lib/plan-prevention/etats";
import { lireProvenance } from "@/lib/navigation/provenance";
import {
  BlocCreux,
  CarteFiche,
  CorpsFiche,
  EcranFiche,
  HeroFiche,
  LegalBadge,
  PastilleFiche,
  SignatureBlock,
  TitreSection,
  type FaitFiche,
} from "@/components/ui-kit";
import { DemanderSignatureForm } from "@/components/signatures/DemanderSignatureForm";
import { statutPlanSignable } from "@/lib/signatures/etat-signable";
import {
  BoutonCloturer,
  BoutonSupprimerPlan,
} from "@/components/plan-prevention/PlanActionsButtons";
import { getPlanPrevention } from "@/lib/plan-prevention/queries";
import { diagnostiquerPlan } from "@/lib/plan-prevention/schema";
import {
  CHAPEAU_R4512_8,
  RUBRIQUES_R4512_8,
  URL_R4512_8,
  rubriquesManquantes,
} from "@/lib/plan-prevention/contenu-r4512-8";
import {
  CHAPITRE_R4512,
  CONSTAT_R4512_1,
  CONSTAT_R4512_9,
  CONSTAT_R4512_11,
  CONSTAT_R4512_12,
  R4463_8,
  R4512_1,
  R4512_9,
  R4512_11,
  R4512_12_1,
  R4512_12_2,
  R4512_12_CHAPEAU,
  URL_R4463_8,
  URL_R4512_1,
  URL_R4512_9,
  URL_R4512_11,
  URL_R4512_12,
} from "@/lib/plan-prevention/annonces-plan";
import type { RegistreLigne } from "@/lib/calendrier/etats";
import { etatPlanPrevention } from "@/lib/calendrier/echeances";
import {
  FUSEAU_REFERENCE,
  formaterDateCourteFr,
  formaterDateLongueFr,
} from "@/lib/dates";

const FMT_HEURE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  hour: "2-digit",
  minute: "2-digit",
});

function numero(n: number): string {
  return `PP-${String(n).padStart(3, "0")}`;
}


export default async function PlanPreventionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; planId: string }>;
  searchParams: Promise<{ de?: string }>;
}) {
  const { id, planId } = await params;
  const { de } = await searchParams;
  const provenance = lireProvenance(de, id);
  const registre = {
    href: `/etablissements/${id}/plan-prevention`,
    label: "Plans de prévention",
  };

  const plan = await getPlanPrevention(id, planId);
  if (!plan) notFound();

  const diag = diagnostiquerPlan({
    dureeHeuresEstimee: plan.dureeHeuresEstimee,
    travauxDangereux: plan.travauxDangereux,
  });

  // Les cinq rubriques de `R. 4512-8`, et celles que CE plan ne porte pas.
  // Le calcul vit dans `contenu-r4512-8.ts` : la fiche et le ZIP de contrôle
  // doivent dire la même chose du même plan, et deux copies de la liste
  // auraient divergé.
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
  const signatureEU = plan.signatures.find(
    (s) => s.signataireEmail !== plan.efChefEmail,
  );
  const signatureEF = plan.signatures.find(
    (s) => s.signataireEmail === plan.efChefEmail,
  );

  const aujourdhui = new Date();
  // Annulé : ardoise, comme la tuile « Annulé » de la liste (voir la fiche du
  // permis de feu, relecture du 2026-09-14).
  const etat: RegistreLigne =
    plan.statut === "clos"
      ? "faite"
      : plan.statut === "annule"
        ? "archivee"
        : etatPlanPrevention(plan, aujourdhui);

  const faits: FaitFiche[] = [
    {
      cle: "Début",
      valeur: formaterDateCourteFr(plan.dateDebut),
      note: FMT_HEURE.format(plan.dateDebut),
    },
    {
      cle: "Fin",
      valeur: formaterDateCourteFr(plan.dateFin),
      note: FMT_HEURE.format(plan.dateFin),
    },
    {
      cle: "Durée estimée",
      valeur: plan.dureeHeuresEstimee ? `${plan.dureeHeuresEstimee} h` : "—",
      note: diag.seuil400 ? "seuil des 400 h franchi" : undefined,
    },
    { cle: "Effectif intervenant", valeur: String(plan.efEffectifIntervenant) },
  ];

  return (
    <EcranFiche provenance={provenance} canonique={registre}>
      <HeroFiche
        date={plan.dateDebut}
        etat={etat}
        famille="operations"
        surtitre={`Opération encadrée · Plan de prévention ${numero(plan.numero)}`}
        titre={plan.entrepriseExterieureRaison}
        chapeau={plan.lieux}
        faits={faits}
        pastilles={
          <>
            <PastilleFiche ton={ETAT_PLAN[plan.statut].ton}>
              {ETAT_PLAN[plan.statut].mot}
            </PastilleFiche>
            {/* Le seuil réglementaire n'est pas un statut : il dit ce que la
                loi impose, pas où en est le dossier. Le commentaire disait
                déjà cela, la couleur disait le contraire — le rose annonce un
                retard, or rien n'est en retard : le plan s'écrit en ce moment
                même, et son avancement est dit par la pastille voisine. */}
            {diag.ecritObligatoire && (
              <PastilleFiche ton="bleu">Plan écrit obligatoire</PastilleFiche>
            )}
          </>
        }
      />

      <CorpsFiche
        principal={
          <>
            {/* LE FONDEMENT, ET NON PAS SEULEMENT LE VERDICT. `raisons` était
                calculé par `diagnostiquerPlan` puis jeté : l'écran annonçait
                « Plan écrit obligatoire » sans dire au titre de quoi, et la
                seule mention de fondement qu'il portait — sur la durée — était
                tirée du OU, donc fausse dès que l'écrit venait de la liste
                dangereuse. Un dirigeant à qui l'on demande un document doit
                pouvoir lire sur quoi il est dû ; c'est aussi ce qui lui permet
                de contester. */}
            {diag.ecritObligatoire && (
              <CarteFiche titre="Pourquoi l'écrit est obligatoire">
                <ul className="m-0 flex list-disc flex-col gap-1.5 pl-5 text-[14.5px] leading-[1.6]">
                  {diag.raisons.map((raison) => (
                    <li key={raison}>{raison}</li>
                  ))}
                </ul>
              </CarteFiche>
            )}
            {/* R. 4512-12, sous la condition qu'il pose lui-même : l'écrit
                obligatoire. Le 2° est le seul acte du chapitre qui sorte de
                l'entreprise, et aucune surface ne le nommait — un dirigeant
                concluait qu'il avait fini quand il avait signé. Texte entier,
                débiteur écrit, aucun délai : l'article n'en fixe pas. */}
            {diag.ecritObligatoire && (
              <CarteFiche titre="Art. R. 4512-12 · pendant les travaux">
                <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                  « {R4512_12_CHAPEAU} :
                </p>
                <ul className="m-0 mt-2 flex list-none flex-col gap-1.5 p-0 text-[14px] leading-[1.6]">
                  <li>1° {R4512_12_1} ;</li>
                  <li>2° {R4512_12_2}. »</li>
                </ul>
                <p className="m-0 mt-3 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  {CONSTAT_R4512_12}
                </p>
                <div className="mt-3">
                  <LegalBadge charte="board" reference="Art. R. 4512-12 CT" href={URL_R4512_12} />
                </div>
              </CarteFiche>
            )}
            <CarteFiche titre="Nature des travaux">
              <p className="m-0 whitespace-pre-wrap text-[14.5px] leading-[1.6]">
                {plan.naturesTravaux}
              </p>
            </CarteFiche>

            <CarteFiche
              titre="Inspection commune préalable"
              // Ardoise et non ambre sur « à planifier » : c'est l'absence
              // de rendez-vous, pas une urgence — et l'ambre dit ailleurs
              // « échéance dans moins de trente jours » (charte, interdit 4).
              // La table de la liste, écrite dans le même lot, applique déjà
              // la règle : la fiche contredisait le commentaire de sa liste.
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
                    Effectuée le{" "}
                    <strong>{formaterDateLongueFr(plan.inspectionDate)}</strong>.
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
                <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  Aucune date d&apos;inspection commune enregistrée. Cette
                  inspection est obligatoire avant le démarrage des travaux
                  (art. R. 4512-2 CT).
                </p>
              )}
            </CarteFiche>

            <TitreSection
              surtitre="Analyse risques ↔ mesures"
              titre={`${plan.lignes.length} risque${
                plan.lignes.length > 1 ? "s" : ""
              } d'interférence`}
            />

            {plan.lignes.map((l, i) => (
              <article key={l.id} className="carte-board overflow-hidden">
                <div className="bg-[color:var(--board-slate-pale)] px-7 py-4 sm:px-8">
                  <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                    Risque {i + 1}
                  </p>
                  <p className="m-0 mt-1.5 text-[14.5px] font-semibold leading-[1.35]">
                    {l.risque}
                  </p>
                </div>
                <div className="grid grid-cols-1 divide-y divide-[color:var(--board-slate-line)] md:grid-cols-2 md:divide-x md:divide-y-0">
                  <div className="px-7 py-5 sm:px-8">
                    <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                      Votre mesure (entreprise utilisatrice)
                    </p>
                    <p className="m-0 mt-2 whitespace-pre-wrap text-[13.5px] leading-[1.6]">
                      {l.mesureEntrepriseUtilisatrice || (
                        <span className="text-[color:var(--board-slate-soft)]">
                          À compléter
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="px-7 py-5 sm:px-8">
                    <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                      Mesure de l&apos;entreprise extérieure
                    </p>
                    <p className="m-0 mt-2 whitespace-pre-wrap text-[13.5px] leading-[1.6]">
                      {l.mesureEntrepriseExterieure || (
                        <span className="text-[color:var(--board-slate-soft)]">
                          À compléter
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </article>
            ))}

            {/* LE CONTENU QUE R. 4512-8 IMPOSE, ET CE QUE CE PLAN N'EN PORTE
                PAS. La fiche montrait la nature des travaux, l'inspection
                commune, les risques d'interférence et les signatures — jamais
                les cinq rubriques que l'article exige, alors que Rojer émet le
                document et que la pastille du bas cite « R. 4512-6 à
                R. 4512-12 ». Une rubrique vide se dit ici plutôt que de
                s'omettre : c'est le dirigeant qui remet ce plan, et lui seul a
                une chance de s'apercevoir qu'il lui manque quelque chose. */}
            <TitreSection
              surtitre="Contenu minimal · art. R. 4512-8"
              titre={
                manquantes.length === 0
                  ? "Les cinq rubriques sont renseignées"
                  : `${manquantes.length} rubrique${
                      manquantes.length > 1 ? "s" : ""
                    } sur 5 non renseignée${manquantes.length > 1 ? "s" : ""}`
              }
            />

            {manquantes.length > 0 && (
              <CarteFiche titre="Ce que ce plan ne dit pas encore">
                <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                  {CHAPEAU_R4512_8}
                </p>
                <ul className="m-0 mt-3 flex list-disc flex-col gap-1.5 pl-5 text-[14px] leading-[1.6]">
                  {manquantes.map((r) => (
                    <li key={r.numero}>
                      <strong>
                        {r.numero}° {r.titre}
                      </strong>{" "}
                      — « {r.verbatim}. »
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
                          <p className="m-0 text-[14px] font-semibold leading-[1.4]">
                            {f.phase}
                          </p>
                          <p className="m-0 mt-1 whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[color:var(--board-slate-ink)]">
                            {f.moyensPrevention || (
                              <span className="text-[color:var(--board-slate-soft)]">
                                Moyens de prévention à compléter
                              </span>
                            )}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                      Aucune phase d&apos;activité dangereuse enregistrée. « {r.verbatim}. »
                    </p>
                  )
                ) : /* `r.renseignee(plan)` et non la véracité brute de la
                       valeur : la pastille se décidait avec `.trim()`, le corps
                       sans. Sur une valeur faite d'espaces, la carte affichait
                       « Non renseignée » ET un paragraphe blanc, au lieu de la
                       phrase qui dit ce que l'article demande. Un seul juge. */
                r.renseignee(plan) ? (
                  <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.6]">
                    {texteRubrique[r.numero]}
                  </p>
                ) : (
                  <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                    Non renseigné. « {r.verbatim}. »
                  </p>
                )}
              </CarteFiche>
            ))}

            <div className="pt-1">
              <LegalBadge
                charte="board"
                reference="Art. R. 4512-8 CT"
                href={URL_R4512_8}
              >
                {/* LE VERBATIM SE COMPOSE, IL NE SE RECOPIE PAS. Les cinq
                    alinéas étaient réécrits à la main ici, à trois lignes de
                    l'import de `RUBRIQUES_R4512_8` — une troisième copie que
                    rien ne surveille, dans un dépôt qui a déjà perdu trois mots
                    entre guillemets sur R. 4512-2. `citations-ecran.ts` ne
                    vérifie que des NUMÉROS d'article, jamais des verbatims :
                    cette copie aurait pu diverger sans qu'aucun test bronche. */}
                {`${CHAPEAU_R4512_8} ${RUBRIQUES_R4512_8.map(
                  (r) => `${r.numero}° ${r.verbatim}`,
                ).join(" ; ")}.`}
              </LegalBadge>
            </div>

            {/* QUATRE ARTICLES QUE CE PLAN NE PORTE PAS, ET QUE LA FICHE DIT.
                Au corpus, ils sont `obligation_manquante` : le module existe
                et n'en disait rien. Ils ne sont pas comptés dans les « cinq
                rubriques » — R. 4512-8 est le seul article qui les énumère —,
                et aucune pastille ne leur donne un état : Rojer n'a rien pour
                savoir s'ils sont satisfaits. Le texte, puis ce que le produit
                enregistre ou non ; aucune qualification. */}
            <CarteFiche titre="Ce que d'autres articles demandent au plan">
              <ul className="m-0 flex list-none flex-col gap-4 p-0 text-[13.5px] leading-[1.6]">
                {[
                  { ref: "R. 4512-9", href: URL_R4512_9, texte: R4512_9, suite: CONSTAT_R4512_9 },
                  { ref: "R. 4512-11", href: URL_R4512_11, texte: R4512_11, suite: CONSTAT_R4512_11 },
                  { ref: "R. 4463-8", href: URL_R4463_8, texte: R4463_8, suite: null },
                  {
                    ref: "R. 4512-1",
                    href: URL_R4512_1,
                    texte: R4512_1,
                    suite: `${CHAPITRE_R4512} ${CONSTAT_R4512_1}`,
                  },
                ].map((a) => (
                  <li key={a.ref}>
                    <p className="m-0">« {a.texte} »</p>
                    {a.suite && (
                      <p className="m-0 mt-1 text-[13px] text-[color:var(--board-slate-mid)]">
                        {a.suite}
                      </p>
                    )}
                    <div className="mt-2">
                      <LegalBadge charte="board" reference={`Art. ${a.ref} CT`} href={a.href} />
                    </div>
                  </li>
                ))}
              </ul>
            </CarteFiche>
          </>
        }
        cote={
          <CarteFiche titre="Cycle de vie">
            <div className="flex flex-wrap items-center gap-3">
              {(plan.statut === "valide" ||
                plan.statut === "attente_signatures") && (
                <BoutonCloturer planId={plan.id} />
              )}
              {plan.statut === "clos" && (
                <p className="m-0 w-full text-[13px] leading-[1.55] text-[color:var(--board-green-ink)]">
                  Plan clos — l&apos;intervention est terminée.
                </p>
              )}
              <BoutonSupprimerPlan planId={plan.id} />
            </div>
          </CarteFiche>
        }
      />

      <TitreSection
        surtitre="Signatures"
        titre="Co-signature donneur d'ordre et entreprise extérieure"
      />

      <div className="grid grid-cols-1 gap-[22px] md:grid-cols-2">
        <div>
          <p className="board-eyebrow m-0 mb-2.5 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Entreprise utilisatrice · {plan.euChefNom}
          </p>
          {signatureEU ? (
            <SignatureBlock
              charte="board"
              signataireNom={signatureEU.signataireNom}
              signataireRole={signatureEU.signataireRole}
              signataireEmail={signatureEU.signataireEmail}
              horodatageIso={signatureEU.horodatageIso}
              methode={signatureEU.methode}
              hashDocument={signatureEU.hashDocument}
              nomDocument={signatureEU.nomDocument}
              signatureId={signatureEU.id}
              verifierHref={`/verifier/${signatureEU.id}`}
            />
          ) : (
            <BlocCreux>
              {planSignable ? (
                <DemanderSignatureForm
                  etablissementId={id}
                  objetType="plan_prevention"
                  objetId={plan.id}
                  nomDefaut={plan.euChefNom}
                />
              ) : (
                <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">
                  Plus de signature à recueillir : le document est clos ou annulé.
                </p>
              )}
            </BlocCreux>
          )}
        </div>

        <div>
          <p className="board-eyebrow m-0 mb-2.5 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Entreprise extérieure · {plan.efChefNom}
          </p>
          {signatureEF ? (
            <SignatureBlock
              charte="board"
              signataireNom={signatureEF.signataireNom}
              signataireRole={signatureEF.signataireRole}
              signataireEmail={signatureEF.signataireEmail}
              horodatageIso={signatureEF.horodatageIso}
              methode={signatureEF.methode}
              hashDocument={signatureEF.hashDocument}
              nomDocument={signatureEF.nomDocument}
              signatureId={signatureEF.id}
              verifierHref={`/verifier/${signatureEF.id}`}
            />
          ) : (
            <BlocCreux>
              {planSignable ? (
                <DemanderSignatureForm
                  etablissementId={id}
                  objetType="plan_prevention"
                  objetId={plan.id}
                  emailDefaut={plan.efChefEmail}
                  nomDefaut={plan.efChefNom}
                />
              ) : (
                <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">
                  Plus de signature à recueillir : le document est clos ou annulé.
                </p>
              )}
            </BlocCreux>
          )}
        </div>
      </div>

      <div className="pt-2">
        <LegalBadge
          charte="board"
          reference="Art. R. 4512-6 à R. 4512-12 CT"
          href="https://www.legifrance.gouv.fr/codes/id/LEGISCTA000018529787/"
          defaultOpen
        >
          Le plan de prévention est établi conjointement par le chef de
          l&apos;entreprise utilisatrice et celui de l&apos;entreprise
          extérieure avant toute intervention, à la suite d&apos;une inspection
          commune des lieux. Il précise les mesures de prévention prises par
          chaque entreprise face aux risques d&apos;interférence.
        </LegalBadge>
      </div>
    </EcranFiche>
  );
}
