import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { construireChezVous } from "@/lib/guide/chez-vous";
import type { EtablissementMatching } from "@/lib/matching";

/**
 * Le guide explique le produit : il ne doit ni le contredire, ni inventer.
 *
 * Trois défauts trouvés au contrôle visuel d'un dossier neuf, qu'aucun test ne
 * voyait — ils vivaient dans du JSX et dans un SVG, deux endroits où l'on ne
 * regarde pas.
 */

const SRC = (f: string) => readFileSync(join(process.cwd(), f), "utf8");

function bureauSansRien(): EtablissementMatching {
  return {
    id: "etab-neuf",
    effectifSurSite: 6,
    estEtablissementTravail: true,
    estERP: false,
    estIGH: false,
    estHabitation: false,
    typeErp: null,
    categorieErp: null,
    classeIgh: null,
    familleHabitation: null,
    personnesPresentesHabituellement: null,
    manipuleMatieresR422722: null,
    comporteLocauxSommeilPublic: null,
  };
}

describe("le guide ne contredit pas le produit", () => {
  it("un établissement sans équipement a bien des domaines à montrer", () => {
    // La moitié factuelle du défaut. Tant qu'elle était fausse, la phrase du
    // guide était vraie — c'est le produit qui a changé sous elle.
    const r = construireChezVous(bureauSansRien(), [], 12);
    expect(r.aucunEquipement).toBe(true);
    expect(
      r.domaines.length,
      "Sans domaine à montrer, la phrase « aucune vérification » redevient " +
        "vraie et ce test n'a plus d'objet.",
    ).toBeGreaterThan(0);
  });

  it("le guide n'affirme plus qu'aucune vérification ne peut être calculée", () => {
    // L'autre moitié. « la plateforme ne peut donc calculer aucune
    // vérification périodique » était affiché À LA PLACE de la liste des
    // domaines : les deux étaient les branches d'une même alternative, si bien
    // que déclarer zéro équipement effaçait les obligations qui ne dépendent
    // d'aucun équipement. Le paragraphe écrit pour ne pas faire croire à une
    // absence d'obligations en produisait une lui-même.
    expect(
      SRC("src/components/guide/ChezVous.tsx"),
      "Le guide affirme qu'aucune vérification ne peut être calculée sans " +
        "équipement. C'est faux depuis que des obligations naissent du statut " +
        "d'employeur.",
    ).not.toContain("ne peut donc calculer aucune vérification");
  });
});

describe("l'illustration du guide n'affiche aucune donnée", () => {
  it("aucun texte chiffré dans le SVG décoratif", () => {
    // Le défaut : le tampon portait « v3 · 04/26 » et le post-it « 22 juin ».
    // Sur un dossier créé depuis dix minutes, l'en-tête du guide montrait donc
    // une version validée et une échéance datée que le dossier n'avait pas —
    // et la section suivante promet « calculé depuis votre dossier ».
    //
    // `aria-hidden` protège les lecteurs d'écran, pas les yeux : un dirigeant
    // ne distingue pas un chiffre dessiné d'un chiffre calculé.
    //
    // La garde vise une FORME, pas les deux valeurs retirées : une liste
    // n'aurait attrapé que les fautes déjà connues.
    //
    // Elle a d'abord interdit tout chiffre, et c'était trop large — sa
    // première exécution a signalé « Art. L. 4121-1 », le badge Code du
    // travail. Une référence d'article n'est pas une donnée de dossier : elle
    // est vraie pour tout le monde, elle ne prétend rien sur le lecteur, et
    // c'est même ce que le produit affiche partout ailleurs. Ce qui est
    // interdit, ce sont les valeurs qui se lisent comme l'ÉTAT DU DOSSIER —
    // une date, un numéro de version.
    const svg = SRC("src/components/guide/IllustrationDocuments.tsx");
    const textes = [...svg.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/g)].map(
      (m) => m[1].trim(),
    );
    expect(
      textes.length,
      "Plus aucun `<text>` dans l'illustration : la garde ne garde plus rien.",
    ).toBeGreaterThan(0);

    const MOIS =
      "janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre";
    const RESSEMBLE_A_UNE_DONNEE = [
      new RegExp(`\\d{1,2}\\s+(${MOIS})`, "i"), // « 22 juin »
      /\d{1,2}\/\d{2,4}/, // « 04/26 »
      /\bv\s?\d+\b/i, // « v3 »
      /\d{4}-\d{2}-\d{2}/, // une clé de jour civil
    ];
    const fabriquees = textes.filter((t) =>
      RESSEMBLE_A_UNE_DONNEE.some((r) => r.test(t)),
    );
    expect(
      fabriquees,
      "Une date ou un numéro de version dans l'illustration décorative du " +
        "guide se lit comme une donnée du dossier. Soit la valeur se calcule, " +
        "soit elle disparaît.",
    ).toEqual([]);
  });
});

describe("ce que le tableau de bord appelle un tiers", () => {
  it("ne parle pas de « prestataire » pour un service de santé au travail", () => {
    // « Aucun prestataire déclaré en santé au travail » : l'obligation visée
    // est l'adhésion à un service de prévention et de santé au travail, qui
    // n'est pas un fournisseur qu'on retient mais une obligation légale de
    // l'employeur. Le mot ratait sa cible.
    //
    // La règle sert dix domaines techniques où « prestataire » allait de soi.
    // Une seule phrase porte les deux cas parce que ce qu'elle constate est le
    // même : une obligation suppose un tiers, l'annuaire n'en déclare aucun.
    const src = SRC("src/lib/dashboard/recommandations.ts");
    const titreLigne = src
      .split("\n")
      .find((l) => l.includes("titre: `Aucun"));
    expect(titreLigne, "La règle a changé de forme").toBeDefined();
    expect(
      titreLigne,
      "Le titre parle de « prestataire », ce qui est un contresens pour " +
        "l'adhésion à un service de prévention et de santé au travail.",
    ).not.toContain("prestataire");
  });
});
