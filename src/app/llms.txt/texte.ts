import { PAGES_LEGALES } from "@/components/landing/pages-legales";

/**
 * `llms.txt` (2026-11-24) : le résumé du site pour les assistants, au format
 * de llmstxt.org — un titre, une phrase en citation, puis des listes de
 * liens. Sans lui, l'adresse menait à l'écran de connexion, et PageSpeed
 * (« Navigation agentique ») le relevait.
 *
 * Rien n'y promet la conformité (règle 8) : Rojer rappelle les obligations
 * et en cite la source, il n'atteste rien.
 */
export function texteLlms(base: string): string {
  const lien = (chemin: string) => (chemin === "/" ? base : `${base}${chemin}`);
  return [
    "# Rojer",
    "",
    "> Rojer construit et coordonne la prévention des risques des TPE-PME de moins de cinquante salariés : document unique (DUERP), vérifications périodiques, registre de sécurité, plan d'actions. Chaque obligation suivie cite son texte réglementaire ou sa norme ; un rythme que le texte ne fixe pas est affiché comme le choix de Rojer.",
    "",
    "Rojer s'adresse au dirigeant non expert. Il calcule les échéances des vérifications d'après les équipements et le type d'établissement déclarés (Code du travail, règlement de sécurité des ERP), centralise les rapports, suit les actions correctives jusqu'à leur levée et prépare les documents à présenter lors d'un contrôle. Il ne délivre aucune attestation de conformité et ne remplace pas la lecture des textes. Les obligations et leurs échéances sont calculées par des règles déterministes, sans intelligence artificielle. En formule Pro, l'utilisateur peut ouvrir ses données en lecture à un assistant (Claude, ChatGPT) par un connecteur MCP.",
    "",
    "## Pages",
    "",
    `- [Accueil](${lien("/")}): présentation du service et des offres`,
    `- [Conditions générales](${lien("/conditions")}): conditions d'utilisation et de vente`,
    "",
    "## Informations",
    "",
    ...PAGES_LEGALES.map((p) => `- [${p.titre}](${lien(`/legal/${p.slug}`)})`),
    "",
  ].join("\n");
}
