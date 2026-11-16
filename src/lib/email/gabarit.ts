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

export function htmlMailCompte(m: MailCompte): string {
  const href = urlSure(m.bouton.url);
  // Une seule marque forte : la pastille bleue de Rojer en tête. Le reste est
  // calme — encre, gris de la charte, un seul bouton.
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light">
<title>${echapperHtml(m.titre)}</title>
</head>
<body style="margin:0;padding:0;background:${COULEURS.canvas};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${COULEURS.canvas};">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;font-family:${POLICE};">
<tr><td align="center" style="padding:0 0 20px;">
<table role="presentation" align="center" cellpadding="0" cellspacing="0"><tr>
<td style="background:${COULEURS.bleuPale};border-radius:999px;padding:8px 18px;font-size:17px;line-height:1;font-weight:600;letter-spacing:-0.02em;color:${COULEURS.encre};">Rojer</td>
</tr></table>
</td></tr>
<tr><td align="center" style="background:${COULEURS.carte};border-radius:20px;padding:36px 32px 32px;border:1px solid ${COULEURS.filet};text-align:center;">
<h1 style="margin:0 0 22px;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.03em;color:${COULEURS.encre};">${echapperHtml(m.titre)}</h1>
${m.paragraphes.map((p) => paragraphe(p)).join("\n")}
<table role="presentation" align="center" cellpadding="0" cellspacing="0" style="margin:12px auto 14px;">
<tr><td style="border-radius:999px;background:${COULEURS.encre};">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${echapperHtml(m.bouton.libelle)}</a>
</td></tr>
</table>
${m.validite ? note(`Le lien est valable ${m.validite}.`) : ""}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0 24px;">
<tr><td align="center" style="background:${COULEURS.canvas};border-radius:12px;padding:14px 16px;text-align:center;">
<p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:${COULEURS.doux};">Le bouton ne s'ouvre pas&nbsp;? Copiez ce lien dans votre navigateur&nbsp;:</p>
<p style="margin:0;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${href}" style="color:${COULEURS.bleu};">${href}</a></p>
</td></tr>
</table>
<div style="border-top:1px solid ${COULEURS.filet};padding-top:16px;text-align:center;">
${m.apres.map(note).join("\n")}
</div>
</td></tr>
<tr><td align="center" style="padding:18px 8px 0;font-size:12px;line-height:1.5;color:${COULEURS.doux};text-align:center;">Envoyé par Rojer. Ne&nbsp;répondez pas à ce&nbsp;message.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
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
