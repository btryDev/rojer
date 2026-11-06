"use client";
// La saisie fermée annoncée DÈS L'OUVERTURE (ADR-053 § 14, lot D) : un
// formulaire qui écrit ne part plus pour être refusé après coup — React
// efface la saisie au retour, même en refus. Ses boutons d'envoi sont
// désactivés dès l'ouverture (`aria-disabled`, et le motif en description
// pour un lecteur d'écran) ; un clic n'envoie rien et dit pourquoi, près du
// bouton. Les formulaires de lecture (filtres) restent ouverts, comme ceux
// marqués `data-saisie-ouverte` (demander de l'aide, se déconnecter). Le
// refus du serveur reste le filet.
//
// Deux formes :
// - `FermerLaSaisie` enveloppe ce qu'elle ferme (une création au plafond, une
//   fiche gelée) : sa zone est la sienne, rendue côté serveur ;
// - `VerrouDeLaPage`, frère des pages dans une mise en page (`data-zone-saisie`),
//   ferme toute la page — panneaux en portail compris (`data-portail-saisie`) —
//   sans retarder son rendu.

import { useEffect, useId, useRef, useState } from "react";
import { BandeauAbonnement } from "@/components/abonnements/BandeauAbonnement";

/** Un formulaire qui écrit : une server action (React pose `javascript:` ou `POST`). */
export function formulaireQuiEcrit(form: HTMLFormElement): boolean {
  if (form.hasAttribute("data-saisie-ouverte")) return false;
  return (form.getAttribute("method") ?? "").toLowerCase() === "post" || (form.getAttribute("action") ?? "").startsWith("javascript:");
}

const BOUTONS_D_ENVOI = 'button:not([type="button"]), input[type="submit"]';
type Alerte = { haut: number; gauche: number } | null;

/**
 * Le verrou d'une portée : `racine` (où chercher les formulaires et écouter),
 * `garde` (ceux qui en relèvent). Désactive leurs boutons d'envoi tant que le
 * motif tient — ceux qui apparaissent ensuite aussi — et arrête leur envoi en
 * capture, avant que React ne le prenne ; rend la position de l'alerte.
 */
function useVerrou(motif: string | null, racine: () => ParentNode | null, garde: (form: HTMLFormElement) => boolean, descriptionId: string) {
  const [alerte, setAlerte] = useState<Alerte>(null);
  useEffect(() => {
    const r = racine();
    if (!motif || !r) return;
    const marques = new Set<Element>();
    const marquer = () => {
      for (const form of r.querySelectorAll("form"))
        if (formulaireQuiEcrit(form) && garde(form))
          for (const bouton of form.querySelectorAll(BOUTONS_D_ENVOI)) {
            if (marques.has(bouton)) continue;
            bouton.setAttribute("aria-disabled", "true");
            bouton.setAttribute("aria-describedby", descriptionId);
            marques.add(bouton);
          }
    };
    marquer();
    const observateur = new MutationObserver(marquer);
    observateur.observe(document.body, { childList: true, subtree: true });
    const arreter = (e: Event) => {
      const form = e.target;
      if (!(form instanceof HTMLFormElement) || !formulaireQuiEcrit(form) || !garde(form)) return;
      e.preventDefault();
      // Immédiat : un second verrou (zone imbriquée) n'alerte pas deux fois.
      e.stopImmediatePropagation();
      const bouton = (e as SubmitEvent).submitter ?? form.querySelector(BOUTONS_D_ENVOI);
      const p = bouton?.getBoundingClientRect();
      setAlerte(p ? { haut: Math.max(8, p.top - 8), gauche: Math.max(8, p.left) } : { haut: 8, gauche: 8 });
    };
    document.addEventListener("submit", arreter, true);
    return () => {
      observateur.disconnect();
      document.removeEventListener("submit", arreter, true);
      for (const bouton of marques) {
        bouton.removeAttribute("aria-disabled");
        bouton.removeAttribute("aria-describedby");
      }
    };
    // `racine` et `garde` suivent la zone, stable pour un motif donné.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motif, descriptionId]);
  useEffect(() => {
    if (!alerte) return;
    const t = setTimeout(() => setAlerte(null), 6000);
    return () => clearTimeout(t);
  }, [alerte]);
  return alerte;
}

/** Le motif pour un lecteur d'écran, et l'alerte au clic, près du bouton. */
function Explication({ id, motif, alerte }: { id: string; motif: string | null; alerte: Alerte }) {
  if (!motif) return null;
  return (
    <>
      <span id={id} hidden>
        {motif}
      </span>
      {alerte ? (
        <p
          role="alert"
          className="fixed z-50 m-0 max-w-[min(420px,calc(100vw-16px))] -translate-y-full rounded-[14px] px-4 py-2.5 text-[13px] leading-[1.4] shadow-lg"
          style={{
            top: alerte.haut,
            left: alerte.gauche,
            background: "var(--board-signal-wash)",
            boxShadow: "0 0 0 1px var(--board-signal-line)",
            color: "var(--board-signal-ink)",
          }}
        >
          Non envoyé : {motif}
        </p>
      ) : null}
    </>
  );
}

export function FermerLaSaisie({
  motif,
  className = "mb-4",
  children,
}: {
  motif: string | null;
  className?: string;
  children: React.ReactNode;
}) {
  const zone = useRef<HTMLDivElement>(null);
  const id = useId();
  const alerte = useVerrou(motif, () => zone.current, (form) => zone.current?.contains(form) ?? false, id);
  return (
    <div ref={zone} data-zone-saisie data-saisie-fermee={motif ? "" : undefined} className="contents">
      {motif ? <BandeauAbonnement bandeau={{ ton: "ferme", message: motif }} className={className} /> : null}
      <Explication id={id} motif={motif} alerte={alerte} />
      {children}
    </div>
  );
}

/**
 * La place du bandeau d'une page : la bande du haut, à gauche de la gélule du
 * compte — le seul endroit que l'en-tête de page ne recouvre pas (il remonte
 * sous la bande, `.sous-la-gelule`). Sur téléphone, en bas. La même que le
 * bandeau de l'abonnement (`BandeauAbonnementDuCompte`), qui ne s'affiche pas
 * en même temps (`saisieFermeeDuSite`).
 */
const DANS_LA_BANDE =
  "fixed inset-x-3 bottom-[calc(var(--reserve-nav-bas)+0.75rem)] z-40 " +
  "md:absolute md:inset-x-auto md:bottom-auto md:left-[var(--board-gutter)] md:top-[19px] md:w-fit " +
  "md:max-w-[calc(100%-var(--board-gutter)*2-9rem)]";

export function VerrouDeLaPage({ motif, annonce = false }: { motif: string | null; annonce?: boolean }) {
  const repere = useRef<HTMLSpanElement>(null);
  const id = useId();
  const zone = () => repere.current?.closest<HTMLElement>("[data-zone-saisie]") ?? null;
  // Sur le document : un panneau en portail sort de la zone dans le DOM, pas de la page.
  const alerte = useVerrou(motif, () => (zone() ? document : null), (form) => (zone()?.contains(form) ?? false) || form.closest("[data-portail-saisie]") !== null, id);
  useEffect(() => {
    const z = zone();
    if (!z || !motif) return;
    z.dataset.saisieFermee = "";
    return () => {
      delete z.dataset.saisieFermee;
    };
  }, [motif]);
  return (
    <>
      <span ref={repere} hidden />
      <Explication id={id} motif={motif} alerte={alerte} />
      {motif && annonce ? <BandeauAbonnement bandeau={{ ton: "ferme", message: motif }} compact className={DANS_LA_BANDE} /> : null}
    </>
  );
}
