// Une référence du dossier de relecture détaillé
// (`scripts/generer-grille-equipements.tsx --detail`) : la citation, la ligne
// de provenance, puis ce que le corpus en a relevé. Extrait du script le
// 2026-10-13 pour être testé (revue de `lot/dossier-relecture-2`, R2) : le
// script rend un PDF dès qu'on l'importe.

import { Text, View } from "@react-pdf/renderer";
import type { ReferenceLegale } from "@/lib/referentiels/conformite/types";
import { stylesCommuns as s } from "@/lib/pdf/styles";
import {
  pourHelvetica as t,
  releveDe,
  texteProvenance,
} from "@/lib/pdf/textes-grille-relecture";

export function ReferenceDetaillee({ r }: { r: ReferenceLegale }) {
  const releve = releveDe(r);
  return (
    <View style={{ marginTop: 4 }}>
      <Text style={[s.small, { fontFamily: "Helvetica-Bold" }]}>
        {t(r.reference)}
        {r.versionConstatee
          ? ` — version constatée ${r.versionConstatee}`
          : " — aucune version constatée"}
      </Text>
      {releve && (
        <Text style={[s.small, { fontSize: 7 }]}>
          {t(texteProvenance(releve, r))}
        </Text>
      )}
      {releve?.prescrit && <Text style={s.small}>{t(releve.prescrit)}</Text>}
      {releve?.citationCle && (
        <Text style={[s.small, { fontFamily: "Helvetica-Oblique" }]}>
          « {t(releve.citationCle)} »
        </Text>
      )}
      {!releve && (
        <Text style={s.small}>{t("Absent du corpus — jamais dépouillé.")}</Text>
      )}
      {releve && !releve.prescrit && !releve.citationCle && (
        <Text style={s.small}>
          {t("Dépouillé, aucun extrait relevé — texte à ouvrir.")}
        </Text>
      )}
    </View>
  );
}
