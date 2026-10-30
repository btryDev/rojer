import { NextResponse } from "next/server";
import { getRegistrePublicParSlug } from "@/lib/accessibilite/queries";
import { genererQrCodeDataUrl } from "@/lib/rendu/qrcode";
import { identitePublique } from "@/lib/accessibilite/identite";
import {
  MESSAGE_URL_PUBLIQUE_ABSENTE,
  publicAppUrl,
  refusUrlPublique,
} from "@/lib/email";

/**
 * Route publique qui renvoie une affiche HTML prête à imprimer (A4) avec
 * le QR code et l'URL du registre. Le navigateur gère l'impression via
 * window.print(). Permet au dirigeant de coller le QR code à l'accueil
 * sans avoir à manipuler un générateur externe.
 *
 * ELLE PORTAIT LE MÊME DÉFAUT QUE LA PAGE, en trois exemplaires — `<title>`,
 * `<h1>` et pied — et c'est ici qu'il coûtait le plus cher : cette affiche
 * est le papier qu'on COLLE à la porte du 3 quai Nord, et il annonçait le nom
 * d'un autre lieu. La corriger n'est pas un élargissement de confort : la
 * garde de `sujet-public.test.ts` porte sur les surfaces publiques du module,
 * et laisser celle-ci en dehors aurait été excepter un fichier d'une règle
 * pour n'avoir pas à le reprendre.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  // La même lecture publique que la page — et pas une requête jumelle écrite
  // ici. Les deux portaient chacune leur contrôle de publication ; deux
  // exemplaires d'une règle finissent par diverger, et celui qui dériverait
  // afficherait une affiche pour un registre dépublié.
  const registre = await getRegistrePublicParSlug(slug);

  if (!registre) {
    return NextResponse.json({ error: "introuvable" }, { status: 404 });
  }

  // Une affiche dont le QR mène à localhost ne s'imprime pas (audit du
  // 2026-10-12, B7) : en production sans adresse publique, refus dit et
  // journalisé.
  const refus = refusUrlPublique();
  if (refus) {
    console.error(`affiche accessibilité : ${refus}`);
    return new NextResponse(MESSAGE_URL_PUBLIQUE_ABSENTE, {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  const url = `${publicAppUrl()}/accessibilite/${registre.slugPublic}`;
  const qrDataUrl = await genererQrCodeDataUrl(url);
  const identite = identitePublique(registre.etablissement);

  const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Affiche — ${escapeHtml(identite.titre)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, sans-serif;
    color: #18181f;
    background: #fff;
    margin: 0;
    padding: 0;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }
  .wrap { display: flex; flex-direction: column; align-items: center; padding: 0 10mm; }
  .kicker {
    font-family: "SF Mono", Menlo, monospace;
    font-size: 10px;
    letter-spacing: 0.22em;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 8mm;
  }
  h1 {
    font-size: 30pt;
    letter-spacing: -0.025em;
    font-weight: 600;
    text-align: center;
    margin: 0 0 4mm;
    line-height: 1.05;
  }
  .subtitle {
    font-size: 14pt;
    color: #333;
    text-align: center;
    margin-bottom: 12mm;
  }
  .qr-box {
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 10mm;
    background: #fff;
    box-shadow: 0 1px 0 #eee;
  }
  .qr-box img {
    display: block;
    width: 90mm;
    height: 90mm;
    image-rendering: pixelated;
  }
  .instructions {
    font-size: 16pt;
    margin-top: 10mm;
    text-align: center;
    max-width: 140mm;
    line-height: 1.35;
  }
  .url {
    font-family: "SF Mono", Menlo, monospace;
    font-size: 10pt;
    color: #6b7280;
    margin-top: 6mm;
    text-align: center;
    word-break: break-all;
  }
  .footer {
    border-top: 1px dashed #ccc;
    padding: 6mm 0 0;
    text-align: center;
    font-family: "SF Mono", Menlo, monospace;
    font-size: 9pt;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6b7280;
  }
  .adresse { font-size: 10pt; color: #555; margin-top: 2mm; letter-spacing: normal; text-transform: none; }
  @media print {
    body { background: #fff; }
    .no-print { display: none; }
  }
  .btn {
    display: inline-block;
    margin: 8mm auto 0;
    padding: 10px 18px;
    background: #18181f;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 13px;
    cursor: pointer;
  }
</style>
</head>
<body>
  <div class="wrap">
    <div class="kicker">Accessibilité · Arrêté du 19 avril 2017</div>
    <h1>${escapeHtml(identite.titre)}</h1>
    <div class="subtitle">${escapeHtml(identite.adresse)}</div>

    <div class="qr-box">
      <img src="${qrDataUrl}" alt="QR code — registre d'accessibilité" />
    </div>

    <div class="instructions">
      <strong>Scannez ce code</strong> pour consulter notre registre d'accessibilité.
    </div>
    <div class="url">${escapeHtml(url)}</div>

    <div class="no-print">
      <button type="button" class="btn" onclick="window.print()">
        Imprimer cette affiche
      </button>
    </div>
  </div>

  <div class="footer">
    ${escapeHtml(identite.titre)}${
      identite.exploitant
        ? ` — <span class="adresse">exploité par ${escapeHtml(identite.exploitant)}</span>`
        : ""
    }
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
