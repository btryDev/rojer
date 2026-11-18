import { ImageEnTete } from "./ImageEnTete";

/**
 * Une lettre reçue, sortie de son enveloppe, un paragraphe surligné : ce
 * qu'une autorité — ou votre assureur — vous a prescrit à vous seul.
 * Planche Équipement et bâtiment, choisie par la propriétaire le 2026-11-18 :
 * aucun texte, la scène dit la page.
 */
export function IllustrationPrescriptions() {
  return (
    <ImageEnTete
      src="/illustrations/entetes/prescriptions.webp"
      width={761}
      height={900}
      className="w-[clamp(214px,20vw,287px)]"
    />
  );
}
