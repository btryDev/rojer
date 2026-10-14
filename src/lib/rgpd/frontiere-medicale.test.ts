import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { MOTIF_DEPOT } from "./surfaces-depot";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { obligationsConformite } from "@/lib/referentiels/conformite";
import { estPorteeParSalarie } from "@/lib/referentiels/conformite/types";

/**
 * La frontière médicale, tenue par un test plutôt que par une promesse.
 *
 * `docs/rgpd.md` § 2.3, l'ADR-023 § 2 et le commentaire de `pieceMedicale`
 * affirment tous trois la même chose : d'une pièce médicale, l'outil ne
 * conserve que l'existence, la date et l'échéance — **jamais le document**.
 * C'est plus strict que le droit, `R. 4544-11-1` autorisant expressément
 * l'employeur à en garder copie. C'est donc un choix, et un choix ne se
 * défend pas tout seul.
 *
 * Il ne s'est d'ailleurs pas défendu : jusqu'au 2026-08-27, `pieceMedicale`
 * était un drapeau **mort** — déclaré sur le type, posé sur l'obligation, lu
 * nulle part — pendant que le formulaire de dépôt s'affichait sans condition
 * sur toutes les fiches. La garantie ne tenait que parce qu'aucun salarié ne
 * pouvait encore être saisi.
 *
 * Elle est désormais câblée, mais par une expression JSX. Une garantie de RGPD
 * portée par un ternaire ne survit pas au découpage du composant qui la
 * contient — et ce fichier est écrit la veille d'une refonte d'écrans.
 *
 * D'où la forme : lire le SOURCE de tout `src/`, et non le comportement d'une
 * page. Le cas dangereux est celui qui n'existe pas encore.
 *
 * CE QUE CE TEST PROUVE : qu'aucun fichier ne monte une surface de dépôt sur
 * une échéance sans que `pieceMedicale` y soit mentionné.
 * CE QU'IL NE PROUVE PAS : que la garde est correctement branchée. Il force à
 * regarder ; il ne relit pas à votre place.
 */

// Ce fichier vit dans `src/lib/rgpd/`.
const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

/**
 * Les composants par lesquels un fichier peut atterrir en base.
 *
 * La liste vit dans `surfaces-depot.ts` depuis le 2026-08-31 : un second test
 * la garde désormais, pour une autre raison — l'écran des états permanents
 * n'ouvre aucune surface de dépôt parce qu'une déclaration n'est pas une preuve
 * (ADR-027), et non parce qu'une pièce y serait médicale. Recopiée des deux
 * côtés, elle aurait vieilli d'un seul le jour où une quatrième primitive
 * arrive.
 */

/**
 * Ce qui rattache un fichier au monde des échéances — donc au monde où une
 * pièce médicale de salarié peut apparaître.
 *
 * Un dépôt sur un prestataire ou un carnet sanitaire ne touche pas une
 * personne suivie : il ne relève pas de cette frontière. Restreindre la règle
 * à ce qui la concerne évite d'obliger des écrans étrangers à citer un drapeau
 * qui n'a aucun sens chez eux — une règle qu'on contourne par formalisme finit
 * par ne plus être lue.
 */
const MOTIF_ECHEANCE = /\b(verification|Verification|salarie|Salarie|titre)\b/;

/** Les fichiers qui montent un dépôt sans relever de la frontière. */
const DEROGATIONS: { fichier: string; raison: string }[] = [
  {
    fichier: "components/ui-kit/EvidenceDropzone.tsx",
    raison:
      "C'est la primitive de dépôt elle-même, pas un montage : elle ne connaît ni échéance, ni obligation, ni personne. La garde se pose chez ceux qui l'emploient, et c'est précisément ce que ce test vérifie.",
  },
  {
    fichier: "components/rapports/UploadRapportForm.tsx",
    raison:
      "Le formulaire lui-même, pour la même raison. Il reçoit une action liée et ne sait rien de ce à quoi la pièce se rattache.",
  },
  {
    fichier: "components/prestataires/FormulairePrestataire.tsx",
    raison:
      "Les pièces d'un prestataire — URSSAF, RC Pro, Kbis — concernent une personne morale et ne peuvent structurellement pas être médicales. Aucun chemin ne relie un prestataire à un salarié suivi.",
  },
  {
    fichier: "components/carnet-sanitaire/AjoutAnalyseForm.tsx",
    raison:
      "Une analyse légionelles porte sur un réseau d'eau, pas sur une personne. Le mot « analyse » est trompeur : c'est un prélèvement d'installation, jamais un examen médical.",
  },
  {
    fichier: "app/etablissements/[id]/duerp/import/page.tsx",
    raison:
      "L'écran qui monte l'assistant d'import. Un DUERP importé décrit des risques par unité de travail — des postes, pas des personnes (INRS ED 840). Le mot « vérification » y désigne le contrôle du fichier déposé, pas une échéance de salarié.",
  },
  {
    fichier: "components/duerps/ImportDuerpWizard.tsx",
    raison:
      "L'import d'un DUERP existant traite des risques par unité de travail, agrégés et non nominatifs (INRS ED 840, cf. docs/rgpd.md § 2.6).",
  },
];

function fichiersSource(dir: string, acc: string[] = []): string[] {
  for (const nom of readdirSync(dir)) {
    if (nom === "node_modules" || nom === ".next") continue;
    const chemin = join(dir, nom);
    if (statSync(chemin).isDirectory()) fichiersSource(chemin, acc);
    else if (/\.tsx?$/.test(nom) && !/\.test\.tsx?$/.test(nom)) acc.push(chemin);
  }
  return acc;
}

/**
 * Le détecteur, isolé pour être testable sur une chaîne.
 *
 * Un test de garde qui ne se teste pas lui-même est une décoration : il passe
 * au vert que la règle soit respectée ou qu'il regarde au mauvais endroit.
 * Celui-ci se vérifie plus bas sur des sources fabriquées.
 */
export function depotNonGarde(source: string): boolean {
  if (!MOTIF_DEPOT.test(source)) return false;
  if (!MOTIF_ECHEANCE.test(source)) return false;
  return !source.includes("pieceMedicale");
}

/**
 * Le module du salarié, désigné par son EMPLACEMENT et non par son contenu.
 *
 * Le contenu ne peut pas servir ici, et c'est ce que la première tentative a
 * appris : `verifications/[verificationId]/page.tsx` nomme le salarié — il
 * peut être porteur de l'échéance — tout en montant légitimement le dépôt d'un
 * rapport de vérification. Une règle fondée sur le mot l'aurait interdit à
 * tort, et une règle qu'on doit excepter à tort finit exceptée partout.
 *
 * Le chemin, lui, dit sans ambiguïté de quel monde on parle.
 */
const CHEMINS_DU_SALARIE = [
  /^lib\/salaries\//,
  /^components\/salaries\//,
  /^app\/etablissements\/\[id\]\/equipe\//,
  /^app\/api\/etablissements\/\[id\]\/equipe\//,
];

/**
 * La règle forte, et celle qui manquait.
 *
 * `depotNonGarde` demande que `pieceMedicale` soit **mentionné** dans le
 * fichier. C'est ce qu'il annonce — « il force à regarder, il ne relit pas à
 * votre place » — et c'est insuffisant là où ça compte : un écran de salarié
 * qui nomme `pieceMedicale` pour afficher son encart d'avertissement satisfait
 * la règle **tout en montant un dépôt juste à côté**.
 *
 * Éprouvé le 2026-08-27 en injectant un `EvidenceDropzone` dans
 * `FormulaireTitre.tsx` : le test est resté vert, alors que trois documents et
 * un message de commit affirmaient qu'il tomberait. La garantie était donc
 * fausse, et c'est le fait de l'avoir cassée exprès qui l'a montré.
 *
 * Dans le module du salarié, la règle n'a pas besoin d'être conditionnelle :
 * il n'y a **rien** à déposer. Ni pièce médicale, ni certificat, ni scan de
 * carte. L'outil enregistre qu'un titre existe et ses dates, un point. Une
 * interdiction franche se vérifie, là où une obligation de mention se
 * contourne sans le vouloir.
 */
export function depotDansLeModuleSalarie(
  cheminRelatif: string,
  source: string,
): boolean {
  if (!CHEMINS_DU_SALARIE.some((r) => r.test(cheminRelatif))) return false;
  return MOTIF_DEPOT.test(source);
}

describe("frontière médicale — aucun dépôt de pièce sur une échéance sans garde", () => {
  it("le détecteur repère un montage non gardé", () => {
    // Sans cette vérification, on ne saurait jamais si le test regarde au bon
    // endroit. Le cas est fabriqué exprès : un dépôt, dans un fichier qui parle
    // d'échéances, sans mention de la garde.
    expect(
      depotNonGarde(`
        export function FicheVerification({ verification }) {
          return <UploadRapportForm action={deposer} />;
        }
      `),
    ).toBe(true);
  });

  it("le détecteur accepte le même montage une fois gardé", () => {
    expect(
      depotNonGarde(`
        export function FicheVerification({ verification, obligation }) {
          const pieceMedicale = obligation?.pieceMedicale === true;
          return pieceMedicale ? <p>Rien à déposer.</p> : <UploadRapportForm action={deposer} />;
        }
      `),
    ).toBe(false);
  });

  it("le détecteur ignore un dépôt étranger aux échéances", () => {
    // Un dépôt de pièce sur une personne morale ne relève pas de la frontière.
    expect(
      depotNonGarde(`
        export function FormulairePrestataire() {
          return <EvidenceDropzone name="attestationUrssaf" />;
        }
      `),
    ).toBe(false);
  });

  it("le détecteur voit un champ de fichier écrit à la main", () => {
    // La liste des composants ne suffit pas : quelqu'un peut écrire l'input
    // directement, et la garantie ne doit pas dépendre du choix d'un import.
    expect(
      depotNonGarde(`
        export function FicheSalarie({ titre }) {
          return <input type="file" name="attestation" />;
        }
      `),
    ).toBe(true);
  });

  it("aucun fichier de src/ ne monte un dépôt non gardé", () => {
    const fautifs: string[] = [];

    for (const chemin of fichiersSource(join(RACINE, "src"))) {
      const rel = relative(RACINE, chemin).replace(/^src\//, "");
      if (DEROGATIONS.some((d) => d.fichier === rel)) continue;
      if (depotNonGarde(readFileSync(chemin, "utf8"))) fautifs.push(rel);
    }

    expect(
      fautifs,
      "Ce fichier monte un formulaire de dépôt de pièce sur une échéance sans que `pieceMedicale` y apparaisse. D'une pièce médicale, l'outil ne conserve que l'existence, la date et l'échéance — jamais le document (docs/rgpd.md § 2.3, ADR-023 § 2). Gardez le montage, ou ajoutez le fichier à `DEROGATIONS` en disant pourquoi aucune pièce médicale ne peut y passer.",
    ).toEqual([]);
  });

  it("le détecteur fort mord là où le premier laissait passer", () => {
    // Le cas réel, reproduit : un écran de salarié qui nomme `pieceMedicale`
    // pour son encart d'avertissement ET monte un dépôt. `depotNonGarde` le
    // laisse passer — c'est sa limite, annoncée. Le détecteur par chemin le
    // refuse.
    const source = `
      export function FormulaireTitre({ titre }: { titre: { pieceMedicale: boolean } }) {
        return (
          <form>
            {titre.pieceMedicale && <p>Ne déposez pas le document.</p>}
            <EvidenceDropzone name="attestation" />
          </form>
        );
      }
    `;
    expect(depotNonGarde(source)).toBe(false);
    expect(
      depotDansLeModuleSalarie("components/salaries/FormulaireTitre.tsx", source),
    ).toBe(true);
  });

  it("le détecteur fort laisse déposer un rapport de vérification", () => {
    // Une fiche de vérification nomme le salarié — il peut être porteur de
    // l'échéance — et monte légitimement le dépôt du rapport. La règle ne doit
    // pas l'atteindre, sans quoi il faudrait l'excepter, et une règle qu'on
    // excepte à tort finit exceptée partout.
    expect(
      depotDansLeModuleSalarie(
        "app/etablissements/[id]/verifications/[verificationId]/page.tsx",
        `<UploadRapportForm action={deposer} /> {verification.salarie?.nom}`,
      ),
    ).toBe(false);
  });

  it("aucun fichier du module salarié ne monte de dépôt", () => {
    const fautifs: string[] = [];

    for (const chemin of fichiersSource(join(RACINE, "src"))) {
      const rel = relative(RACINE, chemin).replace(/^src\//, "");
      if (depotDansLeModuleSalarie(rel, readFileSync(chemin, "utf8"))) {
        fautifs.push(rel);
      }
    }

    expect(
      fautifs,
      "Ce fichier monte une surface de dépôt de fichier dans le module du salarié. L'outil n'enregistre d'un titre que son existence et ses dates — jamais le document, médical ou non (docs/rgpd.md § 2.3, ADR-023 § 2). Il n'y a pas de dérogation à demander ici : retirez le dépôt.",
    ).toEqual([]);
  });

  it("chaque dérogation dit pourquoi, et son fichier existe", () => {
    // Une dérogation dont le fichier a disparu est une permission qui traîne,
    // et qui couvrira un jour un fichier neuf portant le même nom.
    for (const { fichier, raison } of DEROGATIONS) {
      expect(() => statSync(join(RACINE, "src", fichier)), fichier).not.toThrow();
      expect(raison.length, fichier).toBeGreaterThan(80);
    }
  });
});

describe("frontière médicale — le drapeau est une décision, pas un défaut", () => {
  /**
   * Ce que ce bloc NE fait pas, et pourquoi.
   *
   * Une première rédaction cherchait les mots « médical », « aptitude »,
   * « contre-indication » dans le libellé des obligations salarié pour deviner
   * lesquelles auraient dû porter le drapeau. C'était réintroduire exactement
   * l'inférence que ce référentiel refuse partout ailleurs — deviner d'après un
   * texte au lieu de faire trancher quelqu'un. Le brief l'a relevé, à raison.
   *
   * La garantie est désormais portée par le TYPE : `pieceMedicale` est requis
   * sur `ObligationPorteeParSalarie`. Une obligation salarié qui l'oublie ne
   * compile pas. C'est plus fort qu'un test, parce qu'aucune suite n'a besoin
   * de tourner pour que la faute soit visible.
   *
   * Restent deux choses qu'un compilateur ne dit pas, et que voici.
   */

  it("chaque obligation salarié a tranché, et la liste est lisible", () => {
    // Le test n'exige aucune valeur : il expose la décision prise pour chacune,
    // pour qu'une relecture porte sur une liste courte plutôt que sur un
    // fichier de référentiel. Quand les dix-huit autres arriveront, c'est ici
    // qu'on verra d'un coup d'œil qui a été qualifié de médical et qui non.
    const decisions = obligationsConformite
      .filter(estPorteeParSalarie)
      .map((o) => `${o.id} → pieceMedicale: ${o.pieceMedicale}`)
      .sort();

    // Quatorze au 2026-09-01, contre une seule avant le lot 7. C'est
    // précisément le moment que le commentaire ci-dessus annonçait — « quand
    // les dix-huit autres arriveront, c'est ici qu'on verra d'un coup d'œil
    // qui a été qualifié de médical et qui non ». Le voici, et la liste se lit
    // en deux blocs nets :
    //
    //  * `true` (7) — les visites et attestations du suivi médical, dont
    //    l'attestation d'absence de contre-indication qui conditionne
    //    l'habilitation électrique. Toutes délivrées par un médecin du travail
    //    ou un professionnel de santé au travail. L'outil n'en détient que
    //    l'existence, la date et l'échéance (docs/rgpd.md § 2.3), et le
    //    drapeau interdit à l'interface de proposer le téléversement de la
    //    pièce.
    //  * `false` (7) — les titres de COMPÉTENCE : formation à la sécurité,
    //    formation à la conduite, autorisation de conduite, certificat de
    //    sauveteur secouriste du travail, les deux formations santé-sécurité
    //    du lot 8, et l'habilitation électrique elle-même. Aucun n'atteste
    //    d'un état de santé.
    //
    // LA PAIRE À NE PAS CONFONDRE EST CELLE DE L'ÉLECTRICITÉ, et elle tombe des
    // deux côtés de la frontière : `elec-salarie-habilitation` (2026-09-01) est
    // le titre de compétence délivré par l'employeur au titre de `R. 4544-10`,
    // `elec-salarie-attestation-medicale-voisinage` est la pièce médicale de
    // `R. 4544-11-1` qui le conditionne. Deux obligations, deux drapeaux
    // opposés, un même domaine — c'est le cas d'école du champ.
    //
    // La frontière n'est ni devinée ni déduite d'un libellé : elle est tranchée
    // obligation par obligation, et `pieceMedicale` étant requis sur la variante
    // salarié, l'oubli ne compile pas.
    expect(decisions).toEqual([
      "conduite-salarie-attestation-medicale → pieceMedicale: true",
      "conduite-salarie-autorisation → pieceMedicale: false",
      "conduite-salarie-formation → pieceMedicale: false",
      "elec-salarie-attestation-medicale-voisinage → pieceMedicale: true",
      "elec-salarie-habilitation → pieceMedicale: false",
      "formation-securite-salarie-accueil → pieceMedicale: false",
      // Lot 8. Le mot « santé » est dans l'intitulé de la formation
      // (« santé, sécurité et conditions de travail ») et la pièce n'est pas
      // médicale pour autant : elle atteste d'une compétence acquise en stage,
      // pas d'un état de santé. C'est exactement le cas que `pieceMedicale`
      // existe pour faire trancher par quelqu'un plutôt que par un mot-clé.
      "formation-securite-salarie-cse-sst → pieceMedicale: false",
      "formation-securite-salarie-designe-competent → pieceMedicale: false",
      "sante-travail-salarie-sir → pieceMedicale: true",
      "sante-travail-salarie-sir-categorie-a → pieceMedicale: true",
      "sante-travail-salarie-sir-visite-intermediaire → pieceMedicale: true",
      "sante-travail-salarie-vip → pieceMedicale: true",
      "sante-travail-salarie-vip-adaptee → pieceMedicale: true",
      "secours-salarie-secouriste → pieceMedicale: false",
    ]);
  });

  it("le drapeau ne se pose que sur un porteur salarié", () => {
    // Le type le garantit déjà — `pieceMedicale` n'existe que sur cette
    // variante. Ce test le fige : si la variante changeait, un drapeau posé sur
    // une obligation d'équipement ne serait lu par personne, et la garde
    // retomberait en silence.
    const horsSujet = obligationsConformite
      .filter((o) => !estPorteeParSalarie(o))
      .filter((o) => "pieceMedicale" in o)
      .map((o) => o.id);

    expect(horsSujet).toEqual([]);
  });

  it("aucun modèle ne stocke le fichier d'une pièce de salarié", () => {
    // La meilleure des trois protections, parce qu'elle ne dépend d'aucune
    // vigilance : `TitreSalarie` n'a AUCUN champ de stockage, par construction
    // (ADR-023 § 2). Il porte l'existence, les dates et une note.
    //
    // Ce test lit le schéma Prisma pour que personne n'ajoute ce champ plus
    // tard en croyant combler un manque. Un `fichierCle` sur `TitreSalarie`
    // ferait tomber la garantie sans qu'aucun écran ne change.
    const schema = readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8");
    const modele = schema.match(/model TitreSalarie \{[^}]*\}/);
    expect(modele, "Le modèle `TitreSalarie` a disparu du schéma.").not.toBeNull();

    expect(
      /\b(cle|fichier|storage|url|piece|document|upload)\w*\s+String/i.test(
        modele![0],
      ),
      "`TitreSalarie` porte un champ qui ressemble à du stockage de fichier. D'une pièce médicale, l'outil ne conserve que l'existence, la date et l'échéance — jamais le document (docs/rgpd.md § 2.3, ADR-023 § 2). Si le besoin est réel, il rouvre la décision : il ne se comble pas par un champ.",
    ).toBe(false);
  });
});

describe("le nom d'un salarié ne sort pas du produit", () => {
  /**
   * Deux surfaces sortent du périmètre : le serveur MCP, qui alimente
   * l'assistant que l'utilisateur branche, et les documents imprimés remis à
   * un tiers (registre, dossier de conformité, export contrôle).
   *
   * Les deux ont fui, le même jour, pour la même raison : `libellePorteur` a
   * été écrit pour corriger un vrai défaut d'affichage — sept écrans disaient
   * « Tout l'établissement » sur la ligne d'une personne — et la correction,
   * juste dans le produit, a été appliquée telle quelle en sortie.
   *
   * Ce test tient la frontière par le SOURCE, comme celui de la frontière
   * médicale : le cas dangereux est celui qui n'existe pas encore.
   */
  /**
   * Les surfaces qui sortent du produit, désignées par leur EMPLACEMENT.
   *
   * La première version était une liste de trois fichiers en dur. Elle ratait
   * `api/etablissements/[id]/controle-zip/route.ts`, qui écrit trois fichiers
   * texte en clair hors des constructeurs de PDF — et une quatrième surface
   * n'y serait jamais entrée toute seule. Une liste que personne ne met à jour
   * n'est pas une garde, c'est une photographie.
   *
   * `app/api/` est ratissé LARGE, délibérément : mieux vaut inclure une route
   * qui n'en avait pas besoin et la déroger en disant pourquoi, que d'oublier
   * celle qui comptait. Les dérogations sont plus bas, et elles portent leur
   * raison.
   */
  const CHEMINS_SORTANTS = [
    /^lib\/mcp\//,
    /^lib\/pdf\//,
    /^app\/api\//,
    /^scripts\/mcp-server\.ts$/,
  ];

  /**
   * Les surfaces que la règle attrape et qui doivent pourtant nommer une
   * personne. **Il n'y en a qu'une, et sortir le nom EST sa raison d'être.**
   *
   * La règle posait `app/api/` comme « ce qui sort vers un tiers ». C'est faux
   * pour au moins une route : l'extraction de l'article 15 du RGPD s'adresse à
   * l'employeur, responsable de traitement, à propos de ses propres données —
   * pas à un tiers. Elle ne passait jusqu'ici que par accident : la fuite s'y
   * épelle `donnees.identite.prenom` et non `.salarie.nom`, et aucun des deux
   * motifs ne la voyait. Le jour où quelqu'un réécrit cet export en ligne, la
   * règle tombe sur une sortie parfaitement légitime — et la réparation
   * naturelle est d'excepter en silence, ce que le commentaire de
   * `CHEMINS_DU_SALARIE` décrit précisément comme à éviter.
   *
   * Mieux vaut donc l'excepter maintenant, en écrivant pourquoi.
   */
  const DEROGATIONS_SORTANTES: { fichier: string; raison: string }[] = [
    {
      fichier: "app/api/etablissements/[id]/equipe/[salarieId]/donnees/route.ts",
      raison:
        "C'est l'extraction de l'article 15 du RGPD — le droit d'accès de la personne suivie. Elle s'adresse à l'employeur, responsable de traitement, à propos d'une personne de son propre effectif : rendre le nom EST sa fonction, et un export anonyme ne répondrait à aucune demande. La portée de tenancy est vérifiée deux fois (`requireEtablissement`, puis `where` sur les deux clés) et la réponse porte `Cache-Control: no-store`.",
    },
  ];

  function surfacesSortantes(): { abs: string; rel: string }[] {
    // `scripts/` en plus de `src/` : le point d'entrée stdio du serveur MCP y
    // vit, et la règle prétendait le couvrir alors qu'aucun chemin produit ne
    // pouvait commencer par `scripts/` — le motif était mort depuis sa
    // naissance, dans le commit même qui remplaçait une liste en dur au motif
    // qu'« une liste que personne ne met à jour n'est pas une garde ».
    const fichiers = [
      ...fichiersSource(join(RACINE, "src")),
      ...fichiersSource(join(RACINE, "scripts")),
    ].map((abs) => ({
      abs,
      // Nom d'affichage : `src/` retiré, `scripts/` conservé — c'est ce que
      // portent `CHEMINS_SORTANTS` et les dérogations.
      rel: relative(RACINE, abs).replace(/^src\//, ""),
    }));
    const derogees = new Set(DEROGATIONS_SORTANTES.map((d) => d.fichier));
    return fichiers.filter(
      ({ rel }) =>
        CHEMINS_SORTANTS.some((r) => r.test(rel)) && !derogees.has(rel),
    );
  }

  it("les surfaces sortantes n'emploient pas le libellé nominatif", () => {
    const fautives: string[] = [];
    for (const { abs, rel } of surfacesSortantes()) {
      const source = readFileSync(abs, "utf8");
      // `libellePorteurSansNom` contient `libellePorteur` : on cherche donc
      // l'appel nominatif seul, pas la sous-chaîne.
      if (/\blibellePorteur\s*\(/.test(source)) fautives.push(rel);
      // Et la construction à la main, que ni l'un ni l'autre motif n'attrape.
      if (/\.salarie[?]?\.(nom|prenom)\b/.test(source)) fautives.push(rel);
    }

    expect(
      fautives,
      "Cette surface sort du produit — serveur MCP ou document remis à un tiers — et emploie `libellePorteur`, qui nomme la personne. Utilisez `libellePorteurSansNom` : savoir qu'une attestation expire ne demande pas de savoir de qui (docs/rgpd.md § 6).",
    ).toEqual([]);
  });

  it("le point d'entrée du serveur MCP est réellement balayé", () => {
    // La règle annonçait couvrir `scripts/mcp-server.ts` par un motif qui ne
    // pouvait rien matcher : le balayage ne parcourait que `src/` et retirait
    // ce préfixe, donc aucun chemin produit ne commençait par `scripts/`. Le
    // motif était mort depuis sa naissance, et donnait l'assurance ÉCRITE que
    // le point d'entrée stdio du MCP était surveillé.
    //
    // Une garde dont la couverture annoncée dépasse la couverture réelle est
    // pire qu'une garde absente : elle dispense de vigilance.
    const balayes = surfacesSortantes().map((f) => f.rel);
    expect(balayes).toContain("scripts/mcp-server.ts");
  });

  it("chaque dérogation sortante dit pourquoi, et son fichier existe", () => {
    // Même exigence que les dérogations de la frontière médicale : une
    // dérogation dont le fichier a disparu est une permission qui traîne, et
    // qui couvrira un jour un fichier neuf portant le même nom.
    for (const { fichier, raison } of DEROGATIONS_SORTANTES) {
      // Le préfixe suit la convention de `rel` : `src/` retiré, `scripts/`
      // conservé. Coder `join(RACINE, "src", fichier)` en dur ferait échouer à
      // tort une future dérogation sous `scripts/` — le répertoire que le
      // balayage vient justement d'apprendre à parcourir.
      const abs = fichier.startsWith("scripts/")
        ? join(RACINE, fichier)
        : join(RACINE, "src", fichier);
      expect(() => statSync(abs), fichier).not.toThrow();
      expect(raison.length, fichier).toBeGreaterThan(120);
    }
  });

  it("la seule dérogation est l'extraction de l'article 15", () => {
    // Le fond de l'affaire : `app/api/` est ratissé large parce qu'on ne sait
    // pas d'avance quelle route produira un document pour un tiers. Une seule
    // y échappe, et c'est celle dont sortir le nom EST la fonction. Si une
    // seconde apparaît, ce test tombe — et c'est le bon moment pour se
    // demander si la règle n'est pas en train de se vider.
    expect(DEROGATIONS_SORTANTES.map((d) => d.fichier)).toEqual([
      "app/api/etablissements/[id]/equipe/[salarieId]/donnees/route.ts",
    ]);
  });

  it("aucune surface sortante ne sélectionne le nom d'un salarié", () => {
    const fautives: string[] = [];
    for (const { abs, rel } of surfacesSortantes()) {
      const source = readFileSync(abs, "utf8");
      if (/salarie:\s*\{\s*select/.test(source)) fautives.push(rel);
    }

    expect(
      fautives,
      "Cette surface sortante sélectionne des champs de `Salarie`. Sélectionnez `salarieId` seul : il dit qu'un porteur existe sans nommer la personne.",
    ).toEqual([]);
  });
});

/**
 * Retire commentaires de ligne et de bloc — en connaissant les chaînes et les
 * littéraux d'expression régulière.
 *
 * La première version était un couple de `replace`, avec un garde `[^:]` censé
 * épargner `https://`. Elle neutralisait du vrai code, et la preuve était dans
 * un fichier surveillé : `lib/mcp/hotes.ts` contient
 * `valeur.replace(/^https?:\/\//, "")`, dont le littéral se termine par `\/`
 * suivi du `/` fermant. Le `//` ainsi formé n'est précédé d'aucun `:` : le
 * garde le laissait passer, et tout ce qui suivait sur la ligne disparaissait.
 * Une lecture écrite après ce `replace`, sur la même ligne, serait donc passée
 * au vert.
 *
 * D'où un vrai balayage : on suit l'état — code, chaîne simple, double,
 * gabarit, littéral d'expression régulière, commentaire — au lieu de deviner
 * par le voisinage. La détection d'un littéral d'expression régulière emploie
 * l'heuristique usuelle : un `/` en ouvre un quand le dernier caractère
 * significatif ne peut pas terminer une expression.
 */
const PEUT_PRECEDER_UNE_REGEX = /[(,=:[!&|?{};+\-*%~^<>]|^$/;

export function sansCommentaires(source: string): string {
  let sortie = "";
  let precedent = "";
  let i = 0;

  /** Avale une séquence délimitée en gérant l'échappement, et la recopie. */
  function avaler(fin: string): void {
    sortie += source[i];
    i++;
    while (i < source.length) {
      const c = source[i];
      if (c === "\\") {
        sortie += source.slice(i, i + 2);
        i += 2;
        continue;
      }
      sortie += c;
      i++;
      if (c === fin) return;
      // Une expression régulière ne franchit pas la fin de ligne : sans cette
      // sortie, un opérateur de division pris pour une ouverture avalerait
      // tout le reste du fichier.
      if (fin === "/" && c === "\n") return;
    }
  }

  while (i < source.length) {
    const c = source[i];
    const d = source[i + 1];

    if (c === "/" && d === "/") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }
    if (c === "/" && d === "*") {
      i += 2;
      while (i < source.length && !(source[i] === "*" && source[i + 1] === "/")) i++;
      i += 2;
      sortie += " ";
      continue;
    }
    if (c === '"' || c === "'" || c === "`") {
      avaler(c);
      precedent = c;
      continue;
    }
    if (c === "/" && PEUT_PRECEDER_UNE_REGEX.test(precedent)) {
      avaler("/");
      precedent = "/";
      continue;
    }

    sortie += c;
    if (!/\s/.test(c)) precedent = c;
    i++;
  }

  return sortie;
}

/**
 * Les blocs `{...}` équilibrés qui suivent un appel de lecture Prisma.
 *
 * Sert à juger la FORME d'une requête, là où chercher un nom de champ ne peut
 * rien voir : une requête sans `select` rend tous les scalaires du modèle, et
 * un `include` rend en plus tous ceux de la relation ouverte. Aucun jeton du
 * champ n'apparaît alors dans le source.
 */
export function requetesDeLecture(source: string): string[] {
  const code = sansCommentaires(source);
  const appel = /\.(findMany|findFirst|findUnique|findFirstOrThrow|findUniqueOrThrow)\s*\(\s*\{/g;
  const blocs: string[] = [];
  let m: RegExpExecArray | null;

  while ((m = appel.exec(code)) !== null) {
    let profondeur = 1;
    let j = m.index + m[0].length;
    while (j < code.length && profondeur > 0) {
      const c = code[j];
      // Même précaution que dans `clesDirectes` : une accolade entre
      // guillemets refermerait le bloc trop tôt, et tout ce qui suit — le
      // `select`, par exemple — deviendrait invisible.
      if (c === '"' || c === "'" || c === "`") {
        const fin = c;
        j++;
        while (j < code.length) {
          if (code[j] === "\\") j += 2;
          else if (code[j] === fin) break;
          else j++;
        }
      } else if (c === "{") profondeur++;
      else if (c === "}") profondeur--;
      j++;
    }
    blocs.push(code.slice(m.index, j));
    appel.lastIndex = j;
  }
  return blocs;
}

/**
 * Les clés directes d'un objet littéral, avec leur valeur brute.
 *
 * Le comptage d'accolades ignore ce qui vit dans une chaîne : `sansCommentaires`
 * est passé avant, mais une accolade entre guillemets fausserait la profondeur.
 */
function clesDirectes(objet: string): { cle: string; valeur: string }[] {
  const paires: { cle: string; valeur: string }[] = [];
  let i = objet.indexOf("{") + 1;
  let profondeur = 0;
  let cle: string | null = null;
  let debut = i;

  const pousser = (fin: number) => {
    if (cle !== null) paires.push({ cle, valeur: objet.slice(debut, fin).trim() });
    cle = null;
  };

  while (i < objet.length) {
    const c = objet[i];
    // Une accolade entre guillemets n'est pas une accolade. Sans ce saut,
    // `note: "x}y"` refermait l'objet et rendait muettes toutes les clés
    // suivantes — un faux vert, la pire des deux erreurs.
    if (c === '"' || c === "'" || c === "`") {
      const fin = c;
      i++;
      while (i < objet.length) {
        if (objet[i] === "\\") i += 2;
        else if (objet[i] === fin) break;
        else i++;
      }
      i++;
      continue;
    }
    if (c === "{" || c === "[" || c === "(") profondeur++;
    else if (c === "}" || c === "]" || c === ")") {
      if (profondeur === 0) {
        pousser(i);
        break;
      }
      profondeur--;
    } else if (profondeur === 0) {
      if (c === "." && objet.slice(i, i + 3) === "..." && cle === null) {
        // Une diffusion n'a pas de clé, donc n'émettrait aucune paire — et
        // l'objet diffusé peut contenir n'importe quoi, relations comprises.
        // Elle est signalée pour que l'appelant la refuse.
        paires.push({ cle: "…diffusion", valeur: "" });
        i += 3;
        continue;
      }
      if (c === ":" && cle === null) {
        const avant = objet.slice(0, i);
        const m = /([A-Za-z_$][\w$]*)\s*$/.exec(avant);
        cle = m ? m[1] : "";
        debut = i + 1;
      } else if (c === "," && cle !== null) {
        pousser(i);
      }
    }
    i++;
  }
  return paires;
}

/**
 * Les noms de champs SCALAIRES, lus dans le schéma Prisma.
 *
 * La première version faisait l'inverse : elle listait les relations, et
 * refusait `X: true` quand `X` en était une. Cette polarité échoue OUVERTE.
 * Toute lacune d'analyse — un `model` indenté, un champ écrit dans une
 * graphie non prévue — retire un nom de l'ensemble, et le `X: true`
 * correspondant passe alors au vert. C'est ce qu'a montré la revue : en
 * indentant `model Prestataire {` d'un espace, le schéma reste valide pour
 * `prisma validate`, l'ensemble tombe de 43 à 41, la suite reste verte, et
 * `select: { prestataires: true }` devient acceptable dans `lib/mcp/`.
 *
 * La polarité est donc renversée : `X: true` n'est accepté que si `X` est un
 * scalaire RECONNU — type primitif Prisma ou énumération déclarée. Tout ce
 * que l'analyse ne comprend pas devient un refus, donc un rouge bruyant, au
 * lieu d'un vert muet. C'est la dissymétrie appliquée partout ailleurs dans
 * ce fichier : le pire échec possible doit être le faux rouge.
 *
 * Un cliquet sur le nombre de relations aurait fermé l'autre moitié seulement.
 * Il aurait vu ce cas — le compte baisse — mais pas une relation AJOUTÉE dans
 * une graphie non reconnue : le compte ne bouge pas. Et son plancher se relève
 * à la main précisément quand on ajoute des relations, c'est-à-dire au seul
 * moment où une relation invisible est indiscernable.
 */
const TYPES_PRIMITIFS = new Set([
  "String",
  "Boolean",
  "Int",
  "BigInt",
  "Float",
  "Decimal",
  "DateTime",
  "Json",
  "Bytes",
]);

export function champsScalaires(schema: string): Set<string> {
  // `^\s*` et non `^` : une déclaration indentée est du Prisma valide, et
  // c'est l'ancrage strict qui a ouvert la faille.
  const enums = new Set(
    [...schema.matchAll(/^\s*enum\s+(\w+)\s*\{/gm)].map((m) => m[1]),
  );

  // L'ensemble est indexé par NOM de champ, pas par (modèle, champ) : la garde
  // lit du texte, elle ne sait pas de quel modèle part une requête. Un nom
  // porté à la fois par un scalaire et par une relation serait donc « sauvé »
  // par son homonyme, et `X: true` accepté là où X est une relation. Le schéma
  // en compte deux aujourd'hui — `risque` (String ici, relation `Risque?`
  // ailleurs) et `commentaires` (String? ici, relation ailleurs) —, et
  // `Action.risque` EST une relation que `lib/mcp/` interroge.
  //
  // Un nom est donc scalaire seulement s'il n'est JAMAIS déclaré autrement.
  // Une déclaration dont le type n'est ni primitif ni énuméré le disqualifie,
  // qu'il s'agisse d'une relation ou d'un type que l'analyse n'a pas su lire —
  // la même polarité que le reste : le doute exclut.
  const scalaires = new Set<string>();
  const disqualifies = new Set<string>();
  for (const ligne of schema.split("\n")) {
    const m = /^\s+(\w+)\s+(\w+)(\[\])?\??/.exec(ligne);
    if (!m) continue;
    if (TYPES_PRIMITIFS.has(m[2]) || enums.has(m[2])) scalaires.add(m[1]);
    else disqualifies.add(m[1]);
  }
  for (const nom of disqualifies) scalaires.delete(nom);
  return scalaires;
}

/**
 * Une requête qui rend plus que ce qu'elle nomme, à N'IMPORTE quel niveau.
 *
 * La première version cherchait `select:` **quelque part** dans le bloc. Une
 * relation imbriquée sans `select` propre la satisfaisait donc, tout en
 * ramenant tous les scalaires de la relation — exactement ce que faisait
 * `include`. Le défaut d'origine se réécrivait à l'identique sous garde verte,
 * et sous la graphie la plus naturelle pour qui vient de lire « pas
 * d'`include`, mets un `select` » :
 *
 *   select: { versions: { orderBy: { numero: "desc" }, take: 1 } }
 *
 * Deux formes sont donc refusées, à chaque niveau : un bloc de relation qui ne
 * porte pas SON `select`, et une relation prise en bloc par `true`.
 *
 * `_count` fait exception et ne se descend pas : `_count: { select: { x: true } }`
 * compte, il ne sélectionne rien.
 */
export function relationsNonNommees(
  bloc: string,
  scalaires: Set<string>,
): string[] {
  if (/\binclude\s*:/.test(bloc)) return ["include"];

  const fautes: string[] = [];

  function descendre(objetSelect: string, chemin: string): void {
    for (const { cle, valeur } of clesDirectes(objetSelect)) {
      // `_count` ne se descend pas : sa charge utile ne rend que des nombres,
      // quel que soit le filtre imbriqué, et aucun modèle ne peut porter un
      // champ de ce nom — un champ Prisma commence par une lettre.
      if (cle === "_count") continue;
      const ici = chemin ? `${chemin}.${cle}` : cle;

      if (valeur.startsWith("{")) {
        const sien = clesDirectes(valeur).find((p) => p.cle === "select");
        if (!sien) fautes.push(ici);
        else descendre(sien.valeur, ici);
      } else if (!(/^true\b/.test(valeur) && scalaires.has(cle))) {
        // Tout le reste est refusé : une relation prise en bloc, une valeur
        // qu'on ne sait pas lire (variable, diffusion, clé calculée, clé entre
        // guillemets, ternaire), un nom que l'analyse du schéma n'a pas
        // reconnu. Chacun de ces cas peut cacher une relation entière.
        fautes.push(ici || "(clé illisible)");
      }
    }
  }

  const racine = clesDirectes(bloc).find((p) => p.cle === "select");
  if (!racine) return ["(requête sans select)"];
  descendre(racine.valeur, "");
  return fautes;
}

/**
 * Lire un champ, sous les formes qu'on écrit vraiment.
 *
 * La première version n'en connaissait que deux — le déréférencement pointé et
 * `champ: true` sans espace. Quatre autres passaient au vert en lisant
 * pourtant le champ ; elles sont couvertes ici, et la plus banale de toutes —
 * une requête sans `select` — ne relève pas du tout de cette fonction mais de
 * `requeteTropLarge`, parce qu'aucun nom de champ n'y figure.
 */
export function litChampNominatif(source: string, champ: string): boolean {
  const code = sansCommentaires(source);
  const formes = [
    `\\.${champ}\\b`,
    `\\[\\s*["'\`]${champ}["'\`]\\s*\\]`,
    `\\b${champ}\\s*:\\s*true\\b`,
    `\\{[^{}]*\\b${champ}\\b[^{}]*\\}\\s*=`,
  ];
  return new RegExp(formes.join("|")).test(code);
}

describe("les noms saisis en texte libre ne partent ni vers un assistant ni vers un tiers", () => {
  /**
   * Deux champs de texte libre où l'utilisateur écrit le nom d'une personne :
   * `Action.responsable` (qui pilote une action corrective) et
   * `ReleveTemperature.operateur` (qui a fait le relevé d'eau chaude).
   *
   * Ils ne relèvent pas de la frontière médicale, et pas non plus du nom du
   * salarié : personne ne les dérive d'un modèle, c'est l'employeur qui les
   * tape. Mais ils sortaient par les deux mêmes portes, et la décision du
   * 2026-08-28 ne les traite pas pareil, parce que les destinataires diffèrent.
   *
   * — `responsable` reste dans les documents que l'employeur remet lui-même
   *   (PDF du plan d'actions, dossier de conformité, DUERP) : un plan
   *   d'actions sans porteur nommé perd sa fonction. Il sort du **MCP**, seule
   *   surface qui parte vers un tiers que l'utilisateur ne maîtrise pas —
   *   l'assistant qu'il branche. Un nom lu là part vers un LLM par défaut,
   *   contre le principe fondateur « zéro IA sur le contenu utilisateur ».
   *
   * — `operateur` sortait de l'**export ZIP**, remis « à un inspecteur, un
   *   assureur, un bailleur ou un acquéreur ». Aucun texte ne l'exige :
   *   l'article 3 de l'arrêté du 1er février 2010 demande de consigner « les
   *   modalités et les résultats » dans un fichier sanitaire tenu à
   *   disposition de l'ARS. `D. 4711-2` ne vise que la santé-sécurité AU
   *   TRAVAIL et ne couvre ni l'un ni l'autre (docs/rgpd.md § 2.4).
   *
   * La règle porte sur la LECTURE du champ, pas sur son affichage : ce qui
   * n'est pas lu ne peut pas ressortir par une colonne ajoutée plus tard.
   */
  const CHAMPS_LIBRES: { champ: string; chemins: RegExp[]; message: string }[] = [
    {
      champ: "responsable",
      chemins: [/^lib\/mcp\//, /^scripts\/mcp-server\.ts$/],
      message:
        "Le serveur MCP lit `Action.responsable`. Ce champ porte le nom d'une " +
        "personne et le MCP alimente un assistant tiers : ne le sélectionnez pas " +
        "(docs/rgpd.md § 2.5). Il reste rendu dans les PDF que l'employeur remet.",
    },
    {
      champ: "operateur",
      // `lib/controle/` : les lectures du ZIP y vivent depuis le 2026-10-14
      // (audit Next.js, B6) — la règle les suit.
      chemins: [/^app\/api\//, /^lib\/controle\//],
      message:
        "Une route d'API lit `ReleveTemperature.operateur`. Ce champ porte le nom " +
        "de qui a fait le relevé, et l'export part vers un tiers. Aucun texte ne " +
        "l'exige (docs/rgpd.md § 2.5) : sélectionnez la date, la température et la " +
        "conformité.",
    },
  ];

  /**
   * Là où une requête doit nommer ce qu'elle lit.
   *
   * Restreint au MCP : c'est la surface qui part vers un tiers non maîtrisé, et
   * la seule où « rendre un champ de trop » a un destinataire. Étendre la règle
   * à tout `app/api/` obligerait des routes internes à énumérer des dizaines de
   * colonnes sans rien protéger — et une règle qu'on excepte partout finit par
   * ne plus être lue.
   */
  const CHEMINS_REQUETE_NOMMEE = [/^lib\/mcp\//, /^scripts\/mcp-server\.ts$/];

  function sources(): { abs: string; rel: string }[] {
    return [
      ...fichiersSource(join(RACINE, "src")),
      ...fichiersSource(join(RACINE, "scripts")),
    ].map((abs) => ({ abs, rel: relative(RACINE, abs).replace(/^src\//, "") }));
  }

  it("le retrait des commentaires épargne chaînes et expressions régulières", () => {
    // Le cas réel, celui qui a fait tomber la première version : le littéral
    // de `lib/mcp/hotes.ts` se termine par `\/` suivi du `/` fermant.
    const vrai = 'return valeur.replace(/^https?:\\/\\//, "").split("/")[0];';
    expect(sansCommentaires(vrai)).toBe(vrai);

    // Et une lecture écrite après ce `replace`, sur la même ligne, survit.
    expect(
      litChampNominatif(
        'const q = { hote: u.replace(/^https?:\\/\\//, ""), pilote: a.responsable };',
        "responsable",
      ),
    ).toBe(true);

    // Une URL dans une chaîne n'est pas un commentaire.
    expect(sansCommentaires('const u = "http://x/y";')).toBe('const u = "http://x/y";');

    // Un vrai commentaire, lui, s'en va.
    expect(sansCommentaires("const x = 1; // a.responsable\n").trim()).toBe("const x = 1;");
    expect(sansCommentaires("/* a.responsable */ const x = 1;").trim()).toBe("const x = 1;");
  });

  it("le détecteur connaît les formes sous lesquelles on lit un champ", () => {
    for (const forme of [
      "const x = a.responsable;",
      'const x = a["responsable"];',
      "select: { responsable: true }",
      "select: { responsable : true }",
      "const { responsable } = action;",
      "const { libelle, responsable, statut } = action;",
    ]) {
      expect(litChampNominatif(forme, "responsable"), forme).toBe(true);
    }

    // Et il ne mord pas l'explication de l'absence — chacun des deux fichiers
    // surveillés en porte une.
    expect(
      litChampNominatif(
        "// `Action.responsable` n'est PAS sélectionné, et c'est délibéré.\nconst x = 1;",
        "responsable",
      ),
    ).toBe(false);
  });

  it("le juge de forme voit une requête qui rend plus qu'elle ne nomme", () => {
    const SCALAIRES = new Set([
      "numero",
      "createdAt",
      "nom",
      "libelle",
      "effectif",
    ]);
    const juger = (src: string) =>
      requetesDeLecture(src).flatMap((b) => relationsNonNommees(b, SCALAIRES));

    // La forme la plus banale, et celle qu'aucune recherche de nom ne peut
    // voir : sans `select`, Prisma rend tous les scalaires du modèle.
    expect(
      juger("await prisma.action.findMany({ where: { etablissementId } });"),
    ).toEqual(["(requête sans select)"]);

    // `include` rend en plus tous ceux de la relation ouverte.
    expect(
      juger(
        "await prisma.duerp.findFirst({ where: { id }, include: { versions: { take: 1 } } });",
      ),
    ).toEqual(["include"]);

    // LE CAS QUI PASSAIT AU VERT, et qui a rouvert le défaut d'origine : un
    // `select` à la racine, une relation imbriquée sans le sien. Prisma rend
    // alors la ligne `DuerpVersion` entière, `snapshot` comprise.
    expect(
      juger(
        'await prisma.duerp.findFirst({ where: { id }, select: { versions: { orderBy: { numero: "desc" }, take: 1 } } });',
      ),
    ).toEqual(["versions"]);

    // Sa variante courte, qui passait aussi.
    expect(
      juger("await prisma.duerp.findFirst({ select: { versions: true } });"),
    ).toEqual(["versions"]);

    // Le défaut se voit à n'importe quelle profondeur.
    expect(
      juger(
        "await prisma.duerp.findFirst({ select: { unites: { select: { nom: true, risques: { take: 3 } } } } });",
      ),
    ).toEqual(["unites.risques"]);

    // Une requête qui nomme ce qu'elle lit, à tous les niveaux, passe.
    expect(
      juger(
        'await prisma.duerp.findFirst({ where: { id }, select: { versions: { orderBy: { numero: "desc" }, take: 1, select: { numero: true, createdAt: true } } } });',
      ),
    ).toEqual([]);

    // `_count` ne se descend pas : il compte, il ne sélectionne rien — et sa
    // clé porte justement un nom de relation.
    expect(
      juger(
        "await prisma.duerp.findFirst({ select: { unites: { select: { nom: true, _count: { select: { risques: true } } } } } });",
      ),
    ).toEqual([]);

    // Un scalaire reconnu reste sélectionnable par `true`.
    expect(
      juger("await prisma.duerp.findFirst({ select: { libelle: true } });"),
    ).toEqual([]);

    // LA POLARITÉ, éprouvée : ce que l'analyse ne reconnaît pas est REFUSÉ.
    // C'est ce qui rend la garde insensible à une lacune du parse du schéma —
    // le `model` indenté qui a fait tomber la version précédente donne
    // désormais un rouge, pas un vert.
    expect(
      juger("await prisma.duerp.findFirst({ select: { prestataires: true } });"),
    ).toEqual(["prestataires"]);

    // Les cinq formes héritées que la revue signale comme passant au vert :
    // chacune peut cacher une relation entière, chacune est maintenant refusée.
    for (const [nom, src] of [
      ["variable", "prisma.duerp.findFirst({ select: { versions: argsVersions } });"],
      ["diffusion", "prisma.duerp.findFirst({ select: { ...CHAMPS, nom: true } });"],
      ["clé entre guillemets", 'prisma.duerp.findFirst({ select: { "versions": true } });'],
      ["clé calculée", 'prisma.duerp.findFirst({ select: { ["versions"]: true } });'],
      ["ternaire", "prisma.duerp.findFirst({ select: { versions: x ? a : b } });"],
    ] as const) {
      expect(juger(`await ${src}`).length, nom).toBeGreaterThan(0);
    }

    // Une accolade fermante dans une chaîne ne tronque plus la lecture des
    // clés : sans ce cas, `versions: true` devenait invisible après elle.
    expect(
      juger(
        'await prisma.duerp.findFirst({ select: { nom: true, note: "x}y", versions: true } });',
      ),
    ).toContain("versions");

    // Les blocs imbriqués ne trompent pas le compteur d'accolades.
    expect(
      requetesDeLecture(
        "await prisma.duerp.findFirst({ select: { unites: { select: { nom: true } } } });",
      ),
    ).toHaveLength(1);
  });

  it("les scalaires sont lus dans le schéma Prisma, et une relation n'en est pas", () => {
    const schema = readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8");
    const scalaires = champsScalaires(schema);

    for (const attendu of ["libelle", "createdAt", "numero", "nom", "statut"]) {
      expect(scalaires.has(attendu), attendu).toBe(true);
    }
    // Une relation n'est pas un scalaire : `X: true` y sera donc refusé.
    for (const relation of ["versions", "unites", "risques", "releves"]) {
      expect(scalaires.has(relation), relation).toBe(false);
    }

    // Et un nom porté à la fois par un scalaire et par une relation est
    // disqualifié — sinon l'homonyme scalaire ferait accepter `risque: true`
    // là où `Action.risque` est une relation que le MCP interroge.
    for (const ambigu of ["risque", "commentaires"]) {
      expect(scalaires.has(ambigu), ambigu).toBe(false);
    }
  });

  it("un nom scalaire quelque part et relation ailleurs est refusé", () => {
    const schema = [
      "model Risque {",
      "  id String @id",
      "  libelle String",
      "}",
      "model Action {",
      "  risque Risque? @relation(fields: [risqueId], references: [id])",
      "}",
      "model Rapport {",
      "  risque String",
      "}",
    ].join("\n");
    const scalaires = champsScalaires(schema);

    expect(scalaires.has("risque")).toBe(false);
    expect(
      requetesDeLecture(
        "await prisma.action.findMany({ select: { risque: true } });",
      ).flatMap((b) => relationsNonNommees(b, scalaires)),
    ).toEqual(["risque"]);
  });

  it("une déclaration indentée ne fait plus tomber la garde du bon côté", () => {
    // Le cas exact de la revue, reproduit sur un schéma fabriqué : indenter
    // `model` d'un espace reste du Prisma valide. L'ancienne polarité y
    // perdait la relation et laissait passer `prestataires: true` ; la
    // nouvelle ne reconnaît simplement pas le nom, et refuse.
    const schema = [
      " model Prestataire {",
      "  id String @id",
      "  libelle String",
      " }",
      "model Etablissement {",
      "  prestataires Prestataire[]",
      "  raison String",
      "}",
    ].join("\n");
    const scalaires = champsScalaires(schema);

    expect(scalaires.has("prestataires")).toBe(false);
    expect(
      requetesDeLecture(
        "await prisma.etablissement.findFirst({ select: { prestataires: true } });",
      ).flatMap((b) => relationsNonNommees(b, scalaires)),
    ).toEqual(["prestataires"]);
  });

  it("aucune surface interdite ne lit ces champs", () => {
    const fautifs: string[] = [];
    for (const { champ, chemins, message } of CHAMPS_LIBRES) {
      for (const { abs, rel } of sources()) {
        if (!chemins.some((r) => r.test(rel))) continue;
        if (litChampNominatif(readFileSync(abs, "utf8"), champ)) {
          fautifs.push(`${rel} → ${champ} — ${message}`);
        }
      }
    }
    expect(fautifs).toEqual([]);
  });

  it("les requêtes du MCP nomment ce qu'elles lisent, à chaque niveau", () => {
    const scalaires = champsScalaires(
      readFileSync(join(RACINE, "prisma", "schema.prisma"), "utf8"),
    );
    const fautives: string[] = [];

    for (const { abs, rel } of sources()) {
      if (!CHEMINS_REQUETE_NOMMEE.some((r) => r.test(rel))) continue;
      for (const bloc of requetesDeLecture(readFileSync(abs, "utf8"))) {
        for (const faute of relationsNonNommees(bloc, scalaires)) {
          fautives.push(`${rel} → ${faute}`);
        }
      }
    }

    expect(
      fautives,
      "Cette requête du MCP emploie `include`, ou laisse une relation sans son " +
        "propre `select` : elle rend donc des colonnes que personne n'a demandées. " +
        "C'est ainsi que `DuerpVersion.snapshot` — qui porte le `responsable` de " +
        "chaque mesure — revenait dans le serveur MCP sans qu'aucun nom de champ " +
        "n'apparaisse dans le source. Un `select` à la racine ne suffit pas : " +
        "chaque relation ouverte porte le sien. Et seul un scalaire reconnu du " +
        "schéma s'écrit `X: true` — une valeur que cette garde ne sait pas lire " +
        "est refusée plutôt qu'admise, parce qu'elle peut cacher une relation " +
        "entière (docs/rgpd.md § 2.5).",
    ).toEqual([]);
  });

  it("les chemins surveillés désignent des fichiers qui existent", () => {
    // Un motif de chemin qui ne matche rien est une garde morte : elle donne
    // l'assurance écrite d'une surveillance qui ne s'exerce sur rien. C'est
    // exactement le défaut corrigé plus haut sur `scripts/mcp-server.ts`.
    const rels = sources().map((f) => f.rel);
    const motifs = [
      ...CHAMPS_LIBRES.flatMap((c) => c.chemins),
      ...CHEMINS_REQUETE_NOMMEE,
    ];
    for (const motif of motifs) {
      expect(
        rels.some((r) => motif.test(r)),
        `le motif ${motif} ne désigne aucun fichier`,
      ).toBe(true);
    }
  });
});
