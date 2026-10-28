import { ChargementNeutre } from "@/components/layout/ChargementNeutre";

/** Une fiche ou un formulaire : son en-tête dépend de la donnée, il ne prend
 *  pas celui de la liste au-dessus (`ChargementNeutre`). */
export default function Chargement() {
  return <ChargementNeutre />;
}
