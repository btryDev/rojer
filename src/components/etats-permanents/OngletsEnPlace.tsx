import { OngletsPage } from "@/components/ui-kit/OngletsPage";

import { LABEL_ONGLET_EN_CAS_DE } from "@/lib/etats-permanents/libelles-onglets";

/**
 * Les deux onglets de « Ce qui doit être en place » (décision de la
 * propriétaire du 2026-10-24, ADR-037 amendée) : ce qui doit exister en
 * permanence, à déclarer ; et ce que la loi prévoit en cas d'événement, en
 * lecture seule — ni date, ni état, ni compteur.
 *
 * `decoupe` : la découpe choisie sur « En permanence » (`?decoupe=geste`),
 * reconduite par les deux liens — sans quoi un aller-retour entre les onglets
 * la perdait (revue du 2026-10-24).
 */
export function OngletsEnPlace({
  etablissementId,
  actif,
  decoupe,
}: {
  etablissementId: string;
  actif: "permanence" | "evenement";
  decoupe?: "geste";
}) {
  const base = `/etablissements/${etablissementId}/etats-permanents`;
  const q = decoupe ? `?decoupe=${decoupe}` : "";
  return (
    <OngletsPage
      libelle="Ce qui doit être en place"
      onglets={[
        { href: `${base}${q}`, label: "En permanence", actif: actif === "permanence" },
        { href: `${base}/en-cas-de${q}`, label: LABEL_ONGLET_EN_CAS_DE, actif: actif === "evenement" },
      ]}
    />
  );
}
