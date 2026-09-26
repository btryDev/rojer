// Le fait générateur et le libellé d'une ligne « Quand ça arrive » sont ce
// que le dirigeant lit pour savoir ce qui lui est dû, et quand. `lignes.ts`
// promet qu'ils sont écrits « dans les mots du texte ». Ce fichier rend la
// promesse vérifiable — dans la mesure exacte que son en-tête décrit.
//
// POURQUOI CE TEST EXISTE. Deux contre-lectures, les 2026-09-21 et 26, ont
// trouvé des paraphrases que rien n'avait signalées : « vulnérable à la
// chaleur intense » pour « vulnérable aux risques liés à l'exposition aux
// épisodes de chaleur intense », « d'accidents ou de maladies » pour
// « d'accident du travail ou de maladie professionnelle ou à caractère
// professionnel », « un arrêt de travail » tout court, des libellés qui
// perdaient « au moins », « grave », la borne poste/fonction. Une paraphrase
// de bonne foi ne se voit pas à la relecture : elle se lit bien.
//
// LA RÈGLE DU FAIT GÉNÉRATEUR. Il se découpe à la ponctuation. Chaque
// segment — conjonction de tête comprise, si le fait en met une — est un EXTRAIT
// CONTINU du verbatim consigné pour l'obligation, qui COMMENCE ET SE TERMINE
// LÀ OÙ UNE PROPOSITION DU TEXTE COMMENCE ET SE TERMINE (ponctuation, numéro
// d'item « 1° », début ou fin du texte). Le verbatim, c'est la
// `citationCle` du corpus pour les articles cités, et le passage ENTRE
// GUILLEMETS de la `note` de chaque référence — jamais le commentaire qui
// l'entoure. Deux souplesses, écrites ici plutôt que laissées à
// l'appréciation : la casse et la ponctuation ne comptent pas, et le
// singulier vaut le pluriel. ~~Une conjonction de tête (« et », « ou ») était
// effacée avant le contrôle~~ (retiré le 2026-09-26) : elle laissait joindre
// par un « et » cumulatif deux cas que le texte sépare — le 2° et le 3° de
// `R. 4121-2`. Un fait qui a besoin d'une conjonction la prend dans le texte.
//
// Ce que la fin de proposition attrape : une troncature qui fait tomber un
// qualificatif — « en cas d'accident du travail ou de maladie
// professionnelle », privé de « grave » —, ou qui détache un complément de sa
// phrase — « dans un délai de huit jours », privé de « qui suivent cette
// reprise », qui attribuait le délai à l'employeur. Ce qu'attrape le début de
// proposition (ajouté le 2026-09-26, après qu'une contre-lecture a fait
// passer trois coupes en tête) : « le caractère répétitif … donne lieu à un
// protocole spécifique », privé de « ne revêtant pas », qui inversait le
// sens ; « un travailleur est … vulnérable », privé de « lorsqu'il est
// informé de ce qu' ».
//
// LA RÈGLE DU LIBELLÉ. Il dit l'ACTE, sans condition : la condition est dans
// le fait générateur. Tout mot du libellé, court compris, figure dans le
// verbatim — un « ne … pas » ajouté se voit donc, sauf si l'article emploie
// lui-même ces mots. C'est plus faible que la règle du fait, et c'est voulu :
// un libellé est court, il ne peut pas être un extrait ; il ne doit pas non
// plus apporter de vocabulaire que le texte n'emploie pas (« dû »,
// « reformer », « salarié » pour « travailleur »).
//
// CE QU'AUCUNE DES DEUX NE PROUVE, et qui reste à la relecture humaine :
// - qu'un SEGMENT ENTIER n'a pas été omis — « préalablement à la première
//   opération », extrait complet, appliqué à toutes les opérations au lieu des
//   seules répétitives, passerait ;
// - que les segments sont dans l'ordre du texte, ou tirés du bon article ;
// - qu'une virgule n'a pas été ajoutée ou retirée ;
// - qu'un libellé ne porte pas une condition faite de mots du texte.

import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { indexArticlesParRef } from "@/lib/referentiels/corpus";
import {
  entreGuillemets,
  motsHorsTexte,
  segmentsHorsTexte,
} from "@/lib/verbatim/extrait-continu";

// La règle elle-même vit dans `verbatim/extrait-continu.ts` depuis le
// 2026-09-26 : la garde des citations affichées la partage. Ce fichier garde
// ce qui lui est propre — la source du verbatim, et les défauts qui l'éprouvent.

/** Le verbatim consigné pour une obligation. */
function verbatimDe(o: (typeof obligationsConformite)[number]): string[] {
  const index = indexArticlesParRef();
  const textes: string[] = [];
  for (const r of o.referencesLegales) {
    if (r.note) textes.push(entreGuillemets(r.note));
    const cle = r.article ? index.get(r.article)?.article.citationCle : undefined;
    if (cle) textes.push(cle);
  }
  return textes.filter(Boolean);
}

const avecFait = obligationsConformite.filter((o) => o.faitGenerateur);
const parId = (id: string) => {
  const o = avecFait.find((x) => x.id === id);
  if (!o) throw new Error(`${id} n'a plus de fait générateur`);
  return o;
};

describe("le fait générateur et le libellé sont écrits dans les mots du texte", () => {
  it("il y a des faits générateurs à contrôler — sinon ce test ne contrôle rien", () => {
    expect(avecFait.length).toBeGreaterThanOrEqual(11);
  });

  it.each(avecFait.map((o) => [o.id, o] as const))(
    "%s : chaque segment du fait est un extrait complet du texte",
    (_id, o) => {
      expect(segmentsHorsTexte(o.faitGenerateur!, verbatimDe(o))).toEqual([]);
    },
  );

  it.each(avecFait.map((o) => [o.id, o] as const))(
    "%s : le libellé n'emploie aucun mot que le texte n'emploie pas",
    (_id, o) => {
      expect(motsHorsTexte(o.libelle, verbatimDe(o))).toEqual([]);
    },
  );

  // LA GARDE ÉPROUVÉE EN LA CASSANT — avec les défauts réellement trouvés,
  // pas avec des erreurs fabriquées pour l'occasion. Chacun doit être refusé.
  it.each([
    // Trouvés par la contre-lecture du 2026-09-21.
    [
      "prevention-etablissement-chaleur-travailleur-vulnerable",
      "Lorsque l'employeur est informé qu'un travailleur est, notamment en raison de son âge ou de son état de santé, particulièrement vulnérable à la chaleur intense",
    ],
    [
      "formation-securite-etablissement-apres-accident-grave",
      "En cas d'accident du travail grave, ou de maladie professionnelle ou à caractère professionnel grave — et en cas d'accidents ou de maladies présentant un caractère répété à un même poste, à des postes similaires, dans une même fonction ou des fonctions similaires",
    ],
    ["prevention-etablissement-chaleur-mise-en-oeuvre", "Lors de la survenue d'un épisode de chaleur intense"],
    // Trouvé par cette garde elle-même, le 2026-09-26.
    ["formation-securite-etablissement-travail-sur-ecran", "Avant la première affectation d'un salarié à un travail sur écran"],
    // Proposés par la contre-lecture du 2026-09-26 comme passant la version
    // précédente de la garde : une troncature, deux compléments détachés.
    ["formation-securite-etablissement-apres-accident-grave", "En cas d'accident du travail ou de maladie professionnelle"],
    ["sante-travail-etablissement-examen-de-reprise", "Dès que l'employeur a connaissance de la date de la fin de l'arrêt de travail, il saisit le service"],
    ["sante-travail-etablissement-examen-de-reprise", "Dès que l'employeur a connaissance de la date de la fin de l'arrêt de travail, dans un délai de huit jours"],
    // Proposés par la contre-lecture suivante comme passant la garde à fin de
    // proposition seule : trois coupes en tête.
    ["sante-travail-etablissement-examen-de-reprise", "Dès que l'employeur a connaissance de la date de la fin de l'arrêt de travail — après un congé de maternité, une absence pour cause de maladie professionnelle, pour cause d'accident du travail, pour cause de maladie ou d'accident non professionnel"],
    ["co-activite-etablissement-protocole-securite", "Préalablement à la réalisation de l'opération : le caractère répétitif défini à l'article R. 4515-3 donne lieu à un protocole de sécurité spécifique"],
    ["prevention-etablissement-chaleur-travailleur-vulnerable", "Un travailleur est, pour des raisons tenant notamment à son âge ou à son état de santé, particulièrement vulnérable aux risques liés à l'exposition aux épisodes de chaleur intense"],
    // Proposé par la vérification du 2026-09-26 : le « et » cumulatif que la
    // correction de C26 venait de retirer, et que la garde laissait revenir.
    ["prevention-etablissement-mise-a-jour-duerp-sur-fait", "Lors de toute décision d'aménagement important modifiant les conditions de santé et de sécurité ou les conditions de travail, et lorsqu'une information supplémentaire intéressant l'évaluation d'un risque est portée à la connaissance de l'employeur"],
  ])("le défaut relevé sur %s est refusé", (id, fautif) => {
    expect(segmentsHorsTexte(fautif, verbatimDe(parId(id))).length).toBeGreaterThan(0);
  });

  it.each([
    ["sante-travail-etablissement-examen-de-reprise", "Saisir le service de santé au travail pour l'examen de reprise dû"],
    ["formation-securite-etablissement-apres-accident-grave", "Après un accident grave : analyser les conditions de travail, et reformer s'il y a lieu"],
    ["prevention-etablissement-chaleur-mise-en-oeuvre", "L'employeur ne met pas en œuvre les mesures"],
  ])("le libellé fautif relevé sur %s est refusé", (id, fautif) => {
    expect(motsHorsTexte(fautif, verbatimDe(parId(id))).length).toBeGreaterThan(0);
  });

  it("le pluriel vaut le singulier ; début et fin de proposition sont exigés ; aucune conjonction n'est offerte", () => {
    const texte = ["Épisodes de chaleur intense, l'employeur"];
    expect(segmentsHorsTexte("épisode de chaleur intense", texte)).toEqual([]);
    expect(segmentsHorsTexte("épisode de chaleur", texte)).toEqual(["épisode de chaleur"]);
    expect(segmentsHorsTexte("et épisode de chaleur intense", texte)).toEqual(["et épisode de chaleur intense"]);
    expect(segmentsHorsTexte("chaleur intense", texte)).toEqual(["chaleur intense"]);
  });

  it("le commentaire d'une note n'est pas du texte", () => {
    expect(entreGuillemets("« Le texte. » Version en vigueur depuis 2022 — commentaire.")).toBe(" Le texte. ");
  });
});
