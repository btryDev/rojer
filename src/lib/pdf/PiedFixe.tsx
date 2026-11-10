import { Text } from "@react-pdf/renderer";
import { stylesCommuns as s } from "./styles";

/**
 * Le pied de page des PDF : un texte FIXE, répété sur chaque feuille de sa
 * `<Page>`, à instancier une fois par `<Page>`.
 *
 * ⚠ **Sans numéro de page, et ce n'est pas un oubli.** La prop `render` de
 * `@react-pdf/renderer` 4.5.1 (« page X / N ») ne s'imprime jamais — vérifié
 * par le registre, puis le 2026-11-10 sur un PDF de cinq feuilles : zéro pied
 * `render`, cinq pieds fixes. Pire, sous le `lineHeight` de la page, elle
 * faisait croître la boîte du pied à chaque feuille jusqu'à l'erreur
 * « unsupported number … clipBorderTop » (issues react-pdf #3416, #3452) : le
 * dossier de conformité d'un établissement chargé tombait en 500 (banc de
 * charge, 2026-11-10). Les quatre PDF qui l'employaient passent ici (lot
 * pdf-a1) : dossier de conformité, plan d'actions, points à corriger,
 * registre. Le DUERP, lui, n'employait pas `render` : ses pieds fixes, à son
 * propre style, restent les siens. Numéroter demandera une autre version de
 * la bibliothèque.
 *
 * Mieux vaut un pied qui s'imprime sans numéro qu'un pied qui ne s'imprime
 * pas : devant un contrôleur, savoir de quel établissement il s'agit est ce
 * qui compte le plus.
 */
export function PiedFixe({
  texte,
  couleurs,
}: {
  texte: string;
  /** Les teintes du registre, qui suit la charte board. */
  couleurs?: { color: string; borderTopColor: string };
}) {
  return (
    <Text style={couleurs ? [s.footer, couleurs] : s.footer} fixed>
      {texte}
    </Text>
  );
}
