"use client";

// La barre de compte — en haut à droite du shell d'établissement.
//
// **Ce n'est plus une barre** depuis le 2026-10-25 : la bande a été retirée,
// seule la gélule reste, flottante au-dessus du contenu (voir le rendu). Le
// nom est gardé parce que les ADR-015, 028 et 030 citent ce fichier ; « barre
// haute » s'y lit désormais « gélule de compte ».
//
// **Pourquoi elle existe.** La règle qui régit la cohabitation d'une sidebar
// et d'une barre haute est un partage des rôles, pas un remplissage : la
// sidebar porte la **hiérarchie de navigation du produit**, la barre haute
// porte les **utilitaires globaux** — retour à l'accueil, compte, session.
// Tant que le compte vivait en pied de rail, la barre n'aurait rien eu à
// porter et aurait été une bande vide ; c'est ce déménagement qui la
// justifie.
//
// **Ce qu'elle ne porte pas, et pourquoi.** Ni recherche ni notifications :
// le produit n'en a pas, et poser une loupe morte serait pire que rien.
//
// **Ce qu'elle porte depuis l'ADR-028, et pourquoi elle ne le portait pas.**
// Le sélecteur d'établissement. Ce commentaire disait exactement l'inverse
// jusqu'au 2026-09-01 : « `Etablissement.entrepriseId` est `@unique`, une
// entreprise en a exactement un, il n'y a rien à commuter. » Le motif était
// juste et il a cessé de l'être le jour où le `@unique` est tombé — un
// dirigeant qui tient deux commerces ne veut pas deux comptes. C'est le bon
// endroit pour commuter : « où je travaille » est un repère de session, comme
// « qui je suis », pas une branche de la hiérarchie du produit.
//
// Le sélecteur ne s'affiche qu'à partir de deux établissements — même sobriété
// que le filtre par bâtiment (`estMultiEtablissements`). « Ajouter un
// établissement » ne suit PAS cette règle : elle bascule dans le menu du compte
// quand le sélecteur est absent, faute de quoi le compte mono-établissement
// n'aurait aucune porte vers le second — et c'est le seul à en avoir besoin.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Building2, Check, HelpCircle, Home, LogOut, Plus } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { choisirEtablissementActif } from "@/lib/etablissements/actions";
import { estMultiEtablissements } from "@/lib/etablissements/selection";

export type EtablissementCommutable = { id: string; raisonDisplay: string };

/** Le seul menu ouvert à la fois — deux panneaux flottants côte à côte se
 *  recouvriraient, et fermer l'un en ouvrant l'autre est ce qu'on attend. */
type MenuOuvert = null | "etablissements" | "compte";

/** L'entrée « Ajouter un établissement », rendue dans l'un ou l'autre menu. */
function LienAjouter({ onNavigate }: { onNavigate: () => void }) {
  return (
    <Link
      href="/etablissements/nouveau"
      role="menuitem"
      onClick={onNavigate}
      className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-[13px] text-[color:var(--board-slate-ink)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]"
    >
      <Plus aria-hidden className="size-4 opacity-90" />
      <span className="flex-1 truncate">Ajouter un établissement</span>
    </Link>
  );
}

export function BarreCompte({
  etablissementId,
  email,
  etablissements = [],
}: {
  etablissementId: string;
  email: string | null;
  /** Les établissements du compte, dans l'ordre de création. */
  etablissements?: EtablissementCommutable[];
}) {
  const [ouvert, setOuvert] = useState<MenuOuvert>(null);
  const zone = useRef<HTMLDivElement>(null);
  const declencheurCompte = useRef<HTMLButtonElement>(null);
  const declencheurEtabs = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const multi = estMultiEtablissements(etablissements);
  const courant = etablissements.find((e) => e.id === etablissementId);

  // Fermeture au clic extérieur et à Échap — un menu qu'on ne peut fermer
  // qu'en rouvrant son déclencheur est un piège, au clavier comme à la
  // souris.
  useEffect(() => {
    if (!ouvert) return;
    const auClic = (e: MouseEvent) => {
      if (!zone.current?.contains(e.target as Node)) setOuvert(null);
    };
    const auClavier = (e: KeyboardEvent) => {
      // Échap rend le focus au déclencheur : sans ça, le menu se fermait et
      // le focus restait sur un élément disparu — la tabulation suivante
      // repartait du haut du document.
      if (e.key === "Escape") {
        const declencheur =
          ouvert === "compte" ? declencheurCompte : declencheurEtabs;
        setOuvert(null);
        declencheur.current?.focus();
      }
    };
    document.addEventListener("mousedown", auClic);
    document.addEventListener("keydown", auClavier);
    return () => {
      document.removeEventListener("mousedown", auClic);
      document.removeEventListener("keydown", auClavier);
    };
  }, [ouvert]);

  // Le focus entre dans le menu à l'ouverture, sur sa première commande :
  // un menu qu'on ouvre au clavier et qu'il faut ensuite chercher à la
  // tabulation n'est pas ouvert, il est seulement affiché.
  useEffect(() => {
    if (!ouvert) return;
    menu.current
      ?.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')
      ?.focus();
  }, [ouvert]);

  const initiales = (email ?? "??").slice(0, 2).toUpperCase();

  const separateur = (
    // Le filet qui les sépare : sans lui, deux ronds accolés dans une gélule
    // se lisent comme un seul contrôle à deux états.
    <span
      aria-hidden
      className="h-[15px] w-px flex-none bg-[color:rgba(13,18,36,.16)]"
    />
  );

  const rondDeGelule =
    "grid size-9 place-items-center rounded-full text-[color:var(--board-slate-mid)] transition-[background-color,color,transform] duration-150 hover:bg-[color:var(--board-card)] hover:text-[color:var(--board-ink)] hover:shadow-[0_1px_2px_rgba(13,18,36,.06)] active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-ink)]";

  // `z-50` n'est pas décoratif : sans lui, ce panneau passait SOUS les cartes
  // du tableau de bord. Un élément positionné sans `z-index` se range derrière
  // tout élément positionné qui en porte un, et les widgets du board en portent
  // deux — `z-10` sur leur poignée, `z-20` sur leur propre menu
  // (`WidgetShell.tsx`). Le sélecteur d'établissement devenait donc illisible
  // dès qu'il s'ouvrait au-dessus d'une carte, c'est-à-dire toujours.
  //
  // 50 et non 21 : la gélule coiffe l'application entière et doit passer
  // devant n'importe quelle surface, pas seulement devant celles qu'on connaît
  // aujourd'hui. Un écart d'un cran se referme au premier widget qui monte.
  const panneau =
    "absolute right-0 top-[52px] z-50 min-w-[228px] rounded-[18px] bg-[color:var(--board-card)] p-2 shadow-[0_0_0_1px_rgba(13,18,36,.08),0_18px_40px_-20px_rgba(13,18,36,.35)]";

  return (
    // Plus de bande (2026-10-25, demande de la propriétaire) : la barre de
    // 67 px, fond de carte et filet, laissait une bande blanche vide sur toute
    // la largeur au-dessus de chaque page. Il ne reste que la gélule, posée en
    // haut à droite AU-DESSUS du contenu — l'en-tête de page monte donc
    // jusqu'en haut de l'écran. Le parent doit être positionné (`relative`) :
    // c'est le conteneur de droite des deux shells, qui défile, si bien que
    // la gélule défile avec la page au lieu de la masquer en restant collée.
    //
    // `z-50` : au-dessus des barres collantes (celle de l'année du calendrier,
    // `z-20` ; ~~`AppTopbar`~~, supprimée le 2026-10-25) et des
    // widgets du board — voir `panneau` plus haut.
    <div className="absolute right-[var(--board-gutter)] top-3 z-50">
      {/* La gélule : le lieu où l'on revient, celui où l'on travaille, et
          celui à qui l'on revient. Les trois sont des repères de session —
          les séparer les ferait lire comme des fonctions sans rapport. */}
      <div ref={zone} className="relative">
        {/* L'ombre remplace la bande : posée sur une photo ou une carte,
            la gélule doit se lire comme un objet flottant. */}
        <div className="flex items-center gap-2 rounded-full bg-[color:var(--board-slate-pale)] p-1.5 shadow-[0_1px_2px_rgba(13,18,36,.06),0_8px_24px_-12px_rgba(13,18,36,.28)] ring-1 ring-inset ring-[color:rgba(13,18,36,.06)]">
          <Link
            href={`/etablissements/${etablissementId}`}
            aria-label="Retour au tableau de bord"
            title="Tableau de bord"
            className={rondDeGelule}
          >
            <Home aria-hidden className="size-[17px]" />
          </Link>

          {separateur}

          {multi ? (
            <>
              {/* Le sélecteur d'établissement — troisième contrôle de la
                  gélule, et le seul qui change de sens selon le compte. Il ne
                  porte pas le nom en clair : à cette taille il serait tronqué
                  au deuxième mot, et la sidebar l'affiche déjà en entier sous
                  la marque. L'icône ouvre, le menu nomme. */}
              <button
                ref={declencheurEtabs}
                type="button"
                onClick={() =>
                  setOuvert((v) => (v === "etablissements" ? null : "etablissements"))
                }
                aria-expanded={ouvert === "etablissements"}
                aria-haspopup="menu"
                aria-label={
                  courant
                    ? `Établissement : ${courant.raisonDisplay}. Changer d'établissement`
                    : "Changer d'établissement"
                }
                title="Changer d'établissement"
                className={rondDeGelule}
              >
                <Building2 aria-hidden className="size-[17px]" />
              </button>

              {separateur}
            </>
          ) : null}

          {/* L'avatar est le dernier bouton de la gélule, pas une pastille
              posée à côté : c'est lui qui ouvre le compte, la déconnexion
              vit dans son menu. */}
          <button
            ref={declencheurCompte}
            type="button"
            onClick={() => setOuvert((v) => (v === "compte" ? null : "compte"))}
            aria-expanded={ouvert === "compte"}
            aria-haspopup="menu"
            aria-label="Compte"
            className="group grid size-9 place-items-center rounded-full transition-transform duration-150 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-ink)]"
          >
            <span
              aria-hidden
              className="grid size-9 place-items-center rounded-full bg-[color:var(--board-ink)] indent-[0.08em] font-mono text-[11px] font-medium leading-none tracking-[0.08em] text-white transition-opacity duration-150 group-hover:opacity-90"
            >
              {initiales}
            </span>
          </button>
        </div>

        {ouvert === "etablissements" ? (
          <div ref={menu} role="menu" aria-label="Établissements" className={panneau}>
            <div role="group" aria-label="Établissements du compte">
              <p className="px-3 pb-1.5 pt-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                Établissements
              </p>

              {etablissements.map((etab) => {
                const actif = etab.id === etablissementId;
                return (
                  // Un `form` par entrée, et non un lien : commuter POSE UN
                  // COOKIE, ce qu'un GET n'a pas à faire. L'action revérifie
                  // l'appartenance côté serveur — l'identifiant part d'ici,
                  // donc du client.
                  <form
                    key={etab.id}
                    action={choisirEtablissementActif.bind(null, etab.id)}
                  >
                    <button
                      type="submit"
                      role="menuitem"
                      aria-current={actif ? "true" : undefined}
                      className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-[13px] text-[color:var(--board-slate-ink)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]"
                    >
                      {/* La coche occupe sa place même absente : sans elle, les
                          libellés se décaleraient d'une ligne à l'autre. */}
                      <Check
                        aria-hidden
                        className={`size-4 flex-none ${actif ? "opacity-90" : "opacity-0"}`}
                      />
                      <span className="flex-1 truncate">{etab.raisonDisplay}</span>
                    </button>
                  </form>
                );
              })}
            </div>

            {/* Le filet sépare « commuter » de « créer » : deux gestes de
                nature différente dans un même menu. */}
            <div
              aria-hidden
              className="my-1.5 h-px bg-[color:var(--board-slate-line)]"
            />
            <LienAjouter onNavigate={() => setOuvert(null)} />
          </div>
        ) : null}

        {ouvert === "compte" ? (
          <div ref={menu} role="menu" aria-label="Compte" className={panneau}>
            {/* L'en-tête est un `group` étiqueté, pas deux paragraphes nus :
                un `role="menu"` ne contient que des `menuitem` et des
                groupes, et un lecteur d'écran annonçait sinon une structure
                qu'il ne sait pas parcourir. */}
            <div role="group" aria-label="Compte connecté">
              <p className="px-3 pb-1.5 pt-1 font-mono text-[9.5px] uppercase tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                Compte
              </p>
              <p className="truncate px-3 pb-2 text-[13px] font-medium text-[color:var(--board-ink)]">
                {email ?? "Utilisateur"}
              </p>
            </div>

            {/* Sans sélecteur dans la gélule, c'est ici la seule porte vers le
                second établissement. Elle disparaît dès qu'il existe, pour ne
                pas figurer deux fois à l'écran. */}
            {multi ? null : <LienAjouter onNavigate={() => setOuvert(null)} />}

            {/* Une commande à venir se déclare désactivée, pas absente : un
                `span aria-disabled` n'est ni annoncé ni atteignable, alors
                qu'il a l'allure d'une commande. */}
            <button
              type="button"
              role="menuitem"
              disabled
              className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-[13px] text-[color:var(--board-slate-soft)] disabled:cursor-not-allowed"
            >
              <HelpCircle aria-hidden className="size-4 opacity-70" />
              <span className="flex-1 truncate">Aide</span>
              <span className="font-mono text-[9px] uppercase tracking-[0.1em]">
                bientôt
              </span>
            </button>

            {email != null ? (
              <form action={signOutAction}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2.5 rounded-full px-3 py-2 text-left text-[13px] text-[color:var(--board-slate-ink)] transition-colors hover:bg-[color:var(--board-slate-pale)] hover:text-[color:var(--board-ink)]"
                >
                  <LogOut aria-hidden className="size-4 opacity-90" />
                  <span className="flex-1 truncate">Déconnexion</span>
                </button>
              </form>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
