"use client";

import Link from "next/link";
import { useActionState, useId, useState, type ReactNode } from "react";
import type { ModeRendezVous } from "@prisma/client";
import { CalendarDays, Check } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { MessageFormulaire } from "@/components/ui-kit/MessageFormulaire";
import {
  annulerRendezVous,
  completerRendezVous,
  reserverRendezVous,
  type RendezVousState,
} from "@/lib/assistance/rendez-vous-actions";
import {
  SUJET_RENDEZ_VOUS_MAX,
  commentSeParler,
  dateLongue,
  jourMois,
  jourSansAnnee,
  jusquAQuand,
  lesEtablissementsYPassent,
  majuscule,
  plageHoraire,
  premierJourEntier,
  type CreneauAffiche,
} from "@/lib/assistance/rendez-vous-libelles";
import { ajouterJours, cleJourCivil, joursCivilsEntre } from "@/lib/dates";
import { ChoixDuCreneau } from "./ChoixDuCreneau";
import { CoordonneesRendezVous, type Brouillon } from "./CoordonneesRendezVous";
import { CORPS, LIEN, PASTILLE, PETIT, SURTITRE, TONS_PASTILLE } from "./styles-rendez-vous";
import { useFocusAuMontage } from "./useFocusAuMontage";

export type RendezVousAffiche = {
  id: string;
  debut: string;
  fin: string;
  mode: ModeRendezVous;
  telephone: string | null;
  sujet: string | null;
  /** Qui l'a réservé (`null` : une personne qui n'est plus du compte), et quand. */
  reservePar: string | null;
  reserveLe: string;
  /** À plus de 24 h : il se déplace, s'annule, se complète encore (calculé par la page). */
  modifiable: boolean;
};

type Props = {
  etablissementId: string;
  /** L'adresse du compte, où partent la confirmation et le lien de visio. */
  email: string | null;
  /** La personne connectée. */
  moi: string | null;
  /** Les établissements du compte : le rendez-vous vaut pour tous. */
  etablissements: string[];
  /** Un membre en lecture seule voit le rendez-vous, sans le prendre ni le changer. */
  lectureSeule: boolean;
  prochain: RendezVousAffiche | null;
  /** Le rendez-vous de l'année, s'il a déjà eu lieu. */
  passe: { debut: string } | null;
  /** Le début de l'année suivante : le prochain rendez-vous se prend à partir de là. */
  finDeLAnnee: string;
  creneaux: CreneauAffiche[];
  /** La fin connue de la formule Pro, quand elle tombe avant le rendez-vous. */
  finDuPro: string | null;
  /** L'instant du rendu, lu par la page : l'écran n'a pas d'horloge. */
  maintenant: string;
  /** Le fichier `.ics` du rendez-vous à venir. */
  agenda: string;
  /** L'onglet « Poser une question ». */
  lienQuestion: string;
};

type Etape = "carte" | "choisir" | "coordonnees";
/** Le succès d'une réservation, d'un déplacement ou d'une annulation (pas de « Préparer »). */
type Succes = Extract<RendezVousState, { confirmation: boolean }>;

const IDLE: RendezVousState = { status: "idle" };

type Ton = keyof typeof TONS_PASTILLE;

/** Ce que l'étape 2 propose d'abord : la visio, ou ce que porte le rendez-vous déplacé. */
const brouillonDe = (r: RendezVousAffiche | null): Brouillon => ({
  mode: r?.mode ?? "visio",
  telephone: r?.telephone ?? "",
  sujet: r?.sujet ?? "",
});

/**
 * L'onglet « Rendez-vous annuel » de l'Assistance (ADR-063, maquette
 * « Réserver le rendez-vous de l'année », 2026-11-24) : la carte du
 * rendez-vous en tête, dans chacun de ses cas ; dessous, les deux étapes
 * (choisir un créneau, dire comment échanger) ; une fois réservé, de quoi le
 * préparer. Un seul par année d'abonnement, pour tout le compte.
 *
 * Les états de ses actions (relecture React du 2026-11-24) :
 * - un état déjà lu (`lus`) ne revient pas sur une autre étape ;
 * - la saisie de l'étape 2 (`brouillon`) survit à « Changer de créneau » ;
 * - le rendez-vous déplacé (`remplace`) est figé à l'ouverture du parcours,
 *   et un rendez-vous à venir qui change dessous (un autre membre) le ferme.
 */
export function RendezVousAnnuel(props: Props) {
  const { prochain, lectureSeule, creneaux } = props;
  const [etape, setEtape] = useState<Etape>("carte");
  const [choisi, setChoisi] = useState<CreneauAffiche | null>(null);
  const [remplace, setRemplace] = useState<string | null>(null);
  const [brouillon, setBrouillon] = useState<Brouillon>(() => brouillonDe(null));
  const [alerte, setAlerte] = useState<string | null>(null);
  const [annonce, setAnnonce] = useState<Succes | null>(null);
  // Une étape ouverte par un geste (et non au premier rendu) prend le focus.
  const [parGeste, setParGeste] = useState(false);
  const [etatReserve, reserver, reservation] = useActionState(reserverRendezVous, IDLE);
  const [etatAnnule, annuler, annulation] = useActionState(annulerRendezVous, IDLE);
  const [lus, setLus] = useState({ r: etatReserve, a: etatAnnule });
  const toutLu = () => setLus({ r: etatReserve, a: etatAnnule });

  // La réponse d'une action, réglée pendant le rendu (pas d'effet) : un
  // succès ramène à la carte avec son annonce ; un créneau devenu imprenable
  // ramène à l'étape 1, la saisie gardée.
  const [vus, setVus] = useState({ r: etatReserve, a: etatAnnule });
  if (vus.r !== etatReserve || vus.a !== etatAnnule) {
    setVus({ r: etatReserve, a: etatAnnule });
    const nouveau = etatReserve !== vus.r ? etatReserve : etatAnnule;
    if (nouveau.status === "success" && "confirmation" in nouveau) {
      setEtape("carte");
      setChoisi(null);
      setRemplace(null);
      setBrouillon(brouillonDe(null));
      setAlerte(null);
      setAnnonce(nouveau);
      setParGeste(false);
      setLus({ r: etatReserve, a: etatAnnule });
    } else if (nouveau === etatReserve && nouveau.status === "error" && nouveau.code === "creneau") {
      setEtape("choisir");
      setChoisi(null);
      setAlerte(nouveau.message);
      setParGeste(true);
      setLus((l) => ({ ...l, r: etatReserve }));
    }
  }

  // Le rendez-vous à venir a changé sous un parcours ouvert (un autre membre
  // l'a pris, déplacé ou annulé) : le parcours se ferme, son refus se dit.
  const idProchain = prochain?.id ?? null;
  const [idVu, setIdVu] = useState(idProchain);
  if (idProchain !== idVu) {
    setIdVu(idProchain);
    if (etape !== "carte") {
      setEtape("carte");
      setChoisi(null);
      setRemplace(null);
      if (etatReserve !== lus.r && etatReserve.status === "error") setAlerte(etatReserve.message);
      setLus({ r: etatReserve, a: etatAnnule });
    }
  }

  // Sans rendez-vous à venir, l'étape 1 se montre sous la carte — sauf en
  // lecture seule, ou sans créneau libre : la carte le dit seule. Le dernier
  // créneau pris entre-temps ne laisse pas un calendrier vide (relecture du
  // 2026-11-25) : la carte revient, avec l'alerte.
  const peutChoisir = !lectureSeule && creneaux.length > 0;
  const vue: Etape =
    etape === "coordonnees" && choisi ? "coordonnees" : (etape === "choisir" && creneaux.length > 0) || (!prochain && peutChoisir) ? "choisir" : "carte";

  const ouvrir = (e: Etape) => {
    setAnnonce(null);
    setAlerte(null);
    setParGeste(true);
    toutLu();
    setEtape(e);
  };

  return (
    <div className="flex flex-col gap-[22px]">
      {annonce ? <Annonce annonce={annonce} mode={prochain?.mode ?? null} /> : null}
      {vue !== "choisir" ? <MessageFormulaire ton="alerte">{alerte}</MessageFormulaire> : null}

      <CarteDeLAnnee
        // Une carte par rendez-vous : « Annuler ce rendez-vous ? », ouvert sur
        // un rendez-vous annulé, ne se rouvre pas sur le suivant (relecture).
        key={`carte-${prochain?.id ?? "aucun"}`}
        {...props}
        enCours={vue !== "carte"}
        etape={vue}
        focaliser={parGeste && vue === "carte"}
        annuler={annuler}
        annulation={annulation}
        erreurAnnulation={etatAnnule !== lus.a && etatAnnule.status === "error" ? etatAnnule.message : null}
        deplacer={() => {
          if (!prochain) return;
          setRemplace(prochain.id);
          setBrouillon(brouillonDe(prochain));
          ouvrir("choisir");
        }}
      />

      {vue === "choisir" ? (
        <ChoixDuCreneau
          creneaux={creneaux}
          lienQuestion={props.lienQuestion}
          deplacement={remplace !== null}
          alerte={alerte}
          focaliser={parGeste}
          garder={() => {
            setRemplace(null);
            ouvrir("carte");
          }}
          selectionInitiale={choisi}
          choisir={(c) => {
            setChoisi(c);
            ouvrir("coordonnees");
          }}
        />
      ) : vue === "coordonnees" && choisi ? (
        <CoordonneesRendezVous
          choisi={choisi}
          email={props.email}
          moi={props.moi}
          etablissements={props.etablissements}
          remplace={remplace ?? undefined}
          brouillon={brouillon}
          changer={setBrouillon}
          etablissementId={props.etablissementId}
          reserver={reserver}
          reservation={reservation}
          etat={etatReserve === lus.r ? IDLE : etatReserve}
          focaliser={parGeste}
          retour={() => ouvrir("choisir")}
        />
      ) : prochain && !lectureSeule && prochain.modifiable ? (
        // Une clé distincte de la carte, sa voisine : deux clés égales entre
        // frères font dupliquer la carte par React (constaté le 2026-11-24).
        <PreparerLeRendezVous key={`preparer-${prochain.id}`} prochain={prochain} etablissementId={props.etablissementId} />
      ) : null}
    </div>
  );
}

/** Le bandeau qui suit une réservation, un déplacement, une annulation ; il prend le focus. */
function Annonce({ annonce, mode }: { annonce: Succes; mode: ModeRendezVous | null }) {
  const ref = useFocusAuMontage<HTMLDivElement>(true);
  if (annonce.evenement === "annule") {
    return (
      <div ref={ref} tabIndex={-1} className="focus:outline-none">
        <MessageFormulaire ton="info">
          Le rendez-vous est annulé, et son créneau rendu.{" "}
          {annonce.confirmation
            ? `Une confirmation vient de partir à ${annonce.email}.`
            : "La confirmation par e-mail n'a pas pu partir : retirez l'événement de votre agenda vous-même."}
        </MessageFormulaire>
      </div>
    );
  }
  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="status"
      className="flex items-start gap-3.5 rounded-[22px] bg-[color:var(--board-green)] px-5 py-4 focus:outline-none"
    >
      <span aria-hidden className="grid size-7 flex-none place-items-center rounded-full bg-[color:var(--board-green-ink)] text-[color:var(--board-green)]">
        <Check className="size-[15px]" strokeWidth={3} />
      </span>
      <div className="flex flex-col gap-0.5 pt-[3px]">
        <p className="m-0 text-[14.5px] font-semibold text-[color:var(--board-ink)]">
          {annonce.evenement === "deplace" ? "C'est déplacé." : "C'est réservé."}
        </p>
        <p className="m-0 text-[13.5px] leading-[1.55] text-[color:var(--board-green-ink)]">
          {annonce.confirmation
            ? `Une confirmation vient de partir à ${annonce.email}, avec l'invitation pour votre agenda.`
            : "La confirmation par e-mail n'a pas pu partir : le rendez-vous est bien enregistré, et « Ajouter à mon agenda » l'ajoute à votre agenda."}
          {mode === "visio" ? " Le lien de la visio suivra avant le rendez-vous." : ""}
        </p>
      </div>
    </div>
  );
}

/**
 * La carte du rendez-vous de l'année, en tête de l'onglet (maquette « La
 * carte du rendez-vous, dans chaque cas »).
 */
function CarteDeLAnnee({
  prochain,
  passe,
  lectureSeule,
  creneaux,
  finDuPro,
  finDeLAnnee,
  maintenant,
  etablissements,
  agenda,
  lienQuestion,
  etablissementId,
  enCours,
  etape,
  focaliser,
  annuler,
  annulation,
  erreurAnnulation,
  deplacer,
}: Props & {
  /** Une étape est ouverte dessous : la carte ne porte plus ses gestes. */
  enCours: boolean;
  etape: Etape;
  /** On y revient par un geste : son titre prend le focus. */
  focaliser: boolean;
  annuler: (f: FormData) => void;
  annulation: boolean;
  erreurAnnulation: string | null;
  deplacer: () => void;
}) {
  const [confirmer, setConfirmer] = useState(false);
  // « Non, le garder » démonte le bouton qui avait le focus : il revient à
  // « Annuler le rendez-vous » (relecture du 2026-11-25).
  const [retourFocus, setRetourFocus] = useState(0);
  const annulerRef = useFocusAuMontage<HTMLButtonElement>(retourFocus);
  const titreId = useId();
  const titreRef = useFocusAuMontage<HTMLHeadingElement>(focaliser);
  const ici = new Date(maintenant);
  const fin = new Date(finDeLAnnee);
  const veille = ajouterJours(fin, -1);
  // Les créneaux proposés qui tombent dans l'année suivante (déjà ouverte).
  const apresLAnnee = creneaux.some((c) => new Date(c.debut) >= fin);
  // Déplacer ouvre l'étape 1 : seulement s'il y a un autre créneau où aller.
  const peutDeplacer = creneaux.length > 0;

  // Le contenu de la carte, selon le cas.
  let pastille: { ton: Ton; texte: string };
  let titre: string;
  let corps: ReactNode;
  let petit: ReactNode = null;
  let gestes: ReactNode = null;

  const agendaBouton = (
    <a href={agenda} download className={buttonVariants({ variant: "board" })}>
      <CalendarDays className="size-[15px]" strokeWidth={2.2} aria-hidden />
      Ajouter à mon agenda
    </a>
  );

  if (prochain) {
    const debut = new Date(prochain.debut);
    titre = `${majuscule(jourSansAnnee(debut))}, ${plageHoraire(debut, new Date(prochain.fin))}`;
    const aujourdhui = cleJourCivil(debut) === cleJourCivil(ici);
    if (!prochain.modifiable) {
      pastille = { ton: "ambre", texte: aujourdhui ? "Aujourd'hui" : "Demain" };
      corps = (
        <>
          Il ne se déplace plus en ligne&#160;: moins de 24 h avant, il compte pour l&apos;année. Un empêchement&#160;?
          Écrivez-nous depuis «&#160;
          <Link href={lienQuestion} className={LIEN}>
            Poser une question
          </Link>
          &#160;».
        </>
      );
      gestes = agendaBouton;
    } else if (finDuPro) {
      const finPro = dateLongue(new Date(finDuPro));
      pastille = { ton: "ambre", texte: "À avancer" };
      corps = `Votre formule Pro s'arrête le ${finPro}. Ce rendez-vous, prévu après, sera annulé ce jour-là : avancez-le avant le ${finPro} pour le garder.`;
      if (lectureSeule) {
        petit = "Votre accès est en lecture seule : le propriétaire ou un membre du compte peut le déplacer.";
      } else if (peutDeplacer) {
        gestes = (
          <Button type="button" variant="boardClair" onClick={deplacer}>
            Déplacer
          </Button>
        );
      } else {
        // Aucun créneau libre avant la fin du Pro : la consigne garde un geste.
        petit = "Aucun créneau libre avant cette date pour le moment.";
        gestes = (
          <Link href={lienQuestion} className={buttonVariants({ variant: "boardClair" })}>
            Poser une question
          </Link>
        );
      }
    } else {
      pastille = { ton: "vert", texte: "Réservé" };
      corps = commentSeParler(prochain.mode, prochain.telephone);
      petit = `Réservé ${prochain.reservePar ? `par ${prochain.reservePar} ` : ""}le ${jourMois(new Date(prochain.reserveLe))}. Toutes les personnes du compte le voient.`;
      gestes = (
        <>
          {agendaBouton}
          {lectureSeule ? null : confirmer ? (
            <form action={annuler} className="flex flex-wrap items-center gap-2.5" data-geste-du-compte>
              <input type="hidden" name="rendezVousId" value={prochain.id} />
              <input type="hidden" name="etablissementId" value={etablissementId} />
              <span className="text-[13px] font-semibold text-[color:var(--board-ink)]">Annuler ce rendez-vous&#160;?</span>
              <Button type="submit" variant="boardAttention" enCours={annulation}>
                {annulation ? "Annulation…" : "Oui, l'annuler"}
              </Button>
              {/* Le focus va au choix sans conséquence (relecture du 2026-11-24). */}
              <Button
                type="button"
                variant="boardClair"
                autoFocus
                onClick={() => {
                  setConfirmer(false);
                  setRetourFocus((n) => n + 1);
                }}
              >
                Non, le garder
              </Button>
            </form>
          ) : (
            <>
              {peutDeplacer ? (
                <Button type="button" variant="boardClair" onClick={deplacer}>
                  Déplacer
                </Button>
              ) : null}
              <Button ref={annulerRef} type="button" variant="boardClair" onClick={() => setConfirmer(true)}>
                Annuler le rendez-vous
              </Button>
              <span className={`${PETIT} ml-1.5`}>Possible jusqu&apos;au {jusquAQuand(debut)}.</span>
            </>
          )}
        </>
      );
      if (lectureSeule) {
        petit = `${petit} Votre accès est en lecture seule : le propriétaire ou un membre du compte peut le déplacer ou l'annuler.`;
      }
    }
  } else if (passe) {
    pastille = { ton: "vert", texte: `Fait le ${jourMois(new Date(passe.debut))}` };
    titre = "Votre rendez-vous annuel a eu lieu";
    // L'année bascule à l'heure du premier paiement : le premier jour ENTIER
    // de la suivante est le seul qui se dise sans mentir (relecture du 2026-11-25).
    corps = `Le prochain se réserve à partir du ${dateLongue(premierJourEntier(fin))}. D'ici là, posez vos questions par écrit.`;
  } else {
    pastille = { ton: "bleu", texte: "À réserver" };
    titre = "Une heure pour faire le point sur votre dossier";
    if (lectureSeule) {
      corps = "Votre accès est en lecture seule : le propriétaire ou un membre du compte peut le réserver.";
      gestes = (
        <Button type="button" variant="board" disabled>
          Choisir un créneau
        </Button>
      );
    } else if (creneaux.length === 0) {
      corps = "Aucun créneau libre pour le moment. De nouveaux créneaux ouvrent chaque mois ; en attendant, posez votre question par écrit.";
      gestes = (
        <Link href={lienQuestion} className={buttonVariants({ variant: "boardClair" })}>
          Poser une question
        </Link>
      );
    } else {
      // Le rendez-vous de l'année doit AVOIR LIEU avant sa fin ; il se réserve
      // 24 h à l'avance (relecture du 2026-11-25 : « à réserver d'ici la
      // veille » annonçait un jour où plus rien ne se prend).
      const jours = joursCivilsEntre(ici, veille);
      corps =
        `Un seul pour tout le compte : ${lesEtablissementsYPassent(etablissements.length)}. Celui de cette année a lieu au plus tard le ${dateLongue(veille)}` +
        (etape === "coordonnees"
          ? "."
          : ` (dans ${jours} jour${jours > 1 ? "s" : ""}), réservé au moins 24 h avant ; non pris, il ne se reporte pas.` +
            (apresLAnnee ? ` Les créneaux à partir du ${dateLongue(premierJourEntier(fin))} comptent pour l'année suivante.` : ""));
    }
  }

  return (
    <section aria-labelledby={titreId} className="carte-board flex flex-col gap-6 px-6 pt-7 pb-[26px] sm:px-8">
      <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3.5">
        <div className="flex min-w-0 flex-[1_1_420px] flex-col gap-2">
          <p className={SURTITRE}>Votre rendez-vous annuel</p>
          <h2 id={titreId} ref={titreRef} tabIndex={-1} className="board-titre m-0 text-[26px] focus:outline-none">
            {titre}
          </h2>
          <p className={`${CORPS} max-w-[64ch]`}>{corps}</p>
          {petit ? <p className={PETIT}>{petit}</p> : null}
        </div>
        <span className={`${PASTILLE} ${TONS_PASTILLE[pastille.ton]}`}>{pastille.texte}</span>
      </div>
      {gestes && !enCours ? <div className="flex flex-wrap items-center gap-2.5 pt-1">{gestes}</div> : null}
      <MessageFormulaire ton="alerte">{erreurAnnulation}</MessageFormulaire>
    </section>
  );
}

/** « Préparer le rendez-vous » : ce qui est à aborder, transmis avant le rendez-vous. */
function PreparerLeRendezVous({ prochain, etablissementId }: { prochain: RendezVousAffiche; etablissementId: string }) {
  const id = useId();
  const [sujet, setSujet] = useState(prochain.sujet ?? "");
  const [etat, completer, enCours] = useActionState(completerRendezVous, IDLE);
  // Le texte enregistré se lit hors du champ ; « Modifier » rouvre le champ
  // (2026-11-24, décision de la propriétaire). Sans texte, le champ est ouvert.
  const [enEdition, setEnEdition] = useState(false);
  // Le formulaire refermé (Enregistrer, Annuler) démonte le bouton qui avait
  // le focus : il revient à « Modifier » (relecture du 2026-11-25).
  const [retourFocus, setRetourFocus] = useState(0);
  const modifierRef = useFocusAuMontage<HTMLButtonElement>(retourFocus);
  // Un état déjà lu (Modifier, Annuler) ne réapparaît pas (relecture).
  const [lu, setLu] = useState(etat);
  const [vu, setVu] = useState(etat);
  if (vu !== etat) {
    setVu(etat);
    if (etat.status === "success") {
      setEnEdition(false);
      setRetourFocus((n) => n + 1);
    }
  }
  const affiche = etat === lu ? IDLE : etat;
  const enregistre = prochain.sujet?.trim() ?? "";
  const edition = enEdition || !enregistre;
  const basculer = (ouvrir: boolean) => {
    setLu(etat);
    if (ouvrir) setSujet(enregistre);
    else setRetourFocus((n) => n + 1);
    setEnEdition(ouvrir);
  };
  const jusqua = `Transmis avant le rendez-vous. Vous pouvez le compléter jusqu'au ${jusquAQuand(new Date(prochain.debut))}.`;
  return (
    <section aria-labelledby={`${id}-t`} className="carte-board flex flex-col gap-4 px-6 py-7 sm:px-8">
      <h2 id={`${id}-t`} className="board-titre m-0 text-[22px]">
        Préparer le rendez-vous
      </h2>
      {!edition ? (
        <div className="flex flex-col gap-4">
          <div>
            <p className="m-0 mb-2 text-[12.5px] font-semibold text-[color:var(--board-slate-ink)]">Ce que vous voulez aborder</p>
            <p className="m-0 whitespace-pre-line text-[14px] leading-[1.6] text-[color:var(--board-ink)] [overflow-wrap:anywhere]">
              {enregistre}
            </p>
          </div>
          {affiche.status === "success" ? (
            <MessageFormulaire ton="info">
              {affiche.evenement === "inchange"
                ? "Rien de changé : rien n'a été transmis de nouveau."
                : "C'est enregistré, et transmis pour préparer le rendez-vous."}
            </MessageFormulaire>
          ) : null}
          <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
            <Button ref={modifierRef} type="button" variant="boardClair" onClick={() => basculer(true)}>
              Modifier
            </Button>
            <p className={PETIT}>{jusqua}</p>
          </div>
        </div>
      ) : (
        <form action={completer} className="flex flex-col gap-4" data-geste-du-compte>
          <input type="hidden" name="rendezVousId" value={prochain.id} />
          <input type="hidden" name="etablissementId" value={etablissementId} />
          <div>
            <label className="mb-2 block text-[12.5px] font-semibold text-[color:var(--board-slate-ink)]" htmlFor={id}>
              Ce que vous voulez aborder
            </label>
            <textarea
              id={id}
              name="sujet"
              rows={4}
              maxLength={SUJET_RENDEZ_VOUS_MAX}
              value={sujet}
              onChange={(e) => setSujet(e.target.value)}
              // Ouvert par « Modifier » : le champ prend le focus (jamais au premier rendu).
              autoFocus={enEdition}
              className="champ-board resize-y"
              placeholder="Par exemple : préparer une visite de la commission, relire un plan d'actions."
            />
          </div>
          <MessageFormulaire ton="alerte">{affiche.status === "error" ? affiche.message : null}</MessageFormulaire>
          <div className="flex flex-wrap items-center gap-x-[18px] gap-y-2.5">
            <Button type="submit" variant="boardClair" enCours={enCours}>
              {enCours ? "Enregistrement…" : "Enregistrer"}
            </Button>
            {enregistre ? (
              <Button type="button" variant="boardClair" onClick={() => basculer(false)}>
                Annuler
              </Button>
            ) : null}
            <p className={PETIT}>{jusqua}</p>
          </div>
        </form>
      )}
    </section>
  );
}
