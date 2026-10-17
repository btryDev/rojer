"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import {
  creerBatiment,
  modifierBatiment,
  supprimerBatiment,
  type BatimentActionState,
} from "@/lib/batiments/actions";
import { MAX_ZONES, PLAFOND_ZONES } from "@/lib/batiments/schema";
import type { BatimentListe } from "@/lib/batiments/queries";
import { nomDeZone } from "@/lib/batiments/nom-zone";

/**
 * Les zones d'un établissement : une liste courte — trois au plus
 * (ADR-029) —, éditable sur place.
 *
 * Une zone est un lieu, rien d'autre : on la nomme, on la renomme, on la
 * supprime après avoir dit où vont ses équipements. Aucun régime ici — une
 * zone n'est pas « ERP » ou « non ERP », c'est l'établissement qui l'est,
 * pour toutes ses zones.
 */

const ETAT_INITIAL: BatimentActionState = { status: "idle" };

/**
 * L'erreur d'un champ, ou celle du formulaire.
 *
 * Sans `champ`, elle rend le message général **et** tout ce que le serveur a
 * rejeté sur un champ que le formulaire n'affiche pas. Le formulaire ne
 * montrait que `nom` : un `complementAdresse` trop long produisait un envoi
 * sans effet et sans message — le garde-fou serveur restait muet, et
 * l'utilisateur n'avait plus qu'à deviner.
 */
function Erreur({
  state,
  champ,
}: {
  state: BatimentActionState;
  champ?: string;
}) {
  if (state.status !== "error") return null;
  const autres = Object.entries(state.fieldErrors ?? {})
    .filter(([cle]) => cle !== "nom")
    .flatMap(([, messages]) => messages);
  // Le message précis passe devant le générique : le serveur répond toujours
  // « Formulaire invalide » en plus du détail, et c'est le détail qui aide.
  const message = champ
    ? state.fieldErrors?.[champ]?.[0]
    : (autres[0] ?? state.message);
  if (!message) return null;
  return (
    <p
      role="alert"
      className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]"
    >
      {message}
    </p>
  );
}

export function BatimentsManager({
  etablissementId,
  batiments,
}: {
  etablissementId: string;
  batiments: BatimentListe[];
}) {
  return (
    <div className="flex flex-col gap-7">
      <ul className="carte-board m-0 list-none p-0">
        {batiments.map((b) => (
          <LigneBatiment
            key={b.id}
            batiment={b}
            autres={batiments.filter((a) => a.id !== b.id)}
          />
        ))}
      </ul>

      {/* La borne s'annonce AVANT la tentative. Elle était muette : on
          saisissait un quatrième nom, on cliquait, et le refus arrivait —
          en emportant la saisie. Une borne qui ne se découvre qu'en la
          heurtant n'est pas une borne, c'est un piège ; l'onboarding, lui,
          avertit en direct sur l'effectif. */}
      {batiments.length >= MAX_ZONES ? (
        <PlafondAtteint />
      ) : (
        <FormulaireAjout
          etablissementId={etablissementId}
          restantes={MAX_ZONES - batiments.length}
        />
      )}
    </div>
  );
}

/**
 * La porte annoncée fermée, plutôt qu'un formulaire qui ne peut plus
 * aboutir (charte, interdit 19).
 *
 * Registre ardoise et non ambre : rien n'est en retard ni en faute, c'est
 * une limite atteinte — l'ambre est l'attention, pas la borne (interdit 4).
 * Le refus serveur reste en place : c'est lui qui tranche, l'écran ne fait
 * que cesser de promettre.
 */
function PlafondAtteint() {
  return (
    <div className="carte-board px-7 py-6 sm:px-8">
      <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
        Ajouter une zone
      </p>
      <p className="m-0 mt-2 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
        {PLAFOND_ZONES}
      </p>
    </div>
  );
}

function LigneBatiment({
  batiment,
  autres,
}: {
  batiment: BatimentListe;
  autres: BatimentListe[];
}) {
  const [mode, setMode] = useState<"lecture" | "renommer" | "supprimer">(
    "lecture",
  );

  return (
    // Le filet appartient à la ligne, jamais à son contenu : `first:` doit
    // désigner la première ligne de la liste.
    <li className="border-t border-[color:var(--board-slate-line)] px-7 py-5 first:border-t-0 sm:px-8">
      {mode === "lecture" && (
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="m-0 text-[16px] font-semibold leading-[1.3] tracking-[-0.01em] text-[color:var(--board-ink)]">
              {nomDeZone(batiment.nom)}
            </p>
            <p className="board-eyebrow m-0 mt-1.5 text-[10px] tracking-[0.16em] text-[color:var(--board-slate-soft)]">
              {batiment.nbEquipements === 0
                ? "Aucun équipement"
                : batiment.nbEquipements === 1
                  ? "1 équipement"
                  : `${batiment.nbEquipements} équipements`}
              {batiment.complementAdresse && ` · ${batiment.complementAdresse}`}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="boardClair"
              size="boardSm"
              onClick={() => setMode("renommer")}
            >
              Renommer
            </Button>
            {autres.length > 0 && (
              <Button
                variant="boardClair"
                size="boardSm"
                onClick={() => setMode("supprimer")}
              >
                Supprimer
              </Button>
            )}
          </div>
        </div>
      )}

      {mode === "renommer" && (
        <FormulaireRenommage
          batiment={batiment}
          onFin={() => setMode("lecture")}
        />
      )}

      {mode === "supprimer" && (
        <FormulaireSuppression
          batiment={batiment}
          autres={autres}
          onFin={() => setMode("lecture")}
        />
      )}
    </li>
  );
}

function FormulaireAjout({
  etablissementId,
  restantes,
}: {
  etablissementId: string;
  /** Zones encore ajoutables — dit d'avance ce que le refus dirait après. */
  restantes: number;
}) {
  const action = creerBatiment.bind(null, etablissementId);
  const [state, formAction, pending] = useActionState(action, ETAT_INITIAL);

  return (
    <SaisieZone
      // Vider le formulaire après succès : la clé change, React remonte. Le
      // remontage est ce qui remet la saisie à blanc — et lui seul : en cas
      // de refus la clé ne bouge pas, donc ce qui a été tapé reste.
      key={state.status === "success" ? state.id : "vierge"}
      formAction={formAction}
      state={state}
      pending={pending}
      restantes={restantes}
    />
  );
}

/**
 * Les champs de l'ajout, et ce qui les fait survivre à un refus.
 *
 * React 19 remet un `<form action={…}>` à blanc dès que l'action rend la
 * main — **y compris quand elle refuse**. Le nom tapé pour une quatrième
 * zone disparaissait donc avec le message qui expliquait pourquoi elle
 * était refusée : il fallait le retaper pour lire le refus, ou renoncer.
 *
 * La parade tient à `defaultValue` : `form.reset()` ne vide pas un champ,
 * il le ramène à son défaut. En tenant le défaut synchronisé avec la
 * frappe, la remise à blanc devient un geste sans effet. Un champ
 * *contrôlé* (`value`) n'y suffit pas — vérifié : le DOM repart au défaut
 * et l'état React ne le sait pas, ce qui produit un champ et un écran qui
 * se contredisent.
 */
function SaisieZone({
  formAction,
  state,
  pending,
  restantes,
}: {
  formAction: (fd: FormData) => void;
  state: BatimentActionState;
  pending: boolean;
  restantes: number;
}) {
  const [nom, setNom] = useState("");
  const [complement, setComplement] = useState("");

  return (
    <form
      action={formAction}
      className="carte-board flex flex-col gap-5 px-7 py-6 sm:px-8"
    >
      <div>
        <p className="board-eyebrow m-0 text-[10.5px] tracking-[0.18em] text-[color:var(--board-slate-soft)]">
          Ajouter une zone
        </p>
        {/* La borne, dite avant qu'on la heurte. */}
        <p className="m-0 mt-2 text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
          {MAX_ZONES} zones au plus par établissement —{" "}
          {restantes === 1
            ? "il en reste une à poser."
            : `il en reste ${restantes} à poser.`}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <div>
          <ChampBoard
            id="nouveau-nom"
            name="nom"
            label="Nom"
            requis
            maxLength={80}
            placeholder="Ex : Réserve, Atelier, Annexe"
            defaultValue={nom}
            onChange={(e) => setNom(e.target.value)}
            aria-invalid={
              state.status === "error" && Boolean(state.fieldErrors?.nom)
            }
          />
          <Erreur state={state} champ="nom" />
        </div>
        <ChampBoard
          id="nouveau-complement"
          name="complementAdresse"
          label="Complément d'adresse"
          maxLength={200}
          placeholder="Facultatif — si la zone a sa propre entrée"
          defaultValue={complement}
          onChange={(e) => setComplement(e.target.value)}
        />
      </div>
      {state.status === "error" && !state.fieldErrors?.nom && (
        <Erreur state={state} />
      )}
      <div>
        <Button type="submit" variant="board" size="boardSm" disabled={pending}>
          {pending ? "Ajout…" : "Ajouter"}
        </Button>
      </div>
    </form>
  );
}

function FormulaireRenommage({
  batiment,
  onFin,
}: {
  batiment: BatimentListe;
  onFin: () => void;
}) {
  const action = modifierBatiment.bind(null, batiment.id);
  const [state, formAction, pending] = useActionState(
    async (prev: BatimentActionState, fd: FormData) => {
      const r = await action(prev, fd);
      if (r.status === "success") onFin();
      return r;
    },
    ETAT_INITIAL,
  );

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <ChampBoard
            id={`nom-${batiment.id}`}
            name="nom"
            label="Nom"
            requis
            maxLength={80}
            defaultValue={nomDeZone(batiment.nom)}
            autoFocus
          />
          <Erreur state={state} champ="nom" />
        </div>
        <ChampBoard
          id={`complement-${batiment.id}`}
          name="complementAdresse"
          label="Complément d'adresse"
          maxLength={200}
          defaultValue={batiment.complementAdresse ?? ""}
        />
      </div>
      {state.status === "error" && !state.fieldErrors?.nom && (
        <Erreur state={state} />
      )}
      <div className="flex gap-2">
        <Button type="submit" variant="board" size="boardSm" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button
          type="button"
          variant="boardClair"
          size="boardSm"
          onClick={onFin}
        >
          Annuler
        </Button>
      </div>
    </form>
  );
}

function FormulaireSuppression({
  batiment,
  autres,
  onFin,
}: {
  batiment: BatimentListe;
  autres: BatimentListe[];
  onFin: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [destination, setDestination] = useState(autres[0]?.id ?? "");
  const [erreur, setErreur] = useState<string | null>(null);
  const aContenu = batiment.nbEquipements > 0;

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 max-w-[66ch] text-[13.5px] leading-[1.6] text-[color:var(--board-ink)]">
        {aContenu ? (
          <>
            <strong>{nomDeZone(batiment.nom)}</strong> contient{" "}
            {batiment.nbEquipements === 1
              ? "un équipement"
              : `${batiment.nbEquipements} équipements`}
            . Ils seront déplacés — avec leurs vérifications et leurs rapports —
            vers la zone que vous choisissez. Rien n&apos;est supprimé.
          </>
        ) : (
          <>
            Supprimer <strong>{nomDeZone(batiment.nom)}</strong>{" "}
            ? Ce qui pourrait encore
            s&apos;y rattacher (équipement retiré du parc, point de relevé,
            permis, plan de prévention) sera déplacé vers la zone que vous
            choisissez.
          </>
        )}
      </p>

      <div className="max-w-sm">
        <label className="label-board" htmlFor={`dest-${batiment.id}`}>
          Déplacer vers
        </label>
        <select
          id={`dest-${batiment.id}`}
          value={destination}
          onChange={(e) => setDestination(e.currentTarget.value)}
          className="champ-board"
        >
          {autres.map((a) => (
            <option key={a.id} value={a.id}>
              {nomDeZone(a.nom)}
            </option>
          ))}
        </select>
      </div>

      {erreur && (
        <p
          role="alert"
          className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]"
        >
          {erreur}
        </p>
      )}

      <div className="flex gap-2">
        <Button
          variant="board"
          size="boardSm"
          disabled={pending}
          onClick={() => {
            setErreur(null);
            startTransition(async () => {
              const r = await supprimerBatiment(batiment.id, destination);
              if (r.status === "error") setErreur(r.message);
              else onFin();
            });
          }}
        >
          {pending
            ? "Suppression…"
            : aContenu
              ? "Déplacer et supprimer"
              : "Supprimer"}
        </Button>
        <Button
          type="button"
          variant="boardClair"
          size="boardSm"
          onClick={onFin}
        >
          Annuler
        </Button>
      </div>
    </div>
  );
}
