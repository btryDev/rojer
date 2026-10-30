/**
 * Un nom lisible pour une session ouverte, tiré de son user-agent : « Firefox
 * sur Windows », « Safari sur iPhone ». Indicatif, pour reconnaître ses
 * appareils dans la liste des sessions — jamais une preuve, l'en-tête se
 * choisit librement. Module sans dépendance, testé à part.
 */
const NAVIGATEURS: [RegExp, string][] = [
  [/Edg\//, "Edge"],
  [/OPR\/|Opera/, "Opera"],
  [/Firefox\//, "Firefox"],
  [/Chrome\//, "Chrome"],
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
