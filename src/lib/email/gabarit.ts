/**
 * La mise en page des e-mails de compte (2026-11-16, tests en préprod : ils
 * partaient en texte brut). Une seule forme pour tous : la marque, un titre,
 * quelques phrases, UN bouton, le lien en clair dessous, une ligne de pied.
 *
 * Le texte brut reste envoyé à côté, mot pour mot celui d'avant : c'est lui
 * que lisent les messageries qui n'affichent pas le HTML, et les journaux.
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
  validite: string;
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
} as const;

const POLICE =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

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

function paragraphe(texte: string, couleur: string = COULEURS.texte): string {
  return `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${couleur};">${echapperHtml(texte)}</p>`;
}

export function htmlMailCompte(m: MailCompte): string {
  const href = urlSure(m.bouton.url);
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
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:${POLICE};">
<tr><td style="padding:0 8px 20px;font-size:20px;font-weight:700;letter-spacing:-0.02em;color:${COULEURS.encre};">Rojer</td></tr>
<tr><td style="background:${COULEURS.carte};border-radius:24px;padding:36px 32px;border:1px solid ${COULEURS.filet};">
<h1 style="margin:0 0 20px;font-size:22px;line-height:1.3;font-weight:700;letter-spacing:-0.01em;color:${COULEURS.encre};">${echapperHtml(m.titre)}</h1>
${m.paragraphes.map((p) => paragraphe(p)).join("\n")}
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
<tr><td style="border-radius:999px;background:${COULEURS.encre};">
<a href="${href}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:999px;">${echapperHtml(m.bouton.libelle)}</a>
</td></tr>
</table>
<p style="margin:0 0 4px;font-size:13px;line-height:1.5;color:${COULEURS.doux};">Le lien est valable ${echapperHtml(m.validite)}. Si le bouton ne marche pas, copiez ce lien dans votre navigateur :</p>
<p style="margin:0 0 24px;font-size:13px;line-height:1.5;word-break:break-all;"><a href="${href}" style="color:${COULEURS.texte};">${href}</a></p>
${m.apres.map((p) => paragraphe(p, COULEURS.doux)).join("\n")}
</td></tr>
<tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.5;color:${COULEURS.doux};">Cet e-mail vous est envoyé par Rojer, à la suite d'une action sur votre compte. Ne répondez pas à ce message.</td></tr>
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
    `Ouvrez ce lien (valable ${m.validite}) :`,
    m.bouton.url,
    "",
    ...m.apres,
  ].join("\n");
}

export function mailCompte(m: MailCompte): { text: string; html: string } {
  return { text: texteMailCompte(m), html: htmlMailCompte(m) };
}
