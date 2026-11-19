import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { MethodeSignature, PartieSignataire, StatutPlanPrevention } from "@prisma/client";
import { formaterDateFr, formaterDateHeureFr, formaterDateLongueFr } from "@/lib/dates";
import { ETAT_PLAN } from "@/lib/plan-prevention/etats";
import { ligneHeuresRevisees } from "@/lib/plan-prevention/annonces-plan";
import {
  CHAPEAU_R4512_8,
  RUBRIQUES_R4512_8,
  TEXTE_R4512_8,
  rubriquesManquantes,
  texteRubrique,
} from "@/lib/plan-prevention/contenu-r4512-8";
import { BOARD, slugifyFilename, stylesCommuns as s } from "./styles";
import { PiedFixe } from "./PiedFixe";

/**
 * Le plan de prévention en PDF (lot 5 du chantier contre-signature,
 * 2026-11-19 ; ADR-061 § 7).
 *
 * RENDU À LA DEMANDE, JAMAIS SCELLÉ. Ce fichier est mis en page depuis les
 * données du plan au moment où on le demande : il n'est ni stocké, ni
 * horodaté par un tiers. Les signatures portent sur les DONNÉES du plan
 * (`calculerHashObjet`, empreinte SHA-256 d'un JSON canonique), pas sur ce
 * fichier — d'où, pour chaque signature, l'empreinte imprimée et l'adresse
 * publique qui la vérifie, et la phrase qui dit que le fichier n'est pas un
 * original scellé (relecture de sécurité du 2026-11-19).
 *
 * Tant qu'une partie attendue n'a pas signé, chaque feuille porte la bande
 * « Document de travail » : un plan imprimé à mi-chemin ne doit pas se lire
 * comme arrêté en commun.
 *
 * Le contenu suit la fiche et la page de signature (`/acces/[token]`) : rien
 * de plus, rien de moins. Aucune adresse électronique n'y figure — le fichier
 * part chez les deux parties, et le PDF n'a pas besoin de les répéter.
 */

export type SignaturePlanPdf = {
  id: string;
  partie: PartieSignataire | null;
  signataireNom: string;
  signataireRole: string | null;
  horodatageIso: Date;
  methode: MethodeSignature;
  hashDocument: string;
  /** `true` pour une signature en vigueur ; `null` une fois révoquée (ADR-061). */
  active: boolean | null;
};

export type PlanPreventionData = {
  numero: number;
  statut: StatutPlanPrevention;
  entreprise: string;
  etablissement: string;
  adresse: string;
  siretEtablissement: string | null;
  genereLe: Date;
  /** L'adresse publique de l'application, `null` si elle n'est pas configurée. */
  urlPublique: string | null;
  /** Les raisons pour lesquelles l'écrit est obligatoire (R. 4512-7), vides sinon. */
  raisonsEcrit: string[];
  plan: {
    entrepriseExterieureRaison: string;
    entrepriseExterieureSiret: string | null;
    efChefNom: string;
    efEffectifIntervenant: number;
    euChefNom: string;
    euChefFonction: string | null;
    dateDebut: Date;
    dateFin: Date;
    dureeHeuresEstimee: number | null;
    heuresPrevisiblesRevisees: number | null;
    heuresPrevisiblesReviseesLe: Date | null;
    lieux: string;
    naturesTravaux: string;
    travauxDangereux: boolean;
    inspectionDate: Date | null;
    inspectionParticipants: string | null;
    lignes: {
      risque: string;
      mesureEntrepriseUtilisatrice: string | null;
      mesureEntrepriseExterieure: string | null;
    }[];
    phasesDangereuses: { phase: string; moyensPrevention: string | null }[];
    adaptationMateriels: string | null;
    instructionsTravailleurs: string | null;
    organisationSecours: string | null;
    participationCroisee: string | null;
  };
  signatures: SignaturePlanPdf[];
};

export const LIBELLE_PARTIE_PLAN: Record<PartieSignataire, string> = {
  entreprise_utilisatrice: "Entreprise utilisatrice",
  entreprise_exterieure: "Entreprise extérieure",
};

export const LIBELLE_METHODE: Record<MethodeSignature, string> = {
  compte_connecte: "depuis le compte Rojer de l'entreprise utilisatrice",
  otp_email: "par lien personnel, confirmé par un code à usage unique",
  // 2026-11-19 : la fenêtre « Signer et envoyer » de la fiche du plan.
  compte_code_email:
    "depuis le compte Rojer de l'entreprise utilisatrice, confirmé par un code à usage unique envoyé à l'adresse du compte",
};

const PARTIES_ATTENDUES: readonly PartieSignataire[] = [
  "entreprise_utilisatrice",
  "entreprise_exterieure",
];

export const MENTION_DOCUMENT_DE_TRAVAIL =
  "DOCUMENT DE TRAVAIL — NON SIGNÉ PAR TOUTES LES PARTIES";

export const MENTION_NON_SCELLE =
  "Ce fichier est mis en page à la demande, à partir des données du plan enregistrées dans Rojer. " +
  "Ce n'est pas un original scellé : les signatures portent sur les données du plan, pas sur ce fichier. " +
  "Chaque signature se vérifie à son adresse ci-dessus, qui recalcule l'empreinte des données signées.";

export function referencePlan(numero: number): string {
  return `PP-${String(numero).padStart(3, "0")}`;
}

/**
 * Le nom du fichier, partout le même (route, pièce jointe, ZIP). Un seul
 * point : Mailpace refuse une pièce jointe dont le nom en porte plusieurs.
 */
export function nomFichierPlanPrevention(numero: number, etablissement: string): string {
  return `Plan_prevention_${referencePlan(numero)}_${slugifyFilename(etablissement)}.pdf`;
}

/** Les signatures en vigueur, seules imprimées : une révoquée ne compte plus (ADR-061). */
export function signaturesActives(signatures: readonly SignaturePlanPdf[]): SignaturePlanPdf[] {
  return signatures.filter((x) => x.active === true);
}

/** Les parties attendues sans signature en vigueur. */
export function partiesSansSignature(signatures: readonly SignaturePlanPdf[]): PartieSignataire[] {
  const actives = signaturesActives(signatures);
  return PARTIES_ATTENDUES.filter((p) => !actives.some((x) => x.partie === p));
}

/** L'adresse publique qui vérifie une signature ; son chemin seul si l'URL n'est pas configurée. */
export function adresseDeVerification(urlPublique: string | null, signatureId: string): string {
  return urlPublique
    ? `${urlPublique}/verifier/${signatureId}`
    : `page /verifier/${signatureId} de l'application Rojer`;
}

const rempli = (v: string | null | undefined): v is string =>
  typeof v === "string" && v.trim().length > 0;

const p = StyleSheet.create({
  bande: {
    position: "absolute",
    top: 14,
    left: 40,
    right: 40,
    paddingVertical: 4,
    paddingHorizontal: 10,
    backgroundColor: "#fef3c7",
    borderWidth: 0.5,
    borderColor: "#f59e0b",
  },
  bandeTexte: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#92400e", letterSpacing: 1 },
  bandePrecision: { fontSize: 7, color: "#92400e", marginTop: 1 },
  ligne: { flexDirection: "row", marginBottom: 3 },
  cle: { width: "32%", fontSize: 9, color: BOARD.ardoiseMoyenne },
  valeur: { width: "68%", fontSize: 9.5 },
  bloc: {
    marginTop: 6,
    padding: 8,
    borderWidth: 0.5,
    borderColor: BOARD.ardoiseFilet,
  },
  titreBloc: { fontFamily: "Helvetica-Bold", fontSize: 10, marginBottom: 3 },
  manquant: { fontSize: 9, color: BOARD.ambreEncre, fontFamily: "Helvetica-Bold" },
  empreinte: { fontFamily: "Courier", fontSize: 7.5, marginTop: 2 },
});

function Ligne({ cle, children }: { cle: string; children: string }) {
  return (
    <View style={p.ligne} wrap={false}>
      <Text style={p.cle}>{cle}</Text>
      <Text style={p.valeur}>{children}</Text>
    </View>
  );
}

export function PlanPreventionDocument({ data }: { data: PlanPreventionData }) {
  const ref = referencePlan(data.numero);
  const pl = data.plan;
  const actives = signaturesActives(data.signatures);
  const sansSignature = partiesSansSignature(data.signatures);
  const deTravail = sansSignature.length > 0;
  const manquantes = rubriquesManquantes(pl);

  return (
    <Document title={`Plan de prévention ${ref}`} author="Rojer">
      <Page size="A4" style={deTravail ? [s.page, { paddingTop: 62 }] : s.page}>
        {deTravail && (
          <View style={p.bande} fixed>
            <Text style={p.bandeTexte}>{MENTION_DOCUMENT_DE_TRAVAIL}</Text>
            <Text style={p.bandePrecision}>
              {`Signature attendue : ${sansSignature.map((x) => LIBELLE_PARTIE_PLAN[x].toLowerCase()).join(", ")}.`}
            </Text>
          </View>
        )}

        <View>
          <Text style={s.h1}>{`Plan de prévention ${ref}`}</Text>
          {data.entreprise !== data.etablissement && <Text style={s.metaLigne}>{data.entreprise}</Text>}
          <Text style={s.metaLigne}>
            {data.etablissement} — {data.adresse}
            {data.siretEtablissement ? ` · SIRET ${data.siretEtablissement}` : ""}
          </Text>
          <Text style={s.metaLigne}>{`Statut dans Rojer : ${ETAT_PLAN[data.statut].mot}`}</Text>
          <Text style={s.metaLigne}>{`Mis en page le ${formaterDateLongueFr(data.genereLe)}`}</Text>
        </View>

        <Text style={s.h2}>Les parties</Text>
        <Ligne cle="Entreprise utilisatrice">
          {`${data.entreprise} — ${pl.euChefNom}${pl.euChefFonction ? `, ${pl.euChefFonction}` : ""}`}
        </Ligne>
        <Ligne cle="Entreprise extérieure">
          {`${pl.entrepriseExterieureRaison}${pl.entrepriseExterieureSiret ? ` (SIRET ${pl.entrepriseExterieureSiret})` : ""} — ${pl.efChefNom}`}
        </Ligne>
        <Ligne cle="Effectif intervenant">{String(pl.efEffectifIntervenant)}</Ligne>

        <Text style={s.h2}>Les travaux</Text>
        <Ligne cle="Période">
          {`Du ${formaterDateHeureFr(pl.dateDebut)} au ${formaterDateHeureFr(pl.dateFin)} (heure de Paris)`}
        </Ligne>
        <Ligne cle="Durée estimée">
          {pl.dureeHeuresEstimee != null ? `${pl.dureeHeuresEstimee} h` : "Non renseignée"}
        </Ligne>
        {pl.heuresPrevisiblesRevisees != null && pl.heuresPrevisiblesReviseesLe ? (
          <Ligne cle="En cours de chantier">
            {ligneHeuresRevisees(pl.heuresPrevisiblesRevisees, formaterDateFr(pl.heuresPrevisiblesReviseesLe))}
          </Ligne>
        ) : null}
        <Ligne cle="Lieux">{pl.lieux}</Ligne>
        <Ligne cle="Nature des travaux">{pl.naturesTravaux}</Ligne>
        <Ligne cle="Travaux dangereux">
          {pl.travauxDangereux
            ? "Oui — travaux figurant sur la liste de l'arrêté du 19 mars 1993"
            : "Non déclarés"}
        </Ligne>
        {data.raisonsEcrit.length > 0 && (
          <Ligne cle="Plan écrit obligatoire">{data.raisonsEcrit.join(" ; ")}</Ligne>
        )}

        <Text style={s.h2}>Inspection commune préalable (art. R. 4512-2)</Text>
        {pl.inspectionDate ? (
          <>
            <Ligne cle="Date">{formaterDateLongueFr(pl.inspectionDate)}</Ligne>
            {rempli(pl.inspectionParticipants) && (
              <Ligne cle="Participants">{pl.inspectionParticipants}</Ligne>
            )}
          </>
        ) : (
          <Text style={p.manquant}>Aucune date d&apos;inspection commune enregistrée.</Text>
        )}

        <Text style={s.h2}>Risques d&apos;interférence et mesures (art. R. 4512-6)</Text>
        {pl.lignes.length === 0 ? (
          <Text style={s.small}>Aucun risque d&apos;interférence n&apos;est inscrit au plan.</Text>
        ) : (
          <View>
            <View style={s.thead}>
              <Text style={[s.th, { width: "34%" }]}>Risque</Text>
              <Text style={[s.th, { width: "33%" }]}>Mesure de l&apos;entreprise utilisatrice</Text>
              <Text style={[s.th, { width: "33%" }]}>Mesure de l&apos;entreprise extérieure</Text>
            </View>
            {pl.lignes.map((l, i) => (
              <View key={i} style={s.row} wrap={false}>
                <Text style={[s.td, { width: "34%", paddingRight: 4, fontFamily: "Helvetica-Bold" }]}>
                  {`${i + 1}. ${l.risque}`}
                </Text>
                <Text style={[s.td, { width: "33%", paddingRight: 4 }]}>
                  {rempli(l.mesureEntrepriseUtilisatrice) ? l.mesureEntrepriseUtilisatrice : "À compléter"}
                </Text>
                <Text style={[s.td, { width: "33%" }]}>
                  {rempli(l.mesureEntrepriseExterieure) ? l.mesureEntrepriseExterieure : "À compléter"}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.h2}>Contenu minimal (art. R. 4512-8)</Text>
        <Text style={s.small}>{CHAPEAU_R4512_8}</Text>
        {manquantes.length > 0 && (
          <Text style={[p.manquant, { marginTop: 4 }]}>
            {`${manquantes.length} rubrique${manquantes.length > 1 ? "s" : ""} sur 5 non renseignée${manquantes.length > 1 ? "s" : ""} : ${manquantes.map((r) => `${r.numero}°`).join(", ")}.`}
          </Text>
        )}
        {RUBRIQUES_R4512_8.map((r) => (
          <View key={r.numero} style={p.bloc} wrap={false}>
            <Text style={p.titreBloc}>{`${r.numero}° ${r.titre}`}</Text>
            {!r.renseignee(pl) ? (
              <Text style={p.manquant}>Non renseignée</Text>
            ) : r.numero === 1 ? (
              pl.phasesDangereuses.map((f, i) => (
                <View key={i} style={{ marginBottom: 3 }}>
                  <Text style={{ fontSize: 9.5, fontFamily: "Helvetica-Bold" }}>{rempli(f.phase) ? f.phase : "—"}</Text>
                  <Text style={s.td}>
                    {`Moyens de prévention : ${rempli(f.moyensPrevention) ? f.moyensPrevention : "non renseignés"}`}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={s.td}>{texteRubrique(pl, r.numero) ?? ""}</Text>
            )}
          </View>
        ))}

        <Text style={s.h2}>Signatures</Text>
        {actives.length === 0 && <Text style={p.manquant}>Aucune signature en vigueur.</Text>}
        {actives.map((sig) => (
          <View key={sig.id} style={p.bloc} wrap={false}>
            <Text style={p.titreBloc}>
              {`${sig.partie ? LIBELLE_PARTIE_PLAN[sig.partie] : "Partie non enregistrée"} — ${sig.signataireNom}${sig.signataireRole ? `, ${sig.signataireRole}` : ""}`}
            </Text>
            <Text style={s.td}>
              {`Signé le ${formaterDateHeureFr(sig.horodatageIso)} (heure de Paris), ${LIBELLE_METHODE[sig.methode]}.`}
            </Text>
            <Text style={[s.td, { marginTop: 2 }]}>Empreinte SHA-256 des données signées :</Text>
            <Text style={p.empreinte}>{sig.hashDocument}</Text>
            <Text style={[s.td, { marginTop: 2 }]}>{`Identifiant de la signature : ${sig.id}`}</Text>
            <Text style={[s.td, { marginTop: 2 }]}>
              {`Vérifier cette signature : ${adresseDeVerification(data.urlPublique, sig.id)}`}
            </Text>
          </View>
        ))}
        {sansSignature.map((partie) => (
          <Text key={partie} style={[p.manquant, { marginTop: 4 }]}>
            {`${LIBELLE_PARTIE_PLAN[partie]} : signature non recueillie.`}
          </Text>
        ))}

        <View style={s.mentionsLegalesBloc} wrap={false}>
          <Text style={{ fontFamily: "Helvetica-Bold", marginBottom: 4 }}>
            Plan de prévention — art. R. 4512-6 à R. 4512-12 du Code du travail
          </Text>
          <Text>
            Le plan de prévention est établi conjointement par le chef de l&apos;entreprise
            utilisatrice et celui de l&apos;entreprise extérieure avant toute intervention, à la
            suite d&apos;une inspection commune des lieux. Il précise les mesures de prévention
            prises par chaque entreprise face aux risques d&apos;interférence.
          </Text>
          <Text style={{ marginTop: 4 }}>{`Art. R. 4512-8 : ${TEXTE_R4512_8}`}</Text>
          <Text style={{ marginTop: 4 }}>{MENTION_NON_SCELLE}</Text>
          <Text style={{ marginTop: 4 }}>
            Ce document ne vaut pas certification de conformité.
          </Text>
        </View>

        <PiedFixe texte={`${data.etablissement} — Plan de prévention ${ref}`} />
      </Page>
    </Document>
  );
}
