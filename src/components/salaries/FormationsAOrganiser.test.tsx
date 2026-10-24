// La section rendue (revue qualité du 2026-10-24 : aucun test ne la visait).
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  FAITS_ACTIVITE,
  type ReponsesFaitsActivite,
} from "@/lib/etablissements/faits-activite";
import { titresSansPorteur } from "@/lib/salaries/titres-sans-porteur";
import { FormationsAOrganiser, type FormationAOrganiser } from "./FormationsAOrganiser";

const AUCUN = Object.fromEntries(
  FAITS_ACTIVITE.map((f) => [f.champ, null]),
) as ReponsesFaitsActivite;

const formation: FormationAOrganiser = {
  obligationId: "formation-securite-etablissement-manutention",
  ancre: "etat-manutention",
  libelle: "Formation à la manutention manuelle (gestes et postures)",
  pourquoi: "Votre DUERP le signale : à organiser pour les salariés concernés.",
  etat: "a-declarer",
  dessin: { src: "/x.png", fond: "#fff" },
};

const rendre = (p: Partial<Parameters<typeof FormationsAOrganiser>[0]> = {}) =>
  renderToStaticMarkup(
    <FormationsAOrganiser
      etablissementId="e1"
      formations={[]}
      fiches={[]}
      sansPorteur={[]}
      personnePresente
      aOrganiser={0}
      {...p}
    />,
  );

describe("« Formations à organiser »", () => {
  it("vide : le dit, sans pastille de compte", () => {
    const html = rendre();
    expect(html).toContain("Aucune formation à organiser pour l&#x27;établissement aujourd&#x27;hui.");
    expect(html).not.toContain("à organiser</span>");
  });

  it("la pastille porte le compte qu'on lui donne, et chaque ligne dit pourquoi elle est là", () => {
    const html = rendre({ formations: [formation], aOrganiser: 3 });
    expect(html).toContain("3 à organiser");
    expect(html).toContain("Votre DUERP le signale");
    expect(html).toContain('id="etat-manutention"');
  });

  it("ce que le DUERP signale sans porteur : choisir la personne, ou l'ajouter s'il n'y a personne", () => {
    const sansPorteur = titresSansPorteur({ ...AUCUN, conduiteEngins: true }, []);
    expect(rendre({ sansPorteur })).toContain('href="/etablissements/e1/equipe#personnes"');
    const vide = rendre({ sansPorteur, personnePresente: false });
    expect(vide).toContain('href="/etablissements/e1/equipe/nouveau"');
    expect(vide).toContain("Ajouter la personne");
  });
});
