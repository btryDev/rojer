import Link from "next/link";
import { BoutonContact } from "./BoutonContact";
import type { CompteLanding } from "./compte";
import { Marque } from "./Marque";
import { PAGES_LEGALES } from "./pages-legales";

// Le pied de page de la page publique, classique : la marque et le contact à
// gauche, les liens en colonnes à droite, les mentions en bas. Les ancres
// sont écrites depuis la racine (`/#tarif`) : le même pied sert aux pages
// légales.

const COLONNES_FIXES = [
  {
    titre: "Rojer",
    liens: [
      { href: "/#documents", label: "Ce que Rojer tient à jour" },
      { href: "/#avantages", label: "Ce que Rojer apporte" },
      { href: "/#outil", label: "Un outil simple" },
      { href: "/#tarif", label: "Tarif" },
    ],
  },
  {
    titre: "Informations",
    liens: PAGES_LEGALES.map((p) => ({ href: `/legal/${p.slug}`, label: p.titre })),
  },
];

/**
 * L'origine des images, dite une fois ici plutôt que sur chaque image
 * (décision de la propriétaire, 2026-11-07) : les modèles, nommés. À tenir à
 * jour avec `src/assets/landing/README.md`.
 */
const ORIGINE_IMAGES = "Photos et illustrations générées avec Krea 2 et Nano Banana Pro.";

/** La colonne « Compte » suit la session, comme le bouton de l'en-tête. */
function colonneCompte(compte?: CompteLanding) {
  return {
    titre: "Compte",
    liens: compte
      ? [{ href: compte.href, label: "Mon espace" }]
      : [
          { href: "/signup", label: "Créer un compte" },
          { href: "/login", label: "Se connecter" },
        ],
  };
}

export function SiteFooter({ compte }: { compte?: CompteLanding }) {
  const [rojer, informations] = COLONNES_FIXES;
  const colonnes = [rojer, colonneCompte(compte), informations];
  return (
    <footer className="bg-[color:var(--board-ink)] pb-10 pt-16 text-white sm:pt-20">
      <div className="lp-shell">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] lg:gap-16">
          <div>
            <Marque />
            <p className="mt-4 max-w-[36ch] text-[0.92rem] leading-[1.6] text-white/70">
              Concentrez-vous sur votre activité, Rojer coordonne la prévention
              des risques de votre structure.
            </p>
            <p className="mt-8 text-[0.95rem] font-medium">Une question, un besoin particulier ?</p>
            {/* Pas d'adresse affichée (décision de la propriétaire,
                2026-11-07) : on écrit par le formulaire. */}
            <BoutonContact className="lp-btn-blanc mt-4" />
          </div>

          <nav aria-label="Pied de page" className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
            {colonnes.map((c) => (
              <div key={c.titre}>
                <p className="text-[0.82rem] font-semibold text-white">{c.titre}</p>
                <ul className="m-0 mt-4 flex list-none flex-col gap-3 p-0">
                  {c.liens.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-[0.88rem] text-white/65 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-white/15 pt-6 text-[0.78rem] leading-[1.6] text-white/50 md:flex-row md:items-start md:justify-between md:gap-10">
          <p className="m-0">© {new Date().getFullYear()} Rojer. Hébergement dans l&apos;Union européenne.</p>
          <p className="m-0 md:text-right">
            {/* Légifrance pour les obligations, l'INRS pour les risques du
                DUERP. EUR-Lex (un seul texte) n'est pas nommé : 2026-11-07. */}
            Rojer assiste, il ne certifie pas ; référentiel construit depuis
            Légifrance et l&apos;INRS. {ORIGINE_IMAGES}
          </p>
        </div>
      </div>
    </footer>
  );
}
