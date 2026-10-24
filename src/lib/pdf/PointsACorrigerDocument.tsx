import { Document, Page, Text, View } from "@react-pdf/renderer";
import { LABEL_STATUT_ACTION } from "@/lib/actions/labels";
import { LIBELLE_CORRIGE, LIBELLE_POINTS } from "@/lib/points-a-corriger/libelles";
import { COULEUR_STATUT } from "./PlanActionsDocument";
import { formatDateCourte, formatDateLongue, stylesCommuns as s } from "./styles";
import type { StatutAction } from "@prisma/client";

/** Un point tel que le document l'imprime (ADR-048). */
export type LignePointPdf = {
  id: string;
  libelle: string;
  description: string | null;
  statut: StatutAction;
  echeance: Date | null;
  responsable: string | null;
  /** Le contrôle et le rapport qui l'ont relevé. */
  origine: string;
  leveeLe: Date | null;
  leveeCommentaire: string | null;
  pieceJointe: boolean;
};

export type PointsACorrigerData = {
  entreprise: string;
  etablissement: string;
  adresse: string;
  appareil: string;
  genereLe: Date;
  ouverts: LignePointPdf[];
  corriges: LignePointPdf[];
};

/**
 * Les points à corriger d'un appareil (ADR-048) : ceux qui restent ouverts,
 * puis ceux qui ont été corrigés, avec ce qui a été fait — ce qu'un
 * contrôleur demande de voir.
 */
export function PointsACorrigerDocument({ data }: { data: PointsACorrigerData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        <View>
          <Text style={s.h1}>{LIBELLE_POINTS} — {data.appareil}</Text>
          <Text style={s.metaLigne}>{data.entreprise}</Text>
          <Text style={s.metaLigne}>
            {data.etablissement} — {data.adresse}
          </Text>
          <Text style={s.metaLigne}>Édition du {formatDateLongue(data.genereLe)}</Text>
        </View>

        <Text style={s.h2}>À corriger ({data.ouverts.length})</Text>
        {data.ouverts.length === 0 ? (
          <Text style={s.small}>Aucun point ouvert sur cet appareil à la date d&apos;édition.</Text>
        ) : (
          <View>
            <View style={s.thead}>
              <Text style={[s.th, { width: "46%" }]}>Point</Text>
              <Text style={[s.th, { width: "18%" }]}>Échéance</Text>
              <Text style={[s.th, { width: "18%" }]}>Responsable</Text>
              <Text style={[s.th, { width: "18%" }]}>Statut</Text>
            </View>
            {data.ouverts.map((p) => (
              <View key={p.id} style={s.row} wrap={false}>
                <View style={{ width: "46%", paddingRight: 4 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>{p.libelle}</Text>
                  <Text style={[s.small, { marginTop: 2 }]}>{p.origine}</Text>
                  {p.description && <Text style={[s.small, { marginTop: 2 }]}>{p.description}</Text>}
                </View>
                <Text style={[s.td, { width: "18%" }]}>{formatDateCourte(p.echeance)}</Text>
                <Text style={[s.td, { width: "18%" }]}>{p.responsable ?? "—"}</Text>
                <Text
                  style={{ width: "18%", fontSize: 9, color: COULEUR_STATUT[p.statut], fontFamily: "Helvetica-Bold" }}
                >
                  {LABEL_STATUT_ACTION[p.statut]}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={s.h2}>Corrigés ({data.corriges.length})</Text>
        {data.corriges.length === 0 ? (
          <Text style={s.small}>Aucun point corrigé enregistré.</Text>
        ) : (
          <View>
            <View style={s.thead}>
              <Text style={[s.th, { width: "40%" }]}>Point</Text>
              <Text style={[s.th, { width: "16%" }]}>{LIBELLE_CORRIGE} le</Text>
              <Text style={[s.th, { width: "44%" }]}>Ce qui a été fait</Text>
            </View>
            {data.corriges.map((p) => (
              <View key={p.id} style={s.row} wrap={false}>
                <View style={{ width: "40%", paddingRight: 4 }}>
                  <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5 }}>{p.libelle}</Text>
                  <Text style={[s.small, { marginTop: 2 }]}>{p.origine}</Text>
                </View>
                <Text style={[s.td, { width: "16%" }]}>{formatDateCourte(p.leveeLe)}</Text>
                <View style={{ width: "44%" }}>
                  <Text style={s.td}>{p.leveeCommentaire ?? "—"}</Text>
                  {p.pieceJointe && <Text style={[s.small, { marginTop: 2 }]}>Pièce justificative au dossier.</Text>}
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={s.mentionsLegalesBloc}>
          <Text>
            Ce document récapitule les points relevés par les contrôles de cet appareil et leur
            correction, tels qu&apos;ils sont déclarés dans Rojer. Il ne vaut pas certification de
            conformité et ne remplace pas le rapport du prochain contrôle.
          </Text>
        </View>

        <Text
          style={s.footer}
          render={({ pageNumber, totalPages }) =>
            `${data.etablissement} — ${data.appareil} — ${LIBELLE_POINTS.toLowerCase()} — page ${pageNumber}/${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
