import { OngletsPage } from "@/components/ui-kit/OngletsPage";

/**
 * Les deux onglets de « Ce qui doit être en place » (décision de la
 * propriétaire du 2026-10-24, ADR-037 amendée) : ce qui doit exister en
 * permanence, à déclarer ; et ce que la loi prévoit en cas d'événement, en
 * lecture seule — ni date, ni état, ni compteur.
 */
export function OngletsEnPlace({
  etablissementId,
  actif,
}: {
  etablissementId: string;
  actif: "permanence" | "evenement";
}) {
  const base = `/etablissements/${etablissementId}/etats-permanents`;
  return (
    <OngletsPage
      libelle="Ce qui doit être en place"
      onglets={[
        { href: base, label: "En permanence", actif: actif === "permanence" },
        { href: `${base}/en-cas-de`, label: "En cas de…", actif: actif === "evenement" },
      ]}
    />
  );
}
