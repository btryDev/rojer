// Rojer calcule, il n'avise pas. Aucune sortie ne qualifie juridiquement un
// état, un document ou un référentiel — charte, interdits 16 et 17.
//
// POURQUOI CE TEST EXISTE. Les tests anti-verdict du dépôt (`couverture`,
// `documents-obligatoires`) gardent chacun LEUR sortie. Tout le reste passait :
// le 2026-09-26, une recherche a trouvé « opposable par votre contrat — pas par
// le droit » sur trois surfaces, « opposables » dans le dossier de conformité
// et dans le guide, « fait foi » sur la fiche d'un permis de feu, « exigée par
// les assureurs » dans le ZIP remis au contrôleur. Chacun était écrit de bonne
// foi, et se lisait comme un avis que le produit n'a pas qualité à donner.
//
// CE QUE LE BALAYAGE REGARDE : tout ce qui s'affiche ou s'imprime — `src/app`,
// `src/components`, `src/lib` (PDF, ZIP, README, MCP, libellés) et le serveur
// MCP de `scripts/`. Les commentaires sont exclus : ils racontent une
// décision, le dirigeant ne les lit pas.
//
// CE QU'IL NE REGARDE PAS, et pourquoi :
// - `src/lib/referentiels/conformite/` : le référentiel est scellé ; ses notes
//   s'y corrigent avec une montée de version, pas ici. Ce qu'elles portent
//   encore est relevé au journal (C32), pour décision.
// - `src/lib/referentiels/corpus/` : les motifs et réserves de lecture sont le
//   carnet du dépouilleur, lus par un relecteur, pas par le dirigeant.
// - « conforme » : c'est aussi le nom d'une valeur de résultat de rapport
//   (`conforme`, `realisee_conforme`), donc un identifiant partout dans le code.
//   Un motif qui le chercherait accuserait chaque accès de champ. Les libellés
//   « Conforme » sont relevés au journal (C32) — ce qu'un vérificateur écrit
//   dans son rapport, affiché seul, est une décision de vocabulaire.

import { readFileSync, readdirSync, statSync } from "node:fs";
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const RACINE = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

// Frontières UNICODE : `\b` est ASCII en JavaScript, même avec le drapeau `u`
// — il voyait une frontière au milieu de « opposabilité » (contre-lecture du
// 2026-09-26). Un mot commence et finit là où ni lettre, ni chiffre, ni `_`.
const D = String.raw`(?<![\p{L}\p{N}_])`;
const F = String.raw`(?![\p{L}\p{N}_])`;
const mot = (corps: string) => new RegExp(`${D}(?:${corps})${F}`, "giu");

const RACINE_ENVOI = String.raw`(?:envo[iy]\p{L}*|enverr\p{L}*|notifi\p{L}*|rappel\p{L}*|alert\p{L}*|prévien\p{L}*|préviendr\p{L}*|(?:recev|recevr|reç)\p{L}*(?!\s+(?:du|le|au)\s+public))`;
const SUJET = String.raw`(?:vous|nous|il|elle|ils|elles|on|rojer|la\s+plateforme|l'application|le\s+destinataire|le\s+signataire|le\s+prestataire)`;
const PRONOM = String.raw`(?:vous|lui|leur|les|en)\s+`;
const ENVOI_PROMIS = mot(
  [
    String.raw`(?<!(?:^|[^\p{L}])ne\s+)${SUJET}\s+(?:${PRONOM})?(?:va|vont|allons|allez|pourr\p{L}*|ser\p{L}*)?\s*(?:${PRONOM})?${RACINE_ENVOI}`,
    String.raw`(?:un|une|des|le|la|les|chaque)\s+(?:e-?mails?|courriels?|notifications?|rappels?|alertes?|sms|messages?)\s+(?:vous|lui|leur|part|partent|partira|est\s+envoy|sera|seront)`,
    // Le PASSIF seul, et pas sa négation : « la personne qui vous a envoyé ce
    // lien » décrit ce qu'une personne a fait, « n'a été envoyé » le nie.
    String.raw`(?<!(?:^|[^\p{L}])n')(?:(?:a|ont)\s+été|est|sont|sera|seront|serait)\s+(?:envoy|adress|transmi)\p{L}*`,
    String.raw`(?:e-?mails?|courriels?|messages?|liens?)(?:\s+\p{L}+){0,3}\s+(?:vient\s+de\s+partir|va\s+partir|partira|part)`,
    String.raw`(?:reçue?s?|envoyée?s?|transmise?s?|adressée?s?)\s+par\s+(?:e-?mail|courriel|sms|notification)`,
  ].join("|"),
);

/** Les qualifications, en mots séparés par n'importe quel blanc — une phrase de JSX se coupe en fin de ligne. */
const QUALIFICATIONS: { nom: string; motif: RegExp }[] = [
  // Les formes françaises, accent compris — pas `opposab\p{L}*`, qui avalait
  // les identifiants `opposabiliteUrssaf`, `opposabilite` de la vigilance.
  { nom: "opposable", motif: mot(String.raw`(?:non[\s-]+|in)?opposab(?:les?|ilités?)`) },
  // « ne fait pas foi » aussi : la négation d'une valeur probante en affirme
  // l'existence ailleurs (motif de l'aperçu du DUERP, contre-lecture du 2026-09-26).
  { nom: "fait foi", motif: mot(String.raw`(?:fait|font|faire|faisant|fera|feront|ferait)\s+(?:pas\s+|plus\s+|point\s+)?foi`) },
  {
    nom: "exigé par l'assureur",
    motif: mot(
      String.raw`exig\p{L}*\s+par\s+(?:les?|la|vos|votre|l')\s*(?:assureurs?|assurances?)` +
        String.raw`|(?:assureurs?|assurances?)\s+(?:l'|les\s+|la\s+)?exig\p{L}*` +
        String.raw`|l'exig\p{L}*\s+probablement`,
    ),
  },
  { nom: "en règle", motif: mot(String.raw`en\s+règle`) },
  { nom: "en infraction", motif: mot(String.raw`en\s+infraction`) },
  // Les familles que la contre-lecture a trouvées hors de la garde : ce que
  // le produit promettrait qu'un document fait POUR le dirigeant.
  { nom: "vous couvre / vous protège", motif: mot(String.raw`vous\s+(?:couvre|couvrent|protège|protègent)|qui\s+protège|vous\s+protéger`) },
  { nom: "responsabilité engagée", motif: mot(String.raw`responsabilité\s+(?:est\s+|serait\s+|sera\s+)?engagée`) },
  // « probatoire » : la forme du corps du mail de signature, qui passait
  // (contre-lecture du 2026-09-26).
  { nom: "valeur légale", motif: mot(String.raw`valeur\s+(?:légale|juridique|probante|probatoire)`) },
  { nom: "premier document demandé", motif: mot(String.raw`premier\s+document\s+demandé`) },
  // L'indice se dit « d'avancement » (décision de la propriétaire,
  // 2026-09-26) : « conformité » y qualifiait un calcul interne.
  { nom: "score de conformité", motif: mot(String.raw`scores?\s+de\s+conformité`) },
  // PROMESSES QUE LE PRODUIT NE TIENT PAS (C38, 2026-09-26). Aucun rappel
  // n'est envoyé — le dépôt n'a aucun driver d'envoi réel —, aucune action
  // ne naît seule d'un écart, aucun dossier n'est « prêt » par construction.
  // Les négations écrites pour le dire (« aucun rappel par e-mail ») ne
  // tombent pas sous ces formes.
  {
    nom: "rappel promis",
    motif: mot(
      String.raw`e-?mail\s+vous\s+prévien\p{L}*|vous\s+(?:prévien|rappel|alert)\p{L}*|rappel\p{L}*\s+les\s+échéances|alertes?\s+J-\d+|escalade\s+si\s+retard`,
    ),
  },
  { nom: "automatisme promis", motif: mot(String.raw`créée?s?\s+automatiquement|se\s+posent\s+seules|se\s+remplit\s+seul`) },
  { nom: "prêt pour contrôle", motif: mot(String.raw`prêt\s+pour\s+(?:le\s+|un\s+)?contrôle`) },
  { nom: "rien à préparer", motif: mot(String.raw`rien\s+à\s+préparer`) },
  // L'ENVOI PROMIS, par RACINES (contre-lecture du 2026-09-26) : « Nous vous
  // enverrons un courriel quinze jours avant chaque échéance » passait les
  // formes ci-dessus. Les racines seules (`e-?mail`, `alerte`, `envo…`)
  // touchent 288 lignes, identifiants et tons de pastille compris, et leur
  // admission ligne à ligne serait une liste recopiée. La garde prend donc
  // les racines dans leurs formes de PROMESSE : un sujet suivi d'un verbe
  // d'envoi, à tout temps (« vous enverra », « va recevoir », « pourrez leur
  // envoyer ») ; un envoi qui part vers quelqu'un (« un e-mail vous… ») ; le
  // passif (« a été envoyé ») ; le départ (« vient de partir ») ; la
  // réception (« reçu par email »). La négation (« ne vous enverra pas ») et
  // « recevoir du public » ne tombent pas.
  { nom: "envoi promis", motif: ENVOI_PROMIS },
];

/**
 * Les occurrences admises, NOMMÉMENT — fichier et texte exact, pas le mot
 * seul : une admission par fichier laissait passer toute nouvelle occurrence
 * du même mot dans le même fichier. Une entrée qui ne correspond plus à rien
 * fait échouer le test : un aveu mort se retire.
 */
const ADMISES: { fichier: string; ligne: string; motif: string }[] = [
  {
    fichier: "src/lib/mcp/tools.ts",
    // La LIGNE exacte, espaces de tête retirés : une admission par mot
    // laissait passer toute autre phrase du même fichier qui l'emploie
    // (contre-lecture du 2026-09-26). Une seule entrée pour les deux mots
    // qu'elle porte (« en infraction », « opposable »).
    // Ligne coupée le 2026-09-26 (C38) : la phrase qui promettait « les
    // articles qui fondent une obligation » était fausse, et elle est passée à
    // la ligne suivante, corrigée. L'admission ne porte plus que l'interdit.
    ligne: "- Ne qualifie jamais juridiquement un état : ni « conforme », ni « en infraction », ni « opposable ».",
    motif:
      "La consigne donnée au modèle qui lit le serveur MCP : elle NOMME les mots pour les interdire.",
  },
  // Les e-mails d'authentification : Supabase Auth les envoie, eux (ADR-005).
  {
    fichier: "src/app/signup/verification-en-attente/page.tsx",
    ligne: "Un lien de confirmation a été envoyé à",
    motif: "Envoyé par Supabase Auth à l'inscription (`signUp`), pas par le driver de Rojer.",
  },
  {
    fichier: "src/lib/auth/actions.ts",
    ligne: '"Si un compte existe avec cette adresse, un e-mail de réinitialisation vient de partir.",',
    motif: "Envoyé par Supabase Auth (`resetPasswordForEmail`), pas par le driver de Rojer.",
  },
  // Deux envois VRAIS, qui ne sont pas des e-mails.
  {
    fichier: "src/app/etablissements/[id]/connecter/page.tsx",
    ligne: "enjeu=\"Les informations renvoyées par les outils sont envoyées à l'assistant que vous utilisez, et suivent alors ses propres règles de traitement et de conservation — pas celles de Rojer.\"",
    motif: "Les réponses du connecteur MCP partent bien à l'assistant : c'est l'avertissement de la page.",
  },
  {
    fichier: "src/components/salaries/FormulaireTitre.tsx",
    ligne: "? \"L'avis d'aptitude vous est transmis et vous le conservez de votre côté (art. R. 4624-55) : Rojer n'en garde pas copie.\"",
    motif: "Transmis par le médecin du travail (R. 4624-55), pas par Rojer.",
  },
  // Le flux de signature externe. ~~En attente de décision~~ — tranché le
  // 2026-09-26 par la propriétaire : le bouton reste, et la demande est
  // refusée AVANT le jeton tant que l'envoi n'est pas en service
  // (`envoiEnService`). Ces deux phrases ne s'affichent donc qu'après un
  // envoi réellement parti : la première sur `ok: true`, la seconde sur la
  // page qu'ouvre le lien reçu.
  {
    fichier: "src/components/signatures/DemanderSignatureForm.tsx",
    ligne: "Le destinataire va recevoir un email avec le lien et son code de",
    motif: "Affichée sur `ok: true` seulement, c'est-à-dire après un envoi parti (`emettreAccessToken`).",
  },
  {
    fichier: "src/components/signatures/SignatureExterneForm.tsx",
    ligne: '<Label htmlFor="otp">Code reçu par email *</Label>',
    motif: "Sur la page ouverte par le lien, qui n'existe que si le message est parti.",
  },
];

/**
 * Le source tel qu'il s'affiche, à la ligne près : les entités de JSX et les
 * espaces explicites ramenées à ce qu'elles rendent, l'apostrophe typographique
 * à la droite. « l&apos;exigera », « en&nbsp;règle », « en{" "} » suivi de
 * « règle » à la ligne : tous passaient.
 */
const commeAffiche = (code: string) =>
  code
    .replace(/&apos;|&#39;|[’‘]/g, "'")
    .replace(/&nbsp;|&#160;| | /g, " ")
    .replace(/\{\s*["'`] ["'`]\s*\}/g, " ");

const DOSSIERS = ["src/app", "src/components", "src/lib"];
const EXCLUS = ["src/lib/referentiels/conformite", "src/lib/referentiels/corpus"];
const FICHIERS_EN_PLUS = ["scripts/mcp-server.ts"];

function fichiers(racine: string): string[] {
  const out: string[] = [];
  const descendre = (d: string) => {
    for (const e of readdirSync(d)) {
      const p = join(d, e);
      const rel = relative(racine, p);
      if (EXCLUS.some((x) => rel === x || rel.startsWith(`${x}/`))) continue;
      if (statSync(p).isDirectory()) {
        if (e !== "node_modules") descendre(p);
      } else if (/\.tsx?$/.test(p) && !/\.test\./.test(p)) out.push(p);
    }
  };
  for (const d of DOSSIERS) {
    try {
      descendre(join(racine, d));
    } catch {
      // Un dossier absent (bac d'essai) n'a rien à balayer.
    }
  }
  for (const f of FICHIERS_EN_PLUS) {
    try {
      if (statSync(join(racine, f)).isFile()) out.push(join(racine, f));
    } catch {
      // idem
    }
  }
  return out;
}

/** Le source, commentaires blanchis — les retours à la ligne gardés, pour situer. */
function sansCommentaires(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:\\])\/\/[^\n]*/g, (c, avant: string) => avant + " ".repeat(c.length - avant.length));
}

type Trouvee = { ou: string; nom: string; texte: string; ligne: string };

function qualificationsAffichees(racine: string): Trouvee[] {
  const out: Trouvee[] = [];
  for (const f of fichiers(racine)) {
    const code = commeAffiche(sansCommentaires(readFileSync(f, "utf8")));
    const rel = relative(racine, f);
    for (const q of QUALIFICATIONS) {
      for (const m of code.matchAll(q.motif)) {
        const ligne = code.slice(0, m.index).split("\n").length;
        out.push({
          ou: `${rel}:${ligne}`,
          nom: q.nom,
          texte: m[0].replace(/\s+/g, " "),
          ligne: code.split("\n")[ligne - 1].trim(),
        });
      }
    }
  }
  // Rangées par fichier puis par ligne : l'ordre des motifs n'est pas celui du texte.
  const cle = (t: Trouvee) => {
    const i = t.ou.lastIndexOf(":");
    return [t.ou.slice(0, i), Number(t.ou.slice(i + 1))] as const;
  };
  return out.sort((a, b) => {
    const [fa, la] = cle(a);
    const [fb, lb] = cle(b);
    return fa === fb ? la - lb : fa.localeCompare(fb);
  });
}

const admise = (t: Trouvee) =>
  ADMISES.some((a) => t.ou.startsWith(`${a.fichier}:`) && a.ligne === t.ligne);

describe("aucune sortie ne qualifie juridiquement", () => {
  const trouvees = qualificationsAffichees(RACINE);

  it("le balayage voit les fichiers — sinon il ne prouve rien", () => {
    expect(fichiers(RACINE).length).toBeGreaterThan(200);
    expect(fichiers(RACINE).some((f) => f.endsWith("readme-controle.ts"))).toBe(true);
  });

  it("aucune qualification hors des occurrences admises", () => {
    const hors = trouvees.filter((t) => !admise(t));
    expect(
      hors.map((t) => `${t.ou} — « ${t.texte} »`),
      "Remplacer par un fait : ce que le texte dit, cité, ou ce que Rojer fait — sans conclure.",
    ).toEqual([]);
  });

  it("chaque occurrence admise existe encore — un aveu mort se retire", () => {
    for (const a of ADMISES)
      expect(
        trouvees.some((t) => t.ou.startsWith(`${a.fichier}:`) && t.ligne === a.ligne),
        `${a.fichier} / ${a.ligne.slice(0, 60)}`,
      ).toBe(true);
  });
});

describe("la garde des promesses éprouvée sur les phrases réelles de d34bb24 (C38)", () => {
  it("voit chacune, telle qu'elle était écrite", () => {
    const r = mkdtempSync(join(tmpdir(), "promesses-"));
    try {
      mkdirSync(join(r, "src/components"), { recursive: true });
      writeFileSync(
        join(r, "src/components/sonde.tsx"),
        [
          '    corps: "Un e-mail vous prévient avant la date, le brief ne montre que l\'utile.",',
          '      "Alertes J-30 / J-7 / jour J, escalade si retard.",',
          '          vérifications et <strong>vous rappelle les échéances</strong>{" "}',
          '      "Action créée automatiquement depuis un écart de rapport.",',
          '      "Vos équipements portent leur périodicité. Les dates se posent seules et se reportent.",',
          '      aria-label="Prêt pour contrôle"',
          "              vous n&apos;avez rien à préparer.",
          '    corps: "Le tableau de bord montre ce qui arrive ; Rojer n\'envoie pas de rappel par e-mail.",',
          "",
        ].join("\n"),
      );
      const vues = qualificationsAffichees(r).map((t) => t.ou);
      expect(vues).toEqual(
        // 1 et 3 deux fois : « rappel promis » et « envoi promis » les voient.
        [1, 1, 2, 2, 3, 3, 4, 5, 6, 7].map((l) => `src/components/sonde.tsx:${l}`),
      );
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });
});

describe("l'envoi promis, par racines (contre-lecture du 2026-09-26)", () => {
  const vuesDans = (lignes: string[]) => {
    const r = mkdtempSync(join(tmpdir(), "envois-"));
    try {
      mkdirSync(join(r, "src/components"), { recursive: true });
      writeFileSync(join(r, "src/components/sonde.tsx"), [...lignes, ""].join("\n"));
      return qualificationsAffichees(r).map((t) => Number(t.ou.split(":").pop()));
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  };

  it("voit la variante de la contre-lecture et les phrases réelles de ccd5cb8", () => {
    expect(
      vuesDans([
        "Nous vous enverrons un courriel quinze jours avant chaque échéance, et une notification le jour même.",
        'aide="Utilisé pour envoyer le lien de signature au technicien."',
        "sans le rechercher, et vous pourrez leur envoyer un lien de",
        "Vous pourrez toujours les ajouter plus tard ; la plateforme vous enverra",
        "Le destinataire va recevoir un email avec le lien et son code de",
        "Un lien de confirmation a été envoyé à",
        '<Label htmlFor="otp">Code reçu par email *</Label>',
        "Un e-mail part au prestataire dès l'échéance.",
      ]),
    ).toEqual([1, 3, 4, 5, 6, 7, 8]);
  });

  it("laisse passer la négation, l'adresse enregistrée et le public reçu", () => {
    // La ligne 2 ci-dessus passe aussi : « envoyer » sans sujet ni
    // destinataire n'y est pas une promesse que la garde sache lire. Elle
    // est corrigée à la main ; c'est la limite de la garde.
    expect(
      vuesDans([
        "Rojer ne vous enverra pas d'alerte à cette date.",
        "l'outil ne les fabrique pas et ne vous les rappellera pas.",
        "Son adresse est enregistrée sur la fiche du prestataire.",
        "Ce nombre vous est demandé si vous recevez du public.",
        "Rojer n'envoie pas de rappel par e-mail : c'est en l'ouvrant que vous le voyez.",
      ]),
    ).toEqual([]);
  });
});

describe("la garde éprouvée en la cassant", () => {
  const bac = (fichiersDuBac: Record<string, string>) => {
    const r = mkdtempSync(join(tmpdir(), "qualif-"));
    for (const [chemin, contenu] of Object.entries(fichiersDuBac)) {
      mkdirSync(dirname(join(r, chemin)), { recursive: true });
      writeFileSync(join(r, chemin), contenu);
    }
    return r;
  };

  it("voit les défauts réels du 2026-09-26, tels qu'ils étaient écrits", () => {
    // Recopiés de `abd0108`, coupure de ligne comprise : c'est ainsi qu'une
    // phrase de JSX échappe à un `grep` sur une ligne.
    const r = bac({
      "src/app/permis-feu/page.tsx": [
        "export const P = () => (",
        '  <p className="m-0">',
        "    Votre assureur l&apos;exigera probablement au titre de la règle",
        "    APSAD R43. C&apos;est un référentiel de la profession de",
        "    l&apos;assurance, opposable par votre contrat — pas par le droit.",
        "    Il fait",
        "    foi de l&apos;analyse de risque.",
        "  </p>",
        ");",
        "",
      ].join("\n"),
      "src/lib/pdf/readme.ts": [
        "export const L = [",
        '  " RÉFÉRENTIELS NON OPPOSABLES CITÉS DANS CE DOSSIER",',
        "  `Recommandation INRS ED 6030 ; règle APSAD R43 exigée par les assureurs.`,",
        "];",
        "",
      ].join("\n"),
    });
    try {
      expect(qualificationsAffichees(r).map((t) => `${t.ou} ${t.nom}`)).toEqual([
        "src/app/permis-feu/page.tsx:3 exigé par l'assureur",
        "src/app/permis-feu/page.tsx:5 opposable",
        "src/app/permis-feu/page.tsx:6 fait foi",
        "src/lib/pdf/readme.ts:2 opposable",
        "src/lib/pdf/readme.ts:3 exigé par l'assureur",
      ]);
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("voit ce que la sonde de la contre-lecture faisait passer", () => {
    // Chaque forme, une par ligne, telle qu'un écran l'écrirait.
    const formes = [
      "C&apos;est inopposable.",
      "Son opposabilité tient au contrat.",
      "Ce document fera foi.",
      "Une règle exigée par l&apos;assureur.",
      "Une règle exigée par l’assureur.",
      "Une mesure exigée par votre assurance.",
      "Votre assureur l&apos;exigera probablement.",
      "Tout est en&nbsp;règle.",
      "Tout est en{\" \"}",
      "règle.",
    ];
    const r = bac({ "src/app/sonde.tsx": `export const S = () => (\n<p>\n${formes.join("\n")}\n</p>\n);\n` });
    try {
      expect(qualificationsAffichees(r).map((t) => t.ou)).toEqual(
        [3, 4, 5, 6, 7, 8, 9, 10, 11].map((l) => `src/app/sonde.tsx:${l}`),
      );
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("voit les six phrases que la contre-lecture a trouvées hors de la garde, telles qu'elles étaient écrites", () => {
    // Recopiées de `2fbd230`, où la garde précédente les laissait passer.
    const r = bac({
      "src/lib/pdf/DuerpDocument.tsx": "          Aucune valeur légale avant validation d&apos;une version\n",
      "src/app/plan-prevention/page.tsx":
        'enjeu="Une entreprise qui intervient chez vous fait intervenir son personnel dans votre environnement : si un accident survient faute d\'analyse conjointe, votre responsabilité est engagée."\n',
      "src/app/equipe/page.tsx": [
        "                  habilitée au moment où elle a travaillé — c&apos;est cette",
        "                  preuve qui vous couvre sur la période passée.",
        "",
      ].join("\n"),
      "src/lib/salaries/droits.ts": [
        "période où vous avez travaillé. C'est cette preuve qui protège aussi bien",
        "l'entreprise que vous-même.",
        "",
      ].join("\n"),
      "src/app/duerp/page.tsx":
        'enjeu="Obligatoire dès le premier salarié. En cas de contrôle ou d\'accident, c\'est le premier document demandé."\n',
    });
    try {
      expect(qualificationsAffichees(r).map((t) => `${t.ou} ${t.nom}`)).toEqual([
        "src/app/duerp/page.tsx:1 premier document demandé",
        "src/app/equipe/page.tsx:2 vous couvre / vous protège",
        "src/app/plan-prevention/page.tsx:1 responsabilité engagée",
        "src/lib/pdf/DuerpDocument.tsx:1 valeur légale",
        "src/lib/salaries/droits.ts:1 vous couvre / vous protège",
      ]);
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("une admission vaut pour sa LIGNE exacte, pas pour le mot ni le fichier", () => {
    // La sonde de la contre-lecture du 2026-09-26 : une phrase qualifiante
    // ajoutée dans le fichier admis, qui passait tant que l'admission portait
    // sur le mot.
    const r = bac({
      "src/lib/mcp/tools.ts": [
        `const C = \`${ADMISES[0].ligne}\`;`,
        "const D = `Ce registre est opposable à l'inspection.`;",
        "",
      ].join("\n"),
    });
    try {
      const vues = qualificationsAffichees(r);
      // La ligne admise est retrouvée telle quelle, préfixe de code compris :
      // on compare donc la ligne affichée, et la vraie ligne de `tools.ts` est
      // un texte de gabarit, sans préfixe.
      expect(vues.filter((t) => !admise(t)).map((t) => `${t.ou} ${t.nom}`)).toContain(
        "src/lib/mcp/tools.ts:2 opposable",
      );
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("voit « ne fait pas foi », tel que le motif de l'aperçu du DUERP l'écrivait", () => {
    const r = bac({
      "src/app/duerp/preview/route.ts": '    motif: "APERÇU — brouillon non validé, ne fait pas foi",\n',
    });
    try {
      expect(qualificationsAffichees(r).map((t) => `${t.ou} ${t.texte}`)).toEqual([
        "src/app/duerp/preview/route.ts:1 fait pas foi",
      ]);
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });

  it("ne voit ni un commentaire, ni un identifiant, ni une URL", () => {
    const r = bac({
      "src/lib/x.ts": [
        "// l'ancienne phrase disait « opposable par votre contrat »",
        "/* et « fait foi »",
        "   sur deux lignes */",
        "const urssafOpposableJusquA = opposabiliteUrssaf();",
        'const u = "https://exemple.fr/opposable";',
        "",
      ].join("\n"),
    });
    try {
      // L'URL porte le mot : elle est vue, et c'est voulu — une adresse
      // affichée qui dit « opposable » se lit aussi.
      expect(qualificationsAffichees(r).map((t) => t.ou)).toEqual(["src/lib/x.ts:5"]);
    } finally {
      rmSync(r, { recursive: true, force: true });
    }
  });
});
