// La mention d'un aperçu qui n'est pas un document officiel (ADR-053 § 15,
// « valider = s'abonner ») : en tête de chaque page, fixe.

import { StyleSheet, Text, View } from "@react-pdf/renderer";

export const LIBELLE_PROJET = "PROJET – NON VALIDÉ";

const s = StyleSheet.create({
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
  libelle: { fontSize: 8, fontFamily: "Helvetica-Bold", color: "#92400e", letterSpacing: 1.2 },
  precision: { fontSize: 7, color: "#92400e", marginTop: 1 },
});

/** La bande, à poser en premier enfant de chaque `<Page>`. */
export function MentionProjet({ precision }: { precision: string }) {
  return (
    <View style={s.bande} fixed>
      <Text style={s.libelle}>{LIBELLE_PROJET}</Text>
      <Text style={s.precision}>{precision}</Text>
    </View>
  );
}
