import { OngletsPage } from "@/components/ui-kit/OngletsPage";

/**
 * Les deux onglets d'Équipe (ADR-047) : les personnes et leurs titres, puis
 * les formations du dossier. `aDeclarer` : les formations à mettre en place
 * qui ne sont pas déclarées — l'alerte reste visible depuis Personnes.
 */
export function OngletsEquipe({
  etablissementId,
  actif,
  aDeclarer,
}: {
  etablissementId: string;
  actif: "personnes" | "formations";
  aDeclarer: number;
}) {
  const base = `/etablissements/${etablissementId}/equipe`;
  return (
    <OngletsPage
      libelle="Équipe"
      onglets={[
        { href: base, label: "Personnes", actif: actif === "personnes" },
        {
          href: `${base}/formations`,
          label: "Formations",
          actif: actif === "formations",
          alerte: aDeclarer,
          libelleAlerte: `${aDeclarer} à mettre en place`,
        },
      ]}
    />
  );
}
