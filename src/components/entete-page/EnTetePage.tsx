import { CadreEnTete, type CadreEnTeteProps } from "./CadreEnTete";
import { IllustrationEnTete } from "./illustrations";
import { aUneIllustration } from "./illustrations/liste";

/**
 * L'en-tête des pages d'entrée du rail — un seul pour toutes (2026-10-25).
 *
 * Il remplace les en-têtes écrits page par page : sept façons de faire la
 * même chose, deux tailles de titre. On lui donne l'entrée du rail ; il en
 * déduit la section (donc la teinte) et le titre.
 *
 * **Ce qu'il porte** : ce qu'on voit (le titre), ce qu'on peut y faire (le
 * descriptif, deux phrases au plus), et la SEULE commande qui change la vue
 * de la page (`children` : « Par mois / Par équipement », « En permanence /
 * En cas de… »). Année, filtres, aide restent sur le bloc qu'ils règlent, et
 * sous une autre forme (décision de la propriétaire du 2026-10-25). À droite,
 * l'illustration — le seul élément fort ; tout le reste est sobre.
 *
 * **Pas de fil d'Ariane** (même décision, maquette « v3 » du Calendrier) :
 * une page d'entrée du rail est rangée sous l'établissement, ce que la
 * sidebar et la gélule de compte disent déjà.
 *
 * **La teinte ne colore que le panneau de l'illustration**, sur toute la
 * hauteur et jusqu'au bord droit ; le texte reste sur la surface de carte
 * (« variante A2 » : posée sur un fond teinté de toute la largeur,
 * l'illustration flottait à côté du texte). Sur téléphone, où le panneau
 * disparaît, un liseré de la teinte garde le repère de section.
 *
 * **Le coin haut droit est réservé** à la gélule de compte (`BarreCompte`),
 * qui flotte au-dessus : sur ordinateur elle passe sur le panneau (un fond y
 * a droit) ; sur téléphone, la colonne de texte commence sous elle.
 */
export function EnTetePage({ children, ...cadre }: CadreEnTeteProps) {
  // Le cadre (titre, teinte, mise en page) vit dans `CadreEnTete`, partagé
  // avec le repli de chargement.
  return (
    <CadreEnTete
      {...cadre}
      avecPanneau={aUneIllustration(cadre.item)}
      dessin={<IllustrationEnTete item={cadre.item} />}
    >
      {children}
    </CadreEnTete>
  );
}
