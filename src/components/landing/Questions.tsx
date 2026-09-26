import { Reveal } from "./Reveal";
import {
  MAJ_DUERP_AMENAGEMENT_IMPORTANT,
  MAJ_DUERP_ANNUELLE,
  MAJ_DUERP_INFORMATION_NOUVELLE,
  enMinuscule,
} from "@/lib/referentiels/conformite/texte-r4121-2";

// Les questions posées avant de créer un compte. Registre sobre, réponses
// courtes, sans promesse : ce que l'outil fait, et surtout ce qu'il ne
// fait pas. Trois d'entre elles disent « non » — c'est voulu, une FAQ qui
// n'écarte rien ne rassure personne.
//
// Accordéon en <details> natif — pas de JavaScript, ouvrable au clavier,
// et le contenu reste dans le document pour la recherche.
//
// Une seule référence réglementaire est citée, l'art. R. 4121-2, et elle
// a été relue sur Légifrance : mise à jour au moins annuelle à partir de
// onze salariés, sinon à chaque aménagement important ou information
// nouvelle. Le seuil est bien celui qu'applique le moteur
// (`SEUIL_MAJ_ANNUELLE_DUERP`). Ne pas ajouter de montant d'amende ni de
// texte non relu à la source : sur une page publique, une référence
// approximative coûte plus cher que pas de référence du tout.
//
// La question sur l'absence d'IA a été retirée : le sujet est traité sans
// détour dans la bande noire, et une FAQ n'est pas l'endroit où défendre
// un choix d'architecture.

const QUESTIONS = [
  {
    q: "Rojer atteste-t-il de ma conformité ?",
    r: "Non, et il ne le fera jamais. Il présente ce qui est fait, ce qui manque et à quelle échéance. La conformité se constate sur pièces, par une personne habilitée : elle ne se décrète pas depuis un logiciel.",
  },
  {
    q: "Mon DUERP doit-il être mis à jour chaque année ?",
    r: `À partir de onze salariés, oui : l'art. R. 4121-2 du Code du travail la prévoit « ${enMinuscule(MAJ_DUERP_ANNUELLE)} ». Quel que soit l'effectif, elle est aussi réalisée « ${enMinuscule(MAJ_DUERP_AMENAGEMENT_IMPORTANT)} » et « ${enMinuscule(MAJ_DUERP_INFORMATION_NOUVELLE)} ». Rojer applique la règle qui correspond à votre effectif.`,
  },
  {
    q: "Rojer remplace-t-il mon organisme de vérification ?",
    r: "Non. Les vérifications périodiques restent réalisées par un organisme agréé ou une personne compétente. Rojer tient le calendrier, vous indique ce qui arrive, et range le rapport à côté de l'échéance qu'il solde.",
  },
  {
    // Fonctionnalité livrée : `src/lib/duerps/import/parser.ts` (Excel, xls
    // et CSV, 20 Mo), modèle XLSX servi par /api/duerp/import/template,
    // rattachement manuel des colonnes non reconnues dans le wizard. Le
    // gabarit est en XLSX seul — c'est l'import qui accepte aussi le CSV.
    q: "Puis-je reprendre un DUERP existant ?",
    r: "Oui. Vous déposez votre fichier Excel ou CSV : unités de travail, risques, cotation et mesures déjà en place sont repris tels quels. Un modèle est téléchargeable, et les colonnes qui ne sont pas reconnues se rattachent à la main.",
  },
  {
    q: "Mon activité est-elle couverte ?",
    // Le périmètre, dit (relecture du 2026-09-26) : `CATEGORIES_COUVERTES`
    // (5ᵉ catégorie), `EFFECTIF_MAX` et les refus de `perimetre/exclusions.ts`.
    r: "L'évaluation des risques couvre aujourd'hui la restauration, le commerce de détail et les activités de bureau. Le suivi des vérifications découle de vos équipements et de votre établissement. Pour un établissement recevant du public, le règlement de sécurité est suivi en 5ᵉ catégorie ; un établissement des quatre premières catégories est servi sans les règles propres à sa catégorie. Rojer n'ouvre pas de dossier au-delà de 50 travailleurs, ni pour un établissement recevant du public situé dans un immeuble de grande hauteur.",
  },
  {
    q: "Comment présenter mon dossier lors d'un contrôle ?",
    r: "En une archive datée, accompagnée de l'index des pièces, générée en une fois. Inspection du travail, assurance, bailleur ou acquéreur : le geste est le même.",
  },
  {
    q: "Où sont hébergées mes données ?",
    // ~~« une obligation légale, pas un choix de notre part »~~ : l'obligation
    // pèse sur l'employeur ; garder les versions après une suppression est le
    // choix de Rojer, fait pour la servir (relecture du 2026-09-26).
    r: "Dans l'Union européenne. Vous exportez ou supprimez votre dossier à tout moment. Les versions validées de DUERP font exception : Rojer les garde, parce que le Code du travail fait tenir le document unique et ses versions antérieures « pendant une durée de 40 ans à compter de leur élaboration » (art. R. 4121-4).",
  },
];

export function Questions() {
  return (
    <section
      id="questions"
      className="bg-[color:var(--board-canvas)] py-20 sm:py-28"
    >
      <div className="lp-shell grid grid-cols-1 gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <Reveal as="header">
          <p className="lp-eyebrow">Questions</p>
          <h2 className="lp-titre lp-h2 mt-4 max-w-[13ch]">
            Avant de créer un compte
          </h2>
        </Reveal>

        <div className="border-t border-[rgba(10,10,10,.12)]">
          {QUESTIONS.map((item, i) => (
            <Reveal key={item.q} delai={i * 40}>
              <details className="group border-b border-[rgba(10,10,10,.12)]">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.02rem] font-semibold tracking-[-0.015em] text-[color:var(--board-ink)] transition-colors hover:text-[color:var(--board-blue-ink)] [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <span
                    aria-hidden
                    className="relative flex size-7 flex-none items-center justify-center rounded-full bg-[color:var(--board-card)]"
                  >
                    <span className="absolute h-px w-3 bg-[color:var(--board-ink)]" />
                    <span className="absolute h-3 w-px bg-[color:var(--board-ink)] transition-transform duration-300 group-open:rotate-90 group-open:opacity-0" />
                  </span>
                </summary>
                <p className="lp-texte max-w-[62ch] pb-6 pr-10">{item.r}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
