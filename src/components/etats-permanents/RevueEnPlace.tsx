"use client";

// La fiche de « Ce qui doit être en place » (2026-10-20), reprise de la
// maquette validée (artifact « Atelier En place », version 13) : le dessin et
// l'état à gauche, la question à droite, trois réponses, Précédente/Suivante.
//
// UNE SEULE FICHE POUR TOUTE LA PAGE. Le fournisseur tient la liste des lignes,
// dans l'ordre de la découpe affichée, et la fiche ouverte ; chaque vignette
// (`LigneCompacte`) ne fait que demander l'ouverture. Précédente et Suivante
// parcourent la même liste.
//
// CE QUE LES TROIS RÉPONSES FONT, ET NE FONT PAS.
// - « Oui, c'est en place » : `declarerEnPlace` — une déclaration datée de
//   l'employeur, jamais une preuve (ADR-027). La phrase le dit sous les boutons.
// - « Pas encore » : retire la déclaration si elle existait, sinon ne touche à
//   rien. Rien n'est enregistré d'autre.
// - « Je ne sais pas » : montre le texte qui fonde la ligne ; un second appui
//   passe à la suite. « À revoir plus tard » n'est PAS enregistré : aucun
//   champ ne le porte, et l'inventer ici le ferait mentir au rechargement.
// Une ligne établie d'après les titres ne se déclare pas (`par-les-titres.ts`) :
// la fiche dit pourquoi et mène à Équipe, comme la ligne le faisait.

import { DemandeAide } from "@/components/assistance/DemandeAide";
import Image from "next/image";
import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { Check } from "lucide-react";
import { declarerEnPlace, retirerDeclaration } from "@/lib/etats-permanents/actions";
import type { FondementLigne } from "@/lib/etats-permanents/fondement";
import { formaterDateFr } from "@/lib/dates";
import {
  libelleReponseNeSaisPas,
  libelleReponseOui,
  phraseDeclaration,
  phraseSousLesReponses,
} from "@/lib/etats-permanents/phrases";
import { LienEffectifEntreprise } from "@/components/entreprises/LienEffectifEntreprise";
import { PastilleFondement } from "./PastilleFondement";

export type FicheLigne = {
  obligationId: string;
  libelle: string;
  question: string;
  surTitre: string;
  illustration: string;
  fond: string;
  mode: "etat" | "fait";
  /** ISO, ou `null` si non déclarée. */
  declareLe: string | null;
  pieceAttendue: string | null;
  fondement: FondementLigne | null;
  parLesTitres: { phrase: string; hrefEquipe: string; enPlace: boolean } | null;
  aConfirmer: { phrase: string; entrepriseId: string } | null;
  questionsSansReponse: { phrases: string[]; href: string; lien: string } | null;
};

const Contexte = createContext<{ ouvrir: (obligationId: string) => void } | null>(null);

export function useOuvrirFiche() {
  const c = useContext(Contexte);
  if (!c) throw new Error("useOuvrirFiche hors de <RevueEnPlace>");
  return c.ouvrir;
}

const CHECK = <Check className="size-3.5" aria-hidden />;
const ERREUR_ENREGISTREMENT =
  "Cette réponse n'a pas pu être enregistrée. Rechargez la page, puis réessayez.";

export function RevueEnPlace({
  etablissementId,
  lignes,
  parcours = true,
  children,
}: {
  etablissementId: string;
  lignes: FicheLigne[];
  /**
   * Précédente, Suivante, le « n / N » et les flèches : une REVUE qui passe
   * les lignes l'une après l'autre (« en place »). Faux sur « Évaluer les
   * risques », où une carte s'ouvre seule sous sa question (décision de la
   * propriétaire du 2026-10-24).
   */
  parcours?: boolean;
  children: ReactNode;
}) {
  const boite = useRef<HTMLDialogElement>(null);
  const [index, setIndex] = useState<number | null>(null);
  const [explique, setExplique] = useState(false);
  const [saute, setSaute] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  // La fermeture différée après « Oui » : annulée dès qu'on change de ligne,
  // qu'on ferme ou que la page part — sinon elle fermerait la fiche suivante.
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null);
  const annulerMinuterie = useCallback(() => {
    if (minuterie.current) clearTimeout(minuterie.current);
    minuterie.current = null;
    setSaute(false);
  }, []);
  useEffect(() => annulerMinuterie, [annulerMinuterie]);

  const ouvrir = useCallback(
    (obligationId: string) => {
      const k = lignes.findIndex((l) => l.obligationId === obligationId);
      if (k < 0) return;
      annulerMinuterie();
      setIndex(k);
      setExplique(false);
      setErreur(null);
      if (!boite.current?.open) boite.current?.showModal?.();
    },
    [lignes, annulerMinuterie],
  );
  const fermer = useCallback(() => boite.current?.close(), []);
  const aller = useCallback(
    (k: number) => {
      if (k < 0 || k >= lignes.length) return;
      annulerMinuterie();
      setIndex(k);
      setExplique(false);
      setErreur(null);
    },
    [lignes.length, annulerMinuterie],
  );

  const l = index === null ? null : lignes[index];
  const declare = l?.declareLe != null;

  const repondre = useCallback(
    (r: "oui" | "non" | "nsp") => {
      if (!l || pending) return;
      if (r === "nsp") {
        if (!explique) setExplique(true);
        else if (parcours && index !== null && index < lignes.length - 1) aller(index + 1);
        else fermer();
        return;
      }
      if (l.parLesTitres) return;
      setErreur(null);
      startTransition(async () => {
        // Le résultat de l'action est LU : un refus (ligne qui n'est plus
        // déclarable, page périmée) ne doit pas s'afficher « Déclaré ».
        try {
          if (r === "oui" && !declare) {
            const res = await declarerEnPlace(etablissementId, l.obligationId);
            if (res.status === "error") return setErreur(res.message);
            setSaute(true);
            minuterie.current = setTimeout(() => {
              minuterie.current = null;
              setSaute(false);
              fermer();
            }, 900);
            return;
          }
          if (r === "non" && declare) {
            const res = await retirerDeclaration(etablissementId, l.obligationId);
            if (res.status === "error") return setErreur(res.message);
          }
          fermer();
        } catch {
          setErreur(ERREUR_ENREGISTREMENT);
        }
      });
    },
    [l, pending, explique, index, lignes.length, aller, fermer, declare, etablissementId, parcours],
  );

  // Raccourcis de la maquette : 1, 2, 3, et les flèches.
  useEffect(() => {
    if (index === null) return;
    const touche = (e: KeyboardEvent) => {
      // Ni dans un champ, ni dans un panneau ouvert par-dessus (« Besoin
      // d'aide ? ») : la touche ne répond pas à la question d'en dessous.
      if (e.target instanceof HTMLElement && e.target.closest("input,textarea,select,[data-panneau-modal]")) return;
      if (e.key === "1") repondre("oui");
      else if (e.key === "2") repondre("non");
      else if (e.key === "3") repondre("nsp");
      else if (parcours && e.key === "ArrowRight") aller(index + 1);
      else if (parcours && e.key === "ArrowLeft") aller(index - 1);
    };
    window.addEventListener("keydown", touche);
    return () => window.removeEventListener("keydown", touche);
  }, [index, repondre, aller, parcours]);

  const pastilleEtat = !l ? null : l.parLesTitres ? (
    <span className={CLASSE_ETAT + (l.parLesTitres.enPlace ? ETAT_ON : ETAT_A)}>
      {l.parLesTitres.enPlace && CHECK}D&apos;après les titres
    </span>
  ) : declare ? (
    <span className={CLASSE_ETAT + ETAT_ON}>
      {CHECK}
      {phraseDeclaration(l.mode, formaterDateFr(new Date(l.declareLe!)))}
    </span>
  ) : (
    <span className={CLASSE_ETAT + ETAT_A}>À déclarer</span>
  );

  return (
    <Contexte.Provider value={{ ouvrir }}>
      {children}
      <dialog
        ref={boite}
        onClose={() => {
          annulerMinuterie();
          setIndex(null);
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) fermer();
        }}
        aria-label={l?.question ?? "Fiche"}
        className="m-auto w-[min(1000px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-auto rounded-[30px] border-0 bg-[color:var(--board-card)] p-0 shadow-[0_24px_64px_-24px_rgba(13,18,36,.45)] backdrop:bg-[rgba(10,10,10,.42)]"
      >
        {l && index !== null && (
          <div className="grid md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            {/* Le dessin et l'état */}
            <div className="relative grid min-h-[300px] place-items-center px-6 pb-10 pt-16 md:min-h-[440px]">
              <div className="absolute left-5 top-5">{pastilleEtat}</div>
              <div
                className={[
                  "grid aspect-square w-[min(300px,80%)] place-items-center rounded-[28px] transition-transform",
                  saute && "motion-safe:animate-bounce",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ background: l.fond }}
              >
                <Image src={l.illustration} alt="" width={220} height={220} />
              </div>
              {saute && (
                <span className={CLASSE_ETAT + ETAT_ON + " absolute bottom-6 left-1/2 -translate-x-1/2"}>
                  {CHECK}Déclaré en place par vous
                </span>
              )}
            </div>

            {/* La question */}
            <div className="flex min-w-0 flex-col gap-4 border-t border-[color:var(--board-slate-line)] px-7 pb-7 pt-7 md:border-l md:border-t-0 md:px-8">
              <div className="flex items-start justify-between gap-3">
                <p className="board-eyebrow m-0 pt-2 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
                  {l.surTitre}
                  {parcours && (
                    <span className="tabular-nums"> · {index + 1} / {lignes.length}</span>
                  )}
                </p>
                <button
                  type="button"
                  onClick={fermer}
                  className="shrink-0 rounded-full border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] px-4 py-[7px] text-[12.5px] font-semibold text-[color:var(--board-slate-mid)] hover:text-[color:var(--board-ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)]"
                >
                  Fermer
                </button>
              </div>

              <h2 className="board-titre m-0 text-[clamp(23px,2.2vw,30px)]">{l.question}</h2>

              {explique ? (
                <div className="flex flex-col gap-2 rounded-[22px] bg-[color:var(--board-slate-pale)] px-4 py-3.5 text-[13px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  <p className="m-0">
                    <strong className="font-semibold text-[color:var(--board-ink)]">Ce que dit le texte.</strong>{" "}
                    {l.libelle}.
                  </p>
                  {l.fondement?.extrait && <p className="m-0">« {l.fondement.extrait} »</p>}
                  {l.pieceAttendue && <p className="m-0">Écrit à garder : {l.pieceAttendue}</p>}
                  {/* « Je ne sais pas » : le doute est déclaré (2026-10-24). */}
                  <p className="m-0">
                    <DemandeAide
                      variante="lien"
                      libelle="Toujours un doute ? Un expert peut vérifier sur place."
                      categorie="diagnostic"
                      contexte={l.question}
                      etablissementId={etablissementId}
                    />
                  </p>
                </div>
              ) : (
                <p className="m-0 text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">{l.libelle}</p>
              )}

              {l.fondement && (
                <div className="flex flex-wrap items-start gap-2">
                  <PastilleFondement fondement={l.fondement} />
                </div>
              )}

              {l.aConfirmer && (
                <div className="text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  <p className="m-0">
                    <strong className="font-semibold text-[color:var(--board-ink)]">À confirmer.</strong>{" "}
                    {l.aConfirmer.phrase}
                  </p>
                  <LienEffectifEntreprise
                    entrepriseId={l.aConfirmer.entrepriseId}
                    effectif={null}
                    className="m-0 mt-1 text-[12.5px] leading-[1.5]"
                  />
                </div>
              )}
              {l.questionsSansReponse && (
                <div className="text-[12.5px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  {l.questionsSansReponse.phrases.map((p) => (
                    <p key={p} className="m-0">
                      <strong className="font-semibold text-[color:var(--board-ink)]">À confirmer.</strong> {p}
                    </p>
                  ))}
                  <Link href={l.questionsSansReponse.href} className={CLASSE_LIEN}>
                    {l.questionsSansReponse.lien}
                  </Link>
                </div>
              )}

              {l.parLesTitres ? (
                <div className="mt-auto pt-2 text-[13px] leading-[1.5] text-[color:var(--board-slate-mid)]">
                  <p className="m-0">{l.parLesTitres.phrase}</p>
                  <Link href={l.parLesTitres.hrefEquipe} className={CLASSE_LIEN}>
                    Voir les titres sur Équipe
                  </Link>
                </div>
              ) : (
                <div className="mt-auto flex flex-wrap gap-2 pt-2">
                  <button type="button" disabled={pending} onClick={() => repondre("oui")} className={BOUTON + " bg-[color:var(--board-ink)] text-[color:var(--board-card)]"}>
                    {libelleReponseOui(l.mode)} <span className={KBD}>1</span>
                  </button>
                  <button type="button" disabled={pending} onClick={() => repondre("non")} className={BOUTON + " border-[color:var(--board-blue-soft)] bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]"}>
                    Pas encore <span className={KBD}>2</span>
                  </button>
                  <button type="button" disabled={pending} onClick={() => repondre("nsp")} className={BOUTON + " border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]"}>
                    {libelleReponseNeSaisPas(explique)} <span className={KBD}>3</span>
                  </button>
                </div>
              )}

              {erreur && (
                <p role="alert" className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
                  {erreur}
                </p>
              )}
              <p className="m-0 text-[12px] text-[color:var(--board-slate-soft)]">
                {phraseSousLesReponses(declare)}
              </p>

              {parcours && (
                <div className="flex items-center justify-between gap-2">
                  <button type="button" disabled={index === 0} onClick={() => aller(index - 1)} className={NAV}>
                    ← Précédente
                  </button>
                  <button type="button" disabled={index === lignes.length - 1} onClick={() => aller(index + 1)} className={NAV}>
                    Suivante →
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </dialog>
    </Contexte.Provider>
  );
}

const CLASSE_ETAT = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-[5px] text-[12px] font-semibold ";
const ETAT_ON = "border border-[color:var(--board-slate-line)] bg-[color:var(--board-slate-pale)] text-[color:var(--board-slate-mid)]";
const ETAT_A = "border border-dashed border-[color:var(--board-blue-soft)] bg-[color:var(--board-blue-pale)] text-[color:var(--board-blue-ink)]";
const BOUTON =
  "inline-flex items-center gap-2 rounded-full border border-transparent px-[17px] py-[9px] text-[13px] font-semibold disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--board-blue-strong)]";
const KBD = "font-mono text-[10px] opacity-60";
const NAV =
  "border-0 bg-transparent px-0 py-1 text-[12.5px] font-semibold text-[color:var(--board-blue-ink)] disabled:text-[color:var(--board-slate)]";
const CLASSE_LIEN =
  "mt-1 inline-block font-semibold text-[color:var(--board-blue-ink)] hover:text-[color:var(--board-ink)]";
