import { describe, expect, it } from "vitest";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { estDeclencheeParUnFait } from "@/lib/etats-permanents/regle";
import { obligationsDeclencheesParUnFait } from "./obligations-evenementielles";
import { cataloguerTitres, titresGouvernesParUneQuestion } from "./catalogue";

const jour = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("ce qu'un fait rend dû à une personne", () => {
  it("rend des obligations, et rien d'autre que des événementielles sans rythme", () => {
    const lignes = obligationsDeclencheesParUnFait();
    expect(
      lignes.length,
      "la fiche d'un salarié n'afficherait plus rien : la carte est morte",
    ).toBeGreaterThan(0);
    for (const { obligation } of lignes) {
      expect(obligation.nature, obligation.id).toBe("evenementielle");
      expect(obligation.periodicite, obligation.id).toBe("autre");
      expect(obligation.porteur, obligation.id).toBe("salarie");
    }
  });

  it("n'oublie aucune obligation salarié que la règle retient", () => {
    // La borne haute, écrite en confrontant la liste rendue au RÉFÉRENTIEL
    // plutôt qu'à une énumération d'identifiants : une liste recopiée se
    // répare en la recopiant, donc elle cesse de vérifier. Ici, ajouter une
    // obligation salarié événementielle au référentiel sans qu'elle atteigne
    // la fiche fait tomber ce test tout seul.
    //
    // Depuis l'ADR-038, la fiche a DEUX surfaces pour ces obligations : cette
    // carte, et celle du DUERP pour ce qu'une question transverse gouverne.
    // La borne porte donc sur leur réunion, confrontée au référentiel : une
    // obligation retenue par la règle qui n'est rendue ici ET qu'aucune
    // question ne gouverne fait tomber le test. Que la carte du DUERP NOMME
    // bien les titres gouvernés, dans chaque état, est éprouvé sur le rendu
    // (`components/salaries/CarteTitresDuDuerp.test.tsx`), pas ici.
    const gouvernes = titresGouvernesParUneQuestion();
    const rendues = new Set(
      obligationsDeclencheesParUnFait().map((l) => l.obligation.id),
    );
    const nullePart = obligationsConformite
      .filter((o) => o.porteur === "salarie")
      .filter((o) => estDeclencheeParUnFait(o))
      .map((o) => o.id)
      .filter((id) => !rendues.has(id) && !gouvernes.has(id));
    expect(nullePart).toEqual([]);
  });

  it("laisse dehors les titres que le catalogue propose et qui ne sont pas de ce genre", () => {
    // La couche voisine : le catalogue est plus large que cette carte. Un
    // état permanent — l'autorisation de conduite — s'y trouve et ne doit pas
    // arriver ici, sans quoi la carte redirait ce que l'écran « Ce qui doit
    // être en place » dit déjà.
    const rendues = new Set(
      obligationsDeclencheesParUnFait().map((l) => l.obligation.id),
    );
    const catalogue = cataloguerTitres();
    expect(
      catalogue.length,
      "le catalogue s'est vidé : ce test ne vérifie plus rien",
    ).toBeGreaterThan(rendues.size);
    for (const o of catalogue) {
      if (o.nature === "evenementielle" && o.periodicite === "autre") continue;
      expect(
        rendues.has(o.id),
        `${o.id} (${o.nature}) n'a rien à faire sur cette carte`,
      ).toBe(false);
    }
  });

  it("ne varie pas d'une personne à l'autre — seule la date jointe varie", () => {
    // C'est exact et non grossier : le moteur ne dérive rien d'un porteur
    // salarié (ADR-023), et la formation à la sécurité est due à TOUS les
    // travailleurs. Restreindre la liste demanderait de deviner qui conduit un
    // engin.
    const sansTitre = obligationsDeclencheesParUnFait([]);
    const avecTitre = obligationsDeclencheesParUnFait([
      { obligationId: sansTitre[0].obligation.id, delivreLe: jour("2026-03-12") },
    ]);
    expect(avecTitre.map((l) => l.obligation.id)).toEqual(
      sansTitre.map((l) => l.obligation.id),
    );
    expect(sansTitre[0].dernierTitreLe).toBeNull();
    expect(avecTitre[0].dernierTitreLe).toEqual(jour("2026-03-12"));
  });

  it("garde le titre le plus récent quand la personne en porte deux", () => {
    // Un renouvellement ne remplace pas la ligne précédente en base : la
    // personne porte deux titres pour la même obligation. Afficher le plus
    // ancien laisserait croire que rien n'a bougé depuis.
    const id = obligationsDeclencheesParUnFait()[0].obligation.id;
    const lignes = obligationsDeclencheesParUnFait([
      { obligationId: id, delivreLe: jour("2024-05-02") },
      { obligationId: id, delivreLe: jour("2026-01-30") },
    ]);
    expect(lignes[0].dernierTitreLe).toEqual(jour("2026-01-30"));
  });

  it("ignore un titre dont l'obligation a quitté le référentiel", () => {
    // Le sens de lecture de `etats-permanents/queries.ts` : on part des
    // obligations et on joint les déclarations. Une déclaration orpheline ne
    // fabrique donc aucune ligne fantôme — elle n'affirme rien tant que
    // personne ne la lit.
    const lignes = obligationsDeclencheesParUnFait([
      { obligationId: "obligation-qui-nexiste-pas", delivreLe: jour("2026-01-30") },
    ]);
    expect(lignes.every((l) => l.dernierTitreLe === null)).toBe(true);
  });
});
