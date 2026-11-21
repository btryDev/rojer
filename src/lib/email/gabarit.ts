/**
 * La mise en page des e-mails de compte (2026-11-16, tests en préprod : ils
 * partaient en texte brut). Une seule forme pour tous : la marque, un titre,
 * quelques phrases, UN bouton, sa validité, le lien en clair (le secours
 * d'usage quand un bouton ne s'ouvre pas — retiré puis remis le même jour,
 * décision de la propriétaire), une ligne de pied. La marque sur une
 * pastille bleue, le contenu centré (même jour).
 *
 * Le texte brut reste envoyé à côté, dans la forme d'avant (bonjour, phrases,
 * « Ouvrez ce lien (valable …) : », le lien, la suite) ; les phrases ont été
 * réécrites le même jour. C'est lui que lisent les messageries qui
 * n'affichent pas le HTML.
 *
 * HTML d'e-mail : tableaux et styles en ligne, sans feuille ni image ni
 * police distante — ce que Gmail, Outlook et Apple Mail rendent tous. Toute
 * valeur est échappée ; un nom saisi par un utilisateur passe déjà par
 * `nomPourEmail`, l'échappement est la seconde barrière.
 *
 * Les e-mails de signature (2026-11-19, reprise de la forme des e-mails de
 * GestBAT, décision de la propriétaire) prennent la même coquille, avec ce
 * qu'il leur faut en plus : un encadré (référence, entreprise, lieux,
 * période), un code en gros caractères, un bouton facultatif — `MailSignature`
 * plus bas. Ils portent du texte saisi par les deux parties (raison sociale,
 * lieux, nom) : tout passe par `echapperHtml`.
 */

export type MailCompte = {
  /** Le titre du message, en tête de carte. */
  titre: string;
  /** Les phrases avant le bouton, une par paragraphe. */
  paragraphes: readonly string[];
  bouton: { libelle: string; url: string };
  /** La durée de validité du lien : « une heure », « 24 heures »… */
  validite?: string;
  /** Les phrases après le bouton (« Si vous n'êtes pas à l'origine… »). */
  apres: readonly string[];
};

const COULEURS = {
  canvas: "#f6f9fb",
  carte: "#ffffff",
  encre: "#0a0a0a",
  texte: "#4d5d6b",
  doux: "#5c7182",
  filet: "#dfe8ee",
  // La pastille de la marque, comme `Marque` dans l'app : `--board-sky`.
  bleuPale: "#b2daf2",
  bleu: "#376881",
} as const;

const POLICE =
  "'IBM Plex Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
/** Titres et pastille (maquette V2, 2026-11-21) : Instrument Sans si le
 *  poste l'a, sinon la police du corps. */
const POLICE_TITRE = `'Instrument Sans',${POLICE}`;
/** Les petits libellés en capitales. */
const POLICE_MONO = "'JetBrains Mono','SFMono-Regular',Menlo,Consolas,monospace";

export function echapperHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Seul un lien http(s) devient un bouton : rien d'autre n'entre dans un `href`. */
function urlSure(url: string): string {
  if (!/^https?:\/\//i.test(url)) throw new Error("lien d'e-mail refusé : http(s) attendu");
  return echapperHtml(url);
}

/**
 * Le texte échappé, avec les espaces insécables de la typographie française :
 * après « et avant », :, ?, ! et ; — un guillemet ou un deux-points ne finit
 * jamais seul sur sa ligne.
 */
function typographie(texte: string): string {
  return echapperHtml(texte)
    .replace(/« /g, "«&nbsp;")
    .replace(/ (»|:|\?|!|;)/g, "&nbsp;$1");
}

function paragraphe(texte: string): string {
  return `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:${COULEURS.texte};">${typographie(texte)}</p>`;
}

/** Les phrases secondaires : plus petites, toutes à la même taille. */
function note(texte: string): string {
  return `<p style="margin:0 0 8px;font-size:13px;line-height:1.5;color:${COULEURS.doux};">${typographie(texte)}</p>`;
}

/** Le bouton d'action, compatible Outlook : un tableau, un lien en ligne. */
function boutonHtml(href: string, libelle: string): string {
  return `<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:12px auto 14px;">
<tr><td style="border-radius:999px;background:${COULEURS.encre};">
<a href="${href}" style="display:inline-block;padding:15px 30px;font-family:${POLICE_TITRE};font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${echapperHtml(libelle)}</a>
</td></tr>
</table>`;
}

/** Le lien en clair : le secours d'usage quand un bouton ne s'ouvre pas. */
function lienDeSecours(href: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 24px;">
<tr><td align="center" style="background:${COULEURS.canvas};border-radius:14px;padding:12px 14px;text-align:center;">
<p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:${COULEURS.doux};">Le bouton ne s'ouvre pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:</p>
<p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${href}" style="color:${COULEURS.bleu};">${href}</a></p>
</td></tr>
</table>`;
}

/** Les phrases secondaires, sous un filet. */
function blocNotes(lignes: readonly string[]): string {
  return `<div style="border-top:1px solid ${COULEURS.filet};padding-top:16px;text-align:center;">
${lignes.map(note).join("\n")}
</div>`;
}

/**
 * Le document entier : la marque, la carte (son titre, puis `contenu`), la
 * ligne de pied. Une seule coquille pour les e-mails de compte et ceux de
 * signature.
 */
function coquille(titre: string, contenu: string, surtitre?: string): string {
  // Une seule marque forte : la pastille bleue de Rojer en tête. Le reste est
  // calme — encre, gris de la charte, un seul bouton.
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${echapperHtml(titre)}</title>
</head>
<body style="margin:0;padding:0;background:${COULEURS.canvas};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.canvas};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:${POLICE};">
<tr><td align="center" style="padding:0 0 20px;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr>
<td style="background:${COULEURS.bleuPale};border-radius:999px;padding:8px 20px;font-family:${POLICE_TITRE};font-size:18px;line-height:1;font-weight:600;letter-spacing:-0.02em;color:${COULEURS.encre};">Rojer</td>
</tr></table>
</td></tr>
<tr><td align="center" style="background:${COULEURS.carte};border-radius:28px;padding:36px 32px 30px;text-align:center;">
${surtitre ? `<p style="margin:0 0 14px;font-family:${POLICE_MONO};font-size:11px;line-height:1.4;letter-spacing:0.16em;text-transform:uppercase;color:${COULEURS.doux};">${echapperHtml(surtitre)}</p>\n` : ""}<h1 style="margin:0 0 22px;font-family:${POLICE_TITRE};font-size:30px;line-height:1.08;font-weight:600;letter-spacing:-0.035em;color:${COULEURS.encre};">${echapperHtml(titre)}</h1>
${contenu}
</td></tr>
<tr><td align="center" style="padding:18px 8px 0;font-size:12px;line-height:1.5;color:${COULEURS.doux};text-align:center;">Envoyé par Rojer. Ne&nbsp;répondez pas à ce&nbsp;message.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

export function htmlMailCompte(m: MailCompte): string {
  const href = urlSure(m.bouton.url);
  return coquille(
    m.titre,
    [
      m.paragraphes.map((p) => paragraphe(p)).join("\n"),
      boutonHtml(href, m.bouton.libelle),
      m.validite ? note(`Le lien est valable ${m.validite}.`) : "",
      lienDeSecours(href),
      blocNotes(m.apres),
    ].join("\n"),
  );
}

/**
 * Le texte brut du même message : bonjour, les phrases, le lien, la suite —
 * la forme qu'avaient les e-mails de compte avant leur mise en page.
 */
export function texteMailCompte(m: MailCompte): string {
  return [
    "Bonjour,",
    "",
    ...m.paragraphes,
    "",
    m.validite ? `Ouvrez ce lien (valable ${m.validite}) :` : "Ouvrez ce lien :",
    m.bouton.url,
    "",
    ...m.apres,
  ].join("\n");
}

/**
 * Les deux formes. Un lien qui n'est pas http(s) ne devient pas un bouton :
 * le message part alors en texte seul, plutôt que de ne pas partir.
 */
export function mailCompte(m: MailCompte): { text: string; html?: string } {
  const text = texteMailCompte(m);
  return /^https?:\/\//i.test(m.bouton.url) ? { text, html: htmlMailCompte(m) } : { text };
}

// ── Les e-mails de signature (2026-11-19) ──────────────────────────────────

export type MailSignature = {
  /** Le titre du message, en tête de carte. */
  titre: string;
  /** Le petit libellé en capitales au-dessus du titre ; « Signature électronique » par défaut. */
  surtitre?: string;
  /** Le nom du destinataire, pour « Bonjour …, » ; absent : « Bonjour, ». */
  nom?: string | null;
  /** Les phrases d'ouverture, une par paragraphe. */
  paragraphes: readonly string[];
  /** L'encadré : référence, entreprise, lieux, période… une ligne chacun. */
  encadre?: readonly { libelle: string; valeur: string }[];
  /** Un code à recopier, en gros caractères (e-mail du code). */
  code?: { libelle: string; valeur: string };
  /** Les phrases après l'encadré ou le code, avant le bouton. */
  suite?: readonly string[];
  /** Facultatif : un avis n'a pas toujours de page à ouvrir. */
  bouton?: { libelle: string; url: string };
  /** La fin de validité du lien : « jusqu'au 26 novembre 2026 à 14:30 (heure de Paris) ». */
  validite?: string;
  /** Les phrases secondaires, sous un filet (RGPD, « si vous n'avez rien demandé… »). */
  apres: readonly string[];
};

function salutation(nom: string | null | undefined): string {
  return nom ? `Bonjour ${nom},` : "Bonjour,";
}

function encadreHtml(lignes: readonly { libelle: string; valeur: string }[]): string {
  // Une grille libellé / valeur (maquette V2) : le libellé en mono capitales
  // à gauche, la valeur à droite — un tableau, pour Outlook.
  const rangs = lignes
    .map(
      (l) =>
        `<tr><td valign="top" width="120" style="padding:6px 14px 6px 0;font-family:${POLICE_MONO};font-size:10.5px;line-height:1.5;letter-spacing:0.12em;text-transform:uppercase;color:${COULEURS.doux};">${typographie(l.libelle)}</td>` +
        // `overflow-wrap` : une empreinte de 64 caractères se coupe au bord
        // de la carte au lieu de la déborder.
        `<td valign="top" style="padding:4px 0;font-size:14.5px;line-height:1.5;color:${COULEURS.encre};overflow-wrap:anywhere;word-break:break-word;">${typographie(l.valeur)}</td></tr>`,
    )
    .join("\n");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:4px 0 20px;">
<tr><td style="background:${COULEURS.canvas};border-radius:18px;padding:14px 22px;text-align:left;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rangs}
</table>
</td></tr>
</table>`;
}

function codeHtml(code: { libelle: string; valeur: string }): string {
  return `<p style="margin:4px 0 6px;font-size:13px;line-height:1.5;color:${COULEURS.doux};">${typographie(code.libelle)}</p>
<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:0 auto 20px;">
<tr><td style="background:${COULEURS.canvas};border-radius:12px;padding:14px 26px;font-family:'SFMono-Regular',Menlo,Consolas,monospace;font-size:36px;line-height:1;font-weight:600;letter-spacing:8px;color:${COULEURS.encre};">${echapperHtml(code.valeur)}</td></tr>
</table>`;
}

export function htmlMailSignature(m: MailSignature): string {
  const href = m.bouton ? urlSure(m.bouton.url) : null;
  return coquille(
    m.titre,
    [
      paragraphe(salutation(m.nom)),
      ...m.paragraphes.map((p) => paragraphe(p)),
      m.encadre?.length ? encadreHtml(m.encadre) : "",
      m.code ? codeHtml(m.code) : "",
      ...(m.suite ?? []).map((p) => paragraphe(p)),
      href && m.bouton ? boutonHtml(href, m.bouton.libelle) : "",
      href && m.validite ? note(`Le lien est valable ${m.validite}.`) : "",
      href ? lienDeSecours(href) : "",
      m.apres.length ? blocNotes(m.apres) : "",
    ]
      .filter(Boolean)
      .join("\n"),
    m.surtitre ?? "Signature électronique",
  );
}

/**
 * Le texte brut du même message, lisible seul : chaque bloc séparé d'une
 * ligne vide, l'encadré en « Libellé : valeur », le lien en clair après le
 * libellé du bouton.
 */
export function texteMailSignature(m: MailSignature): string {
  const blocs: string[][] = [
    [salutation(m.nom)],
    ...m.paragraphes.map((p) => [p]),
    m.encadre?.length ? m.encadre.map((l) => `${l.libelle} : ${l.valeur}`) : [],
    m.code ? [`${m.code.libelle} : ${m.code.valeur}`] : [],
    ...(m.suite ?? []).map((p) => [p]),
    m.bouton
      ? [
          `${m.bouton.libelle} : ${m.bouton.url}`,
          ...(m.validite ? [`Le lien est valable ${m.validite}.`] : []),
        ]
      : [],
    [...m.apres],
  ];
  return blocs
    .filter((b) => b.length > 0)
    .map((b) => b.join("\n"))
    .join("\n\n");
}

/**
 * Les deux formes. Comme `mailCompte` : un lien qui n'est pas http(s) ne
 * devient pas un bouton, le message part en texte seul.
 */
export function mailSignature(m: MailSignature): { text: string; html?: string } {
  const text = texteMailSignature(m);
  return !m.bouton || /^https?:\/\//i.test(m.bouton.url) ? { text, html: htmlMailSignature(m) } : { text };
}
