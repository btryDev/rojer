import { notFound } from "next/navigation";
import type { StatutPermisFeu } from "@prisma/client";
import { ETAT_PERMIS, libellePastillePermis } from "@/lib/permis-feu/etats";
import { Check } from "lucide-react";
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
import { statutPermisSignable } from "@/lib/signatures/etat-signable";
import {
  BoutonDemarrer,
  BoutonSupprimer,
  BoutonTerminer,
} from "@/components/permis-feu/PermisFeuActions";
import { getPermisFeu } from "@/lib/permis-feu/queries";
import { LABEL_NATURE } from "@/lib/permis-feu/schema";
import { dureeHhMm } from "@/lib/permis-feu/duree";
import {
  GROUPES_LABEL,
  MESURES_PERMIS_FEU,
  MESURES_RETIREES,
  mesuresParGroupe,
  surListeAnterieure,
} from "@/lib/permis-feu/referentiel";
import type { RegistreLigne } from "@/lib/calendrier/etats";
import { etatPermisFeu } from "@/lib/calendrier/echeances";
import { FUSEAU_REFERENCE, formaterDateCourteFr } from "@/lib/dates";

const FMT_HEURE = new Intl.DateTimeFormat("fr-FR", {
  timeZone: FUSEAU_REFERENCE,
  hour: "2-digit",
  minute: "2-digit",
});

function numero(n: number): string {
  return `PF-${String(n).padStart(3, "0")}`;
}


function PastilleStatut({
  statut,
  manquantes,
}: {
  statut: StatutPermisFeu;
  manquantes: number;
}) {
  const { ton } = ETAT_PERMIS[statut];

  // Le libellé vient de `libellePastillePermis`, fonction pure et testée. Il
  // était construit ici, en interpolant le mot de la table — `1 ${mot}` — ce
  // qui a produit « 1 En attente de signatures » le jour où ce mot a été unifié
  // avec celui de la liste. Une table de vocabulaire d'état et un décompte
  // d'objets ne se concatènent pas.
  return (
    <PastilleFiche ton={ton}>
      {libellePastillePermis(statut, manquantes)}
    </PastilleFiche>
  );
}

export default async function PermisFeuDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; permisFeuId: string }>;
  searchParams: Promise<{ de?: string }>;
}) {
  const { id, permisFeuId } = await params;
  const { de } = await searchParams;
  const provenance = lireProvenance(de, id);
  const registre = {
    href: `/etablissements/${id}/permis-feu`,
    label: "Permis de feu",
  };

  const permis = await getPermisFeu(id, permisFeuId);
  if (!permis) notFound();

  const mesuresCochees = new Set(permis.mesuresValidees);
  const groupes = mesuresParGroupe();
  // Un permis établi avant le 2026-09-26 porte des identifiants que la liste
  // n'a plus (`MESURES_RETIREES`) : ils s'affichent à part, avec leur libellé
  // d'origine, et la liste courante ne se lit pas comme un manque.
  const retireesCochees = MESURES_RETIREES.filter((m) => mesuresCochees.has(m.id));
  const courantesCochees = MESURES_PERMIS_FEU.filter((m) => mesuresCochees.has(m.id)).length;
  // Un permis établi sur une liste antérieure n'a pas pu cocher la liste
  // courante : elle ne s'y compte pas comme un manque (contre-lecture du
  // 2026-09-26). Sa date de création tranche le cas qu'aucun identifiant ne
  // dit : un permis antérieur sans aucune mesure cochée.
  const anterieur = surListeAnterieure(permis.mesuresValidees, permis.createdAt);

  // Signatures : on attend 2 signatures (donneur + prestataire).
  // Clos ou annulé : aucune demande de signature ne part plus d'ici. Le
  // serveur la refuserait de toute façon (`etat-signable.ts`).
  const permisSignable = statutPermisSignable(permis.statut);
  const signatureDonneur = permis.signatures.find(
    (s) => s.signataireEmail !== permis.prestataireEmail,
  );
  const signaturePrestataire = permis.signatures.find(
    (s) => s.signataireEmail === permis.prestataireEmail,
  );
  const manquantes = 2 - permis.signatures.length;

  const aujourdhui = new Date();
  // La tuile-date porte la date d'ouverture des travaux : c'est le
  // rendez-vous que le calendrier place, donc celui que la fiche doit
  // reprendre. Un permis terminé est un acquis, quelle que soit sa date.
  // Annulé : ardoise, comme la tuile « Annulé » de la liste — ni un acquis,
  // ni une échéance. Sans cette garde, sa fin passée le peignait « sous 30 j »
  // (relecture, 2026-09-14).
  const etat: RegistreLigne =
    permis.statut === "termine"
      ? "faite"
      : permis.statut === "annule"
        ? "archivee"
        : etatPermisFeu(permis, aujourdhui);

  const faits: FaitFiche[] = [
    {
      cle: "Début des travaux",
      valeur: formaterDateCourteFr(permis.dateDebut),
      note: FMT_HEURE.format(permis.dateDebut),
    },
    {
      cle: "Fin des travaux",
      valeur: formaterDateCourteFr(permis.dateFin),
      note: FMT_HEURE.format(permis.dateFin),
    },
    {
      cle: "Surveillance après",
      valeur: dureeHhMm(permis.dureeSurveillanceMinutes),
      note: "après extinction du dernier point chaud",
    },
    {
      cle: "Signatures",
      valeur: `${permis.signatures.length} sur 2`,
      alerte: manquantes > 0,
    },
  ];

  return (
    <EcranFiche provenance={provenance} canonique={registre}>
      <HeroFiche
        date={permis.dateDebut}
        etat={etat}
        famille="operations"
        surtitre={`Opération encadrée · Permis de feu ${numero(permis.numero)}`}
        titre={permis.prestataireRaison}
        chapeau={permis.lieu}
        faits={faits}
        pastilles={
          <>
            <PastilleStatut statut={permis.statut} manquantes={manquantes} />
            {permis.naturesTravaux.map((n) => (
              <PastilleFiche key={n} ton="neutre">
                {LABEL_NATURE[n]}
              </PastilleFiche>
            ))}
          </>
        }
      />

      <CorpsFiche
        principal={
          <>
            <CarteFiche titre="Description des travaux">
              <p className="m-0 whitespace-pre-wrap text-[14.5px] leading-[1.6]">
                {permis.descriptionTravaux}
              </p>
            </CarteFiche>

            <TitreSection
              surtitre="Une sélection de mesures de l'INRS ED 6030"
              titre="Mesures de prévention"
              droite={
                <span className="pastille-board bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]">
                  {anterieur
                    ? "Liste antérieure"
                    : `${courantesCochees} sur ${MESURES_PERMIS_FEU.length}`}
                </span>
              }
            />

            <p className="m-0 -mt-2 max-w-[68ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
              «&nbsp;Prioritaire&nbsp;» est un classement de Rojer&nbsp;:
              l&apos;INRS ne classe pas ces mesures.
              {anterieur ? (
                <>
                  {" "}
                  Ce permis a été établi sur une liste antérieure&nbsp;: les
                  mesures ci-dessous n&apos;y figuraient pas
                  {retireesCochees.length > 0
                    ? ", et celles qu'il porte sont reprises plus bas."
                    : "."}
                </>
              ) : null}
            </p>

            {(["avant", "pendant", "apres"] as const).map((g) => {
              // Le manque se compte en tête de groupe, il ne se répète pas
              // à chaque ligne : onze pastilles roses empilées ne
              // signalaient plus rien, elles remplissaient la carte.
              const manquantesObligatoires = anterieur
                ? 0
                : groupes[g].filter(
                    (m) => m.priorite === "obligatoire" && !mesuresCochees.has(m.id),
                  ).length;
              return (
                <CarteFiche
                  key={g}
                  titre={GROUPES_LABEL[g].label}
                  droite={
                    anterieur ? null : manquantesObligatoires > 0 ? (
                      <PastilleFiche ton="retard">
                        {manquantesObligatoires} prioritaire
                        {manquantesObligatoires > 1 ? "s" : ""} non cochée
                        {manquantesObligatoires > 1 ? "s" : ""}
                      </PastilleFiche>
                    ) : (
                      <PastilleFiche ton="fait">Groupe complet</PastilleFiche>
                    )
                  }
                >
                  <p className="m-0 -mt-2 mb-4 text-[12.5px] text-[color:var(--board-slate-mid)]">
                    {GROUPES_LABEL[g].sous}
                  </p>
                  <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
                    {groupes[g].map((m) => {
                      const ok = mesuresCochees.has(m.id);
                      const manque = !anterieur && m.priorite === "obligatoire" && !ok;
                      return (
                        <li
                          key={m.id}
                          className="flex items-start gap-3 text-[13.5px] leading-[1.5]"
                        >
                          {/* La pastille porte l'état : verte cochée, rose
                              creuse pour une mesure obligatoire qui manque,
                              ardoise pour une facultative. */}
                          <span
                            aria-hidden
                            className={
                              "mt-px grid size-[18px] flex-none place-items-center rounded-full " +
                              (ok
                                ? "bg-[color:var(--board-green)] text-[color:var(--board-green-ink)]"
                                : manque
                                  ? "bg-[color:var(--board-signal-pale)] ring-1 ring-[color:var(--board-signal-line)]"
                                  : "bg-[color:var(--board-slate-pale)]")
                            }
                          >
                            {ok ? <Check className="size-3" /> : null}
                          </span>
                          <span
                            className={
                              ok
                                ? "text-[color:var(--board-ink)]"
                                : manque
                                  ? "text-[color:var(--board-ink)]"
                                  : "text-[color:var(--board-slate-mid)]"
                            }
                          >
                            {m.libelle}
                          </span>
                          {manque && (
                            <span className="ml-auto flex-none text-[11.5px] font-semibold text-[color:var(--board-signal-ink)]">
                              prioritaire
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </CarteFiche>
              );
            })}

            {retireesCochees.length > 0 && (
              <CarteFiche titre="Cochées sur la liste antérieure">
                <p className="m-0 -mt-2 mb-4 text-[12.5px] text-[color:var(--board-slate-mid)]">
                  Mesures retirées de la liste après confrontation à la
                  brochure INRS ED 6030. Elles s&apos;affichent telles que ce
                  permis les a portées.
                </p>
                <ul className="m-0 flex list-none flex-col gap-3 p-0">
                  {retireesCochees.map((m) => (
                    <li key={m.id} className="text-[13.5px] leading-[1.5]">
                      <span className="text-[color:var(--board-ink)]">{m.libelle}</span>
                      <span className="mt-0.5 block text-[12px] text-[color:var(--board-slate-mid)]">
                        {m.motif}
                      </span>
                    </li>
                  ))}
                </ul>
              </CarteFiche>
            )}

            {permis.mesuresNotes && (
              <BlocCreux>
                <p className="board-eyebrow m-0 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
                  Notes de prévention
                </p>
                <p className="m-0 mt-2 whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
                  {permis.mesuresNotes}
                </p>
              </BlocCreux>
            )}
          </>
        }
        cote={
          <CarteFiche titre="Cycle de vie">
            <div className="flex flex-wrap items-center gap-3">
              {permis.statut === "attente_signatures" &&
                permis.signatures.length >= 2 && (
                  <BoutonDemarrer permisFeuId={permis.id} />
                )}
              {permis.statut === "valide" && (
                <BoutonDemarrer permisFeuId={permis.id} />
              )}
              {permis.statut === "en_cours" && (
                <>
                  <p className="m-0 w-full text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    Surveillance de{" "}
                    {dureeHhMm(permis.dureeSurveillanceMinutes)} après le
                    dernier point chaud avant de pouvoir clore.
                  </p>
                  <BoutonTerminer permisFeuId={permis.id} />
                </>
              )}
              {permis.statut === "termine" && (
                <p className="m-0 w-full text-[13px] leading-[1.55] text-[color:var(--board-green-ink)]">
                  Travaux terminés, aucun départ de feu signalé.
                </p>
              )}
              <BoutonSupprimer permisFeuId={permis.id} />
            </div>
          </CarteFiche>
        }
      />

      <TitreSection
        surtitre="Signatures électroniques"
        titre={
          manquantes > 0
            ? `${manquantes} signature${manquantes > 1 ? "s" : ""} manquante${manquantes > 1 ? "s" : ""}`
            : "Permis co-signé et valide"
        }
      />

      <div className="grid grid-cols-1 gap-[22px] md:grid-cols-2">
        <div>
          <p className="board-eyebrow m-0 mb-2.5 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Donneur d&apos;ordre · {permis.donneurOrdreNom}
          </p>
          {signatureDonneur ? (
            <SignatureBlock
              charte="board"
              signataireNom={signatureDonneur.signataireNom}
              signataireRole={signatureDonneur.signataireRole}
              signataireEmail={signatureDonneur.signataireEmail}
              horodatageIso={signatureDonneur.horodatageIso}
              methode={signatureDonneur.methode}
              hashDocument={signatureDonneur.hashDocument}
              nomDocument={signatureDonneur.nomDocument}
              signatureId={signatureDonneur.id}
              verifierHref={`/verifier/${signatureDonneur.id}`}
            />
          ) : (
            <BlocCreux>
              <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">
                En attente de votre signature côté site.
              </p>
              <div className="mt-3">
                {permisSignable ? (
                  <DemanderSignatureForm
                    etablissementId={id}
                    objetType="permis_feu"
                    objetId={permis.id}
                    emailDefaut={undefined}
                    nomDefaut={permis.donneurOrdreNom}
                  />
                ) : (
                  <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">
                    Plus de signature à recueillir : le document est clos ou annulé.
                  </p>
                )}
              </div>
            </BlocCreux>
          )}
        </div>

        <div>
          <p className="board-eyebrow m-0 mb-2.5 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
            Prestataire · {permis.prestataireContact}
          </p>
          {signaturePrestataire ? (
            <SignatureBlock
              charte="board"
              signataireNom={signaturePrestataire.signataireNom}
              signataireRole={signaturePrestataire.signataireRole}
              signataireEmail={signaturePrestataire.signataireEmail}
              horodatageIso={signaturePrestataire.horodatageIso}
              methode={signaturePrestataire.methode}
              hashDocument={signaturePrestataire.hashDocument}
              nomDocument={signaturePrestataire.nomDocument}
              signatureId={signaturePrestataire.id}
              verifierHref={`/verifier/${signaturePrestataire.id}`}
            />
          ) : (
            <BlocCreux>
              <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">
                En attente de la signature du technicien{" "}
                <span className="font-mono text-[color:var(--board-ink)]">
                  {permis.prestataireEmail}
                </span>
                .
              </p>
              <div className="mt-3">
                {permisSignable ? (
                  <DemanderSignatureForm
                    etablissementId={id}
                    objetType="permis_feu"
                    objetId={permis.id}
                    emailDefaut={permis.prestataireEmail}
                    nomDefaut={permis.prestataireContact}
                  />
                ) : (
                  <p className="m-0 text-[13.5px] text-[color:var(--board-slate-mid)]">
                    Plus de signature à recueillir : le document est clos ou annulé.
                  </p>
                )}
              </div>
            </BlocCreux>
          )}
        </div>
      </div>

      <div className="pt-2">
        {/* APSAD R43 partageait cette pastille avec un article du Code du
            travail et une recommandation INRS. C'est une règle de la
            profession de l'assurance : le dépôt ne cite en pastille que des
            sources primaires ou institutionnelles (`conformite/types.ts`,
            ADR-003). Elle est donc nommée dans le complément, qualifiée. */}
        {/* ~~« Art. R. 4224-17 CT · INRS ED 6030 »~~ — l'article retiré le
            2026-09-20, et le lien avec lui : il menait à R. 4224-17 sur
            Légifrance sous un libellé qui ne le nommait plus. R. 4224-17 impose
            l'entretien et la vérification des INSTALLATIONS ET DISPOSITIFS
            techniques et de sécurité des lieux de travail — c'est ce qu'il
            fonde ailleurs dans le produit, sur les portes et portails —, et
            rien sur un permis de travail par point chaud. Le README du ZIP
            écrit lui-même que cette pratique repose sur des référentiels sans
            valeur réglementaire propre ; lui adosser un article de code le
            contredisait. */}
        <LegalBadge
          charte="board"
          reference="INRS ED 6030"
          href="https://www.inrs.fr/media.html?refINRS=ED%206030"
          defaultOpen
        >
          Le permis de feu enregistré ici nomme le donneur d&apos;ordre et
          l&apos;entreprise qui intervient, les travaux, les mesures
          préventives cochées et la durée de surveillance après
          travaux. La règle APSAD R43 (travaux par points chauds) est un
          référentiel de la profession de l&apos;assurance : ni un article de
          code, ni un arrêté. Un contrat d&apos;assurance peut y renvoyer.
        </LegalBadge>
      </div>
    </EcranFiche>
  );
}
