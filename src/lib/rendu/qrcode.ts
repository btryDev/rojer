import QRCode from "qrcode";

/**
 * Les QR codes de l'app, dessinés côté serveur, sans service tiers : l'URL
 * publique d'un registre d'accessibilité (SVG de la page admin, image de
 * l'affiche) et l'URI `otpauth://` de la double authentification.
 */
export async function genererQrCodeSvg(url: string): Promise<string> {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    width: 240,
    color: {
      dark: "#111",
      light: "#ffffff",
    },
    errorCorrectionLevel: "M",
  });
}

export async function genererQrCodeDataUrl(url: string, width = 480): Promise<string> {
  return QRCode.toDataURL(url, {
    margin: 1,
    width,
    errorCorrectionLevel: "M",
  });
}
