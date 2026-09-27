import { notFound } from "next/navigation";
import {
  CarteFiche,
  ChampFiche,
  ChampsFiche,
  CorpsFiche,
  EcranFiche,
  LegalBadge,
  PastilleFiche,
} from "@/components/ui-kit";
import { lireProvenance } from "@/lib/navigation/provenance";
import { VigilancePiecePill } from "@/components/prestataires/VigilancePills";
import { SupprimerPrestataireButton } from "@/components/prestataires/SupprimerPrestataireButton";
import { getPrestataire } from "@/lib/prestataires/queries";
import { PIECES, urlPiece, type TypePiece } from "@/lib/prestataires/pieces";

const LIBELLES_PIECES: [TypePiece, string][] = [
  ["urssaf", "Ouvrir l'attestation URSSAF"],
  ["rcpro", "Ouvrir l'attestation RC Pro"],
  ["kbis", "Ouvrir le Kbis"],
];
import { LABEL_DOMAINE } from "@/lib/prestataires/schema";
import {
  D8222_5_ANCIENNETE,
  D8222_5_RYTHME,
  mentionUrssaf,
} from "@/lib/prestataires/vigilance";
import { enregistrerDatesAttestation } from "@/lib/prestataires/actions";
import { FormulaireDatesAttestation } from "@/components/prestataires/FormulaireDatesAttestation";
import { cleJourCivil, formaterDateLongueFr } from "@/lib/dates";

/**
 * La fiche d'un prestataire, en charte board (`docs/charte-board.md`).
 *
 * Elle recomposait à la main ce que le kit `ui-kit/fiche/` fait déjà —
 * `cartouche`, `cartouche-sunk`, une `<dl>` maison, une quatrième pastille de
 * Kbis bâtie sur `--accent-vif` et `--paper-sunk`. Elle passe au kit : même
 * vocabulaire que les cinq autres fiches qu'on ouvre depuis le calendrier.
 */
function formatDate(d: Date | null): string | null {
  if (!d) return null;
  return formaterDateLongueFr(d);
}

/**
 * L'état de vigilance le plus grave, traduit en ton de pastille.
 *
 * Trois lignes seulement, mais posées ici plutôt qu'en ternaire : `aPlanifier`
 * doit porter l'ardoise et non le rose. Rien n'a d'échéance tant qu'il n'y a
 * pas de document — une pièce jamais fournie n'est pas en retard.
 */
const TON_DE_L_ETAT: Record<
  "enRetard" | "proche" | "aPlanifier",
  "retard" | "proche" | "neutre"
> = {
  enRetard: "retard",
  proche: "proche",
  aPlanifier: "neutre",
};

export default async function PrestataireDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; prestataireId: string }>;
  searchParams: Promise<{ de?: string }>;
}) {
  const { id, prestataireId } = await params;
  const { de } = await searchParams;
  const p = await getPrestataire(id, prestataireId);
  if (!p) notFound();

  // Une fiche prestataire s'ouvre depuis l'annuaire, mais aussi depuis le
  // calendrier — une attestation qui expire y est une échéance.
  const provenance = lireProvenance(de, id);
  const annuaire = {
    href: `/etablissements/${id}/prestataires`,
    label: "Annuaire",
  };

  // Le VOLUME pour le mot, l'ÉTAT LE PLUS GRAVE pour la couleur. Les deux ne
  // se déduisent pas l'un de l'autre : `alertesOuvertes` fond « expirée »,
  // « expire bientôt » et « jamais fournie » dans un seul chiffre.
  //
  // La carte de l'annuaire avait été corrigée, pas cette fiche — qui est
  // pourtant la surface où la contradiction se voit le mieux : elle rend
  // quelques centimètres plus bas les pastilles de pièces, où « Non fournie »
  // porte l'ardoise. Un prestataire créé ce matin affichait donc « 2 pièces à
  // demander » en rose au-dessus de deux pastilles ardoise.
  const { alertesOuvertes: nbAlertes, etatLePlusGrave } = p.vigilance;

  return (
    <EcranFiche provenance={provenance} canonique={annuaire}>
      <CorpsFiche
        principal={
          <>
            <section className="carte-board px-7 py-6 sm:px-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                    {p.siret ? `SIRET ${p.siret}` : "SIRET non renseigné"}
                  </p>
                  <h1 className="board-titre m-0 mt-2 max-w-[30ch] text-[clamp(23px,2.1vw,30px)]">
                    {p.raisonSociale}
                  </h1>
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    {p.estOrganismeAgree && (
                      <PastilleFiche ton="bleu">Organisme agréé</PastilleFiche>
                    )}
                    {/* Le nombre plutôt que le seul mot : l'utilisateur ne
                        devrait pas avoir à compter les pastilles pour savoir
                        combien de pièces lui manquent. */}
                    {etatLePlusGrave !== null ? (
                      <PastilleFiche ton={TON_DE_L_ETAT[etatLePlusGrave]}>
                        {nbAlertes > 1
                          ? `${nbAlertes} pièces à demander`
                          : "1 pièce à demander"}
                      </PastilleFiche>
                    ) : (
                      /* ~~« Pièces à jour »~~ — corrigé le 2026-09-20. Le
                         calcul de vigilance ne porte QUE sur l'attestation
                         URSSAF et la RC Pro : « Kbis exclu », écrit au type
                         (`prestataires/vigilance.ts`). La pastille coiffait
                         donc, quatre-vingts lignes plus bas, une ligne
                         « Extrait Kbis — Non fourni ». Elle nomme désormais ce
                         qu'elle a vérifié, ce qui est à la fois plus modeste
                         et plus utile : le lecteur sait quoi regarder ensuite. */
                      <PastilleFiche ton="fait">
                        Vigilance à jour
                      </PastilleFiche>
                    )}
                    {p.domaines.map((d) => (
                      <PastilleFiche key={d} ton="neutre">
                        {LABEL_DOMAINE[d]}
                      </PastilleFiche>
                    ))}
                  </div>
                </div>
                <SupprimerPrestataireButton
                  etablissementId={id}
                  prestataireId={p.id}
                />
              </div>
            </section>

            <CarteFiche titreFort="Contact">
              <ChampsFiche>
                <ChampFiche cle="Nom">{p.contactNom}</ChampFiche>
                <ChampFiche cle="Email">
                  <a
                    href={`mailto:${p.contactEmail}`}
                    className="font-mono text-[13px] text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]"
                  >
                    {p.contactEmail}
                  </a>
                </ChampFiche>
                {p.contactTelephone && (
                  <ChampFiche cle="Téléphone">
                    <span className="font-mono text-[13px]">
                      {p.contactTelephone}
                    </span>
                  </ChampFiche>
                )}
                <ChampFiche cle="Ajouté le">
                  {formatDate(p.createdAt)}
                </ChampFiche>
              </ChampsFiche>
            </CarteFiche>

            <CarteFiche titreFort="Obligation de vigilance">
              <div className="flex flex-col gap-2">
                <VigilancePiecePill
                  libelle="Attestation URSSAF"
                  statut={p.vigilance.urssaf}
                  jours={p.vigilance.urssafExpireDans}
                  mention={mentionUrssaf(p.vigilance)}
                />
                <VigilancePiecePill
                  libelle="RC Pro"
                  statut={p.vigilance.rcPro}
                  jours={p.vigilance.rcProExpireDans}
                />
                {/* Le Kbis n'a pas de statut d'expiration, et c'est délibéré :
                    aucun texte ne lui assortit de périodicité citable. Le
                    produit informe de son âge, il ne décrète pas une échéance
                    (cf. `lib/prestataires/vigilance.ts`). */}
                <span className="flex items-center justify-between gap-3 rounded-[14px] bg-[color:var(--board-slate-pale)] px-3 py-2">
                  <span className="min-w-0">
                    <span className="board-eyebrow block text-[9.5px] tracking-[0.14em] text-[color:var(--board-slate-soft)]">
                      Extrait Kbis
                    </span>
                    {p.kbisDateEmission && (
                      <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-[color:var(--board-slate-mid)]">
                        Émis le {formatDate(p.kbisDateEmission)}
                      </span>
                    )}
                  </span>
                  <span className="whitespace-nowrap text-[11.5px] font-semibold text-[color:var(--board-slate-mid)]">
                    {p.vigilance.kbis === "present" ? "Fourni" : "Non fourni"}
                  </span>
                </span>
              </div>

              {/* Les pièces fournies se rouvrent ici (2026-09-27) : elles ne se
                  relisaient que par le ZIP de contrôle. Une pièce par lien, et
                  seulement celles qui ont été déposées. */}
              {LIBELLES_PIECES.some(([piece]) => p[PIECES[piece].cle]) && (
                <ul className="m-0 mt-3 flex list-none flex-wrap gap-x-5 gap-y-1.5 p-0">
                  {LIBELLES_PIECES.filter(([piece]) => p[PIECES[piece].cle]).map(
                    ([piece, libelle]) => (
                      <li key={piece}>
                        <a
                          href={urlPiece(p.id, piece)}
                          target="_blank"
                          rel="noopener"
                          className="text-[12.5px] font-medium text-[color:var(--board-blue-ink)] underline-offset-2 hover:underline"
                        >
                          {libelle}
                        </a>
                      </li>
                    ),
                  )}
                </ul>
              )}

              {/* Retiré le 2026-09-27 (décision B2, journal C43) : la phrase
                  qui avouait que les six mois partaient de `updatedAt`, et
                  que toute retouche de la fiche les repoussait. C'était le
                  palliatif ; la borne part désormais de la date de remise
                  saisie ci-dessous. */}
              <p className="m-0 mt-4 max-w-[64ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                {`L'art. D. 8222-5 fait remettre l'attestation « ${D8222_5_RYTHME} », et la veut « ${D8222_5_ANCIENNETE} ». Le prestataire la génère depuis son espace URSSAF ; un courriel suffit à l'obtenir.`}
              </p>
              {/* CE QUE ROJER LIT DANS LE TEXTE, DIT COMME UNE LECTURE
                  (contre-lecture du 2026-09-27). Le texte part de la
                  conclusion du contrat, dont Rojer n'a pas la date ; il ne dit
                  pas à quel instant mesurer « moins de six mois ». */}
              <p className="m-0 mt-2 max-w-[64ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-soft)]">
                {`Le texte part de la conclusion du contrat, dont Rojer n'enregistre pas la date. Rojer compte six mois depuis la dernière remise saisie, et mesure l'ancienneté de l'attestation à sa remise. Une remise tardive décale donc d'autant la date suivante.`}
              </p>
              <div className="mt-4">
                <FormulaireDatesAttestation
                  action={enregistrerDatesAttestation.bind(null, id, p.id)}
                  remiseLe={
                    p.attestationUrssafRemiseLe
                      ? cleJourCivil(p.attestationUrssafRemiseLe)
                      : undefined
                  }
                  emiseLe={
                    p.attestationUrssafEmiseLe
                      ? cleJourCivil(p.attestationUrssafEmiseLe)
                      : undefined
                  }
                />
              </div>
              <div className="mt-3">
                {/* LEGIARTI000037389145 rend 404. Identifiant relu à la
                    source le 2026-08-28. */}
                <LegalBadge
                  charte="board"
                  reference="Art. L. 8222-1 CT"
                  href="https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000024197683"
                  extrait="Toute personne vérifie lors de la conclusion d'un contrat dont l'objet porte sur une obligation d'un montant minimum en vue de l'exécution d'un travail, de la fourniture d'une prestation de services ou de l'accomplissement d'un acte de commerce, et périodiquement jusqu'à la fin de l'exécution du contrat, que son cocontractant s'acquitte : 1° des formalités mentionnées aux articles L. 8221-3 et L. 8221-5 […]"
                />
              </div>
            </CarteFiche>

            {p.notesInternes && (
              <CarteFiche titre="Notes internes">
                <p className="m-0 whitespace-pre-wrap text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
                  {p.notesInternes}
                </p>
              </CarteFiche>
            )}
          </>
        }
      />
    </EcranFiche>
  );
}
