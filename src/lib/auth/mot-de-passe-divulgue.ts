import "server-only";

import { createHash } from "node:crypto";
import { fetchAvecDelai } from "@/lib/reseau/delai";

/**
 * Le mot de passe figure-t-il dans une fuite connue ? (ASVS V6.2.12, ADR-052)
 *
 * Service « Pwned Passwords » de Have I Been Pwned, par k-anonymat : seuls les
 * cinq premiers caractères de l'empreinte SHA-1 partent ; la comparaison se
 * fait ici, sur les suffixes reçus. Ni le mot de passe ni son empreinte
 * complète ne quittent le serveur. `Add-Padding` brouille la taille de la
 * réponse.
 *
 * Pas le module de Better Auth (`haveIBeenPwned`) : il appelle le service sans
 * délai (M9, `reseau/delai.ts`), et sa panne refuserait toute inscription.
 * Nos actions sont les seules portes (aucune route HTTP de Better Auth) : le
 * contrôle se pose là, une fois.
 *
 * Rend `true` (divulgué), `false` (absent), ou `null` quand le service ne
 * répond pas : l'appelant laisse passer et le journal le dit — refuser
 * l'inscription parce qu'un tiers est en panne ne protège personne.
 */

const URL_SERVICE = "https://api.pwnedpasswords.com/range/";
const DELAI_MS = 4_000;

export async function motDePasseDivulgue(
  motDePasse: string,
  appeler: typeof fetch = fetchAvecDelai(DELAI_MS),
): Promise<boolean | null> {
  const empreinte = createHash("sha1").update(motDePasse, "utf8").digest("hex").toUpperCase();
  const prefixe = empreinte.slice(0, 5);
  const suffixe = empreinte.slice(5);
  try {
    const reponse = await appeler(URL_SERVICE + prefixe, {
      headers: { "Add-Padding": "true", "User-Agent": "Rojer" },
    });
    if (!reponse.ok) throw new Error(`statut ${reponse.status}`);
    const corps = await reponse.text();
    return corps.split("\n").some((ligne) => {
      const [s, compte] = ligne.trim().split(":");
      // Les lignes de remplissage portent un compte nul.
      return s === suffixe && Number(compte) > 0;
    });
  } catch (e) {
    console.warn(
      JSON.stringify({
        type: "mot_de_passe_divulgue_indisponible",
        motif: e instanceof Error ? e.message : String(e),
      }),
    );
    return null;
  }
}

export const MESSAGE_MOT_DE_PASSE_DIVULGUE =
  "Ce mot de passe figure dans des fuites de données connues : choisissez-en un autre.";
