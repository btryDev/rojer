"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChampBoard } from "@/components/ui-kit";
import type { TitreActionState } from "@/lib/salaries/actions";
import { LABEL_PERIODICITE } from "@/lib/calendrier/labels";
import type { Periodicite } from "@/lib/referentiels/types-communs";

type TitreDuCatalogue = {
  id: string;
  libelle: string;
  /** Optionnelle au référentiel : toutes les obligations n'en portent pas. */
  description?: string;
  pieceMedicale: boolean;
  /**
   * Nécessaire pour dire la vérité sur le champ « Valable jusqu'au ».
   *
   * L'aide de ce champ promettait « Rojer n'inventera pas d'échéance ». La
   * promesse était vraie par coïncidence : le seul titre du catalogue portait
   * une périodicité `autre`, pour laquelle le générateur ne calcule rien. Dès
   * qu'un titre porte une durée chiffrée, le générateur calcule bel et bien
   * `delivreLe + periodicite` quand l'échéance est laissée vide
   * (`calendrier/generateur.ts`), et la promesse devenait fausse.
   */
  periodicite: Periodicite;
  /**
   * La phrase de la mention de rythme retenu (ADR-039), quand le rythme n'est
   * pas écrit par le texte : l'aide ne doit pas alors parler de « la durée
   * écrite dans le texte ».
   */
  rythmeRetenu?: string | null;
  /** Le Code renvoie le rythme aux normes sans l'écrire (R. 4544-10). */
  renvoiAuxNormes?: string | null;
  /**
   * Le titre déjà déclaré sur cette personne que le droit interdit de cumuler
   * avec celui-ci, et la phrase qui le fonde. Calculé côté serveur — la
   * fermeture par symétrie de la table vit dans `lib/salaries/catalogue.ts`,
   * et ce composant n'a pas à la refaire.
   *
   * Absent = rien ne s'oppose, ce qui est le cas de la quasi-totalité du
   * catalogue.
   */
  bloquePar?: { libelle: string; motif: string };
  /**
   * Le rang du titre dans la liste (refonte du 2026-10-24) : ce qui manque à
   * cette personne d'abord, puis le suivi médical, puis le reste. Le libellé
   * seul se lit dans la liste ; la description ne s'ouvre que pour le titre
   * choisi — quatorze paragraphes de loi d'un coup ne se lisaient pas.
   */
  groupe: GroupeTitre;
  /** Le dessin et son fond (`illustration-titre.ts`). */
  dessin: { src: string; fond: string };
  /** Le rythme en quelques mots, sous le libellé (`rythmeEnBref`). */
  rythme: string;
};

export type GroupeTitre = "attendu" | "medical" | "poste";

const LIBELLE_GROUPE: Record<GroupeTitre, string> = {
  attendu: "Ce qui manque à cette personne",
  medical: "Visites et attestations médicales",
  poste: "Formations et habilitations",
};

const ORDRE_GROUPES: GroupeTitre[] = ["attendu", "medical", "poste"];

/**
 * Les titres dont la visite produit un avis d'aptitude : l'examen médical du
 * suivi individuel renforcé (R. 4624-25), dont la visite annuelle de la
 * catégorie A est le renouvellement (R. 4451-82). Une visite d'information et
 * de prévention donne une attestation de suivi (R. 4624-14), la visite
 * intermédiaire est faite par un professionnel de santé : leur dire « l'avis
 * d'aptitude vous est transmis » annonçait un document qui n'existe pas.
 */
const DELIVRENT_UN_AVIS_D_APTITUDE = new Set([
  "sante-travail-salarie-sir",
  "sante-travail-salarie-sir-categorie-a",
]);

/**
 * La déclaration d'un titre détenu.
 *
 * C'est l'écran où la frontière sur la santé se tient, ou ne se tient pas.
 *
 * Le dossier médical en santé au travail appartient au service de prévention,
 * pas à l'employeur : celui-ci ne reçoit que l'avis d'aptitude, les
 * propositions d'aménagement et les restrictions — aucun élément de
 * diagnostic, jamais (L. 4624-8, R. 4624-55).
 *
 * Ce formulaire **n'offre aucun dépôt de fichier**, sur aucun titre — pas
 * seulement sur les médicaux. Dans ce module, il n'y a rien à déposer :
 * l'outil enregistre qu'un titre existe et ses dates, un point. Et sur un
 * titre marqué `pieceMedicale`, il dit en plus pourquoi.
 *
 * `src/lib/rgpd/frontiere-medicale.test.ts` le tient par
 * `depotDansLeModuleSalarie`, qui interdit franchement toute surface de dépôt
 * sous `lib/salaries/`, `components/salaries/` et `equipe/`. Ajouter un
 * `EvidenceDropzone` ici fait échouer ce test — vérifié le 2026-08-27 en
 * l'ajoutant pour de bon.
 *
 * La première version de cette garantie ne tenait pas. Elle demandait que
 * `pieceMedicale` soit *mentionné* dans le fichier, ce que ce formulaire fait
 * pour son encart — si bien qu'un dépôt posé juste à côté passait au vert.
 *
 * La règle du produit est plus stricte que le droit : `R. 4544-11-1` autorise
 * expressément l'employeur à conserver copie de l'attestation. Le choix est
 * assumé — un outil qui héberge des pièces médicales de salariés change de
 * nature réglementaire, pour une valeur ajoutée nulle (`docs/rgpd.md` § 2.3).
 */
/**
 * Les périodicités pour lesquelles le générateur ne calcule aucune échéance —
 * `PERIODICITE_EN_JOURS` y vaut `null`. Sur ces titres-là, et sur eux seuls,
 * la promesse « Rojer n'inventera pas d'échéance » est vraie.
 */
const SANS_DUREE = new Set<Periodicite>(["autre", "mise_en_service_uniquement"]);

export function FormulaireTitre({
  catalogue,
  action,
  dejaDeclares,
  initial,
  onSucces,
}: {
  catalogue: TitreDuCatalogue[];
  action: (
    prev: TitreActionState,
    formData: FormData,
  ) => Promise<TitreActionState>;
  /** Les obligations déjà portées — redéclarer vaut renouvellement. */
  dejaDeclares: string[];
  /** Le titre présélectionné quand on arrive d'un « Déclarer » ou « Renouveler ». */
  initial?: string;
  /** Appelé après un enregistrement réussi — la modale se ferme. */
  onSucces?: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    TitreActionState,
    FormData
  >(action, { status: "idle" });

  // Le premier titre DÉCLARABLE, pas le premier de la liste : présélectionner
  // un titre bloqué offrirait un formulaire dont l'envoi est refusé d'avance.
  // Dans l'ordre AFFICHÉ — ce qui manque d'abord —, pas celui du catalogue.
  const ordonne = ORDRE_GROUPES.flatMap((g) => catalogue.filter((o) => o.groupe === g));
  const [choisi, setChoisi] = useState<string>(
    (initial && catalogue.some((o) => o.id === initial && !o.bloquePar)
      ? initial
      : (ordonne.find((o) => !o.bloquePar) ?? ordonne[0])?.id) ?? "",
  );
  const titre = catalogue.find((o) => o.id === choisi);
  const renouvellement = dejaDeclares.includes(choisi);
  const bloque = titre?.bloquePar;

  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    // Vider le formulaire après un enregistrement réussi : sans cela, les
    // dates de la déclaration précédente restent dans les champs et la
    // suivante part d'une valeur qui n'a rien à voir.
    //
    // `form.reset()` plutôt qu'une clé de remontage incrémentée dans l'effet :
    // appeler `setState` depuis un effet déclenche un second rendu en cascade,
    // et ici il n'y a rien à recalculer — seulement des champs à vider.
    if (state.status === "success") {
      formRef.current?.reset();
      onSucces?.();
    }
  }, [state, onSucces]);

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="grid grid-cols-1 md:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]"
    >
      <fieldset className="m-0 min-w-0 border-0 bg-[color:var(--board-slate-pale)] px-5 py-6 sm:px-6">
        <legend className="sr-only">Quel titre ?</legend>
        {ORDRE_GROUPES.map((g) => {
          const titres = catalogue.filter((o) => o.groupe === g);
          if (titres.length === 0) return null;
          return (
            <div key={g} className="mb-5 last:mb-0">
              <p className="m-0 mb-2 px-1 text-[12.5px] font-semibold text-[color:var(--board-slate-ink)]">
                {LIBELLE_GROUPE[g]}
              </p>
              <div className="flex flex-col gap-1">
                {titres.map((o) => (
                  /* Le titre exclu reste AFFICHÉ, désactivé, avec la raison. Le
                     retirer de la liste aurait été le silence que ce dépôt
                     refuse : un dirigeant qui cherche « Visite d'information et
                     de prévention » et ne la trouve pas conclut que Rojer ne la
                     connaît pas, alors que le droit la lui interdit ici — et
                     c'est précisément ce qu'il a besoin de savoir. */
                  <label
                    key={o.id}
                    className={
                      o.bloquePar
                        ? "flex items-start gap-3 rounded-[18px] px-2.5 py-2 opacity-60"
                        : "flex cursor-pointer items-center gap-3 rounded-[18px] px-2.5 py-2 transition-colors hover:bg-[color:var(--board-card)] has-[:checked]:bg-[color:var(--board-card)] has-[:checked]:shadow-[0_0_0_1.5px_var(--board-ink)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[color:var(--board-blue-strong)]"
                    }
                  >
                    <input
                      type="radio"
                      name="obligationId"
                      value={o.id}
                      checked={choisi === o.id}
                      onChange={() => setChoisi(o.id)}
                      disabled={o.bloquePar !== undefined}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className="grid size-10 flex-none place-items-center rounded-[13px]"
                      style={{ background: o.dessin.fond }}
                    >
                      <Image src={o.dessin.src} alt="" width={30} height={30} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold leading-[1.3] text-[color:var(--board-ink)]">
                        {o.libelle}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] leading-[1.4] text-[color:var(--board-slate-mid)]">
                        {o.bloquePar
                          ? `Incompatible avec « ${o.bloquePar.libelle} », déjà déclaré.`
                          : dejaDeclares.includes(o.id)
                            ? `Déjà déclaré · ${o.rythme}`
                            : o.rythme}
                      </span>
                      {/* Le motif cite le texte qui écarte le cumul : il se
                          déplie, il ne remplit pas la liste. */}
                      {o.bloquePar && (
                        <details className="mt-1 text-[11.5px] leading-[1.45]">
                          <summary className="cursor-pointer text-[color:var(--board-blue-ink)]">
                            Pourquoi
                          </summary>
                          <span className="mt-1 block text-[color:var(--board-slate-mid)]">
                            {o.bloquePar.motif}
                          </span>
                        </details>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })}
        {err("obligationId") && (
          <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {err("obligationId")}
          </p>
        )}
      </fieldset>

      {/* Le titre choisi reste en vue pendant qu'on parcourt la liste. */}
      <div className="flex min-w-0 flex-col gap-5 self-start px-6 py-6 sm:px-8 md:sticky md:top-0">
        {titre && (
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="grid size-[68px] flex-none place-items-center rounded-[23px]"
              style={{ background: titre.dessin.fond }}
            >
              <Image src={titre.dessin.src} alt="" width={52} height={52} />
            </span>
            <div className="min-w-0">
              <h3 className="board-titre m-0 text-[19px]">{titre.libelle}</h3>
              <p className="m-0 mt-1 text-[12.5px] text-[color:var(--board-slate-mid)]">
                {titre.rythme}
              </p>
            </div>
          </div>
        )}
        {titre?.description && (
          <p className="m-0 max-w-[62ch] text-[12.5px] leading-[1.6] text-[color:var(--board-slate-mid)]">
            {titre.description}
          </p>
        )}

        {titre?.pieceMedicale && (
          <div className="flex gap-3 rounded-[18px] bg-[color:var(--board-blue-pale)] px-4 py-3.5">
            <ShieldAlert
              className="mt-0.5 size-4 flex-none text-[color:var(--board-blue-ink)]"
              aria-hidden
            />
            <p className="m-0 text-[12.5px] leading-[1.55] text-[color:var(--board-blue-ink)]">
              <strong>Ne déposez pas le document.</strong>{" "}
              Rojer enregistre
              qu&apos;une attestation ou une visite a eu lieu, sa date et son
              échéance — rien d&apos;autre.{" "}
              {DELIVRENT_UN_AVIS_D_APTITUDE.has(titre.id)
                ? "L'avis d'aptitude vous est transmis et vous le conservez de votre côté (art. R. 4624-55) : Rojer n'en garde pas copie."
                : "Vous conservez le document de votre côté : Rojer n'en garde pas copie."}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="delivreLe"
            name="delivreLe"
            label="Délivré le"
            type="date"
            requis
            erreur={err("delivreLe")}
          />
          <ChampBoard
            id="echeanceLe"
            name="echeanceLe"
            label="Valable jusqu'au"
            type="date"
            erreur={err("echeanceLe")}
            aide={
              titre && LABEL_PERIODICITE[titre.periodicite] && !SANS_DUREE.has(titre.periodicite)
                ? titre.rythmeRetenu
                  ? `Si le document porte une date de fin, saisissez-la : elle prime toujours. Laissée vide, Rojer la calcule à partir de la date de délivrance et d'un rythme que le texte n'écrit pas (${LABEL_PERIODICITE[titre.periodicite]}). ${titre.rythmeRetenu}`
                  : `Si le document porte une date de fin, saisissez-la : elle prime toujours. Laissée vide, Rojer la calcule à partir de la date de délivrance et de la durée écrite dans le texte (${LABEL_PERIODICITE[titre.periodicite]}) — une durée qui est souvent un maximum légal, que le service de santé au travail peut avoir raccourci.`
                : titre?.renvoiAuxNormes
                  ? `Laissez vide si aucune date n'est portée sur le titre. ${titre.renvoiAuxNormes}`
                  : "Laissez vide si aucune date n'est portée sur le titre. Aucun texte ne donne de durée de validité à ce titre : Rojer n'inventera pas d'échéance."
            }
          />
        </div>

        <ChampBoard
          id="note"
          name="note"
          label="Repère"
          maxLength={500}
          placeholder="Ex : organisme, niveau d'habilitation, n° de certificat"
          erreur={err("note")}
          aide="Pour vous y retrouver. Jamais un élément de santé."
        />

        {state.status === "error" && !state.fieldErrors && (
          <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
            {state.message}
          </p>
        )}

        <div className="mt-auto">
          <Button
            variant="board"
            size="board"
            type="submit"
            disabled={pending || catalogue.length === 0 || bloque !== undefined}
          >
            {pending
              ? "Enregistrement…"
              : renouvellement
                ? "Enregistrer le renouvellement"
                : "Déclarer ce titre"}
          </Button>
          {renouvellement && !pending && (
            <p className="m-0 mt-2 text-[12px] text-[color:var(--board-slate-mid)]">
              Ce titre est déjà déclaré : l&apos;enregistrement remplacera ses
              dates par celles-ci.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
