/**
 * Un nom lisible pour une session ouverte, tiré de son user-agent : « Firefox
 * sur Windows », « Safari sur iPhone ». Indicatif, pour reconnaître ses
 * appareils dans la liste des sessions — jamais une preuve, l'en-tête se
 * choisit librement. Module sans dépendance, testé à part.
 */
// Ordre voulu : sur iOS, Chrome, Firefox et Edge portent aussi « Safari/ »,
// sous les jetons CriOS, FxiOS, EdgiOS. Un iPad récent se dit « Macintosh » :
// il s'affiche « Mac », sans moyen fiable de l'en distinguer.
const NAVIGATEURS: [RegExp, string][] = [
  [/Edg\/|EdgiOS\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\/|FxiOS\//, "Firefox"],
  [/Chrome\/|CriOS\//, "Chrome"],
  [/Safari\//, "Safari"],
];

const SYSTEMES: [RegExp, string][] = [
  [/iPhone/, "iPhone"],
  [/iPad/, "iPad"],
  [/Android/, "Android"],
  [/Windows/, "Windows"],
  [/Mac OS X|Macintosh/, "Mac"],
  [/Linux/, "Linux"],
];

export function decrireAppareil(ua: string | null | undefined): string {
  if (!ua) return "Appareil inconnu";
  const navigateur = NAVIGATEURS.find(([re]) => re.test(ua))?.[1];
  const systeme = SYSTEMES.find(([re]) => re.test(ua))?.[1];
  if (navigateur && systeme) return `${navigateur} sur ${systeme}`;
  return navigateur ?? systeme ?? "Appareil inconnu";
}
