"use client";

import {
  AIDE_NOMBRE_DE_PERSONNES,
  LIBELLE_NOMBRE_DE_PERSONNES,
} from "@/lib/matching/personnes-presentes";
import { useActionState, useState } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { ChampBoard, SectionChamps } from "@/components/ui-kit";
import {
  CATEGORIES_ERP,
  TYPE_ERP,
  TYPES_ERP_QUESTION_LOCAUX_SOMMEIL,
} from "@/lib/etablissements/schema";
import {
  LABEL_CATEGORIE_ERP,
  LABEL_TYPE_ERP,
} from "@/lib/etablissements/labels";
import type { EtablissementActionState } from "@/lib/etablissements/actions";


/** La case à cocher du board : encre pleine à l'état coché, filet d'ardoise. */
const CASE_A_COCHER =
  "mt-0.5 size-4 flex-none rounded border-[color:var(--board-slate)] accent-[color:var(--board-ink)]";

/** Le message de validation, à l'encre du signal et jamais en `destructive`. */
function Erreur({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="m-0 mt-1.5 text-[12.5px] text-[color:var(--board-signal-ink)]">
      {message}
    </p>
  );
}

type Valeurs = {
  raisonDisplay?: string;
  adresse?: string;
  codeNaf?: string | null;
  effectifSurSite?: number;
  personnesPresentesHabituellement?: number | null;
  manipuleMatieresR422722?: boolean | null;
  estEtablissementTravail?: boolean;
  estERP?: boolean;
  estIGH?: boolean;
  estHabitation?: boolean;
  typeErp?: string | null;
  categorieErp?: string | null;
  natureActivite?: string | null;
  effectifPublicAdmis?: number | null;
  dateAutorisationOuverture?: string | null;
  dateCertificatConformite?: string | null;
  comporteLocauxSommeilPublic?: boolean | null;
};

type Props = {
  action: (
    prev: EtablissementActionState,
    formData: FormData,
  ) => Promise<EtablissementActionState>;
  valeursInitiales?: Valeurs;
  libelleSubmit: string;
  labelAnnuler?: { libelle: string; href: string };
};

export function EtablissementForm({
  action,
  valeursInitiales,
  libelleSubmit,
  labelAnnuler,
}: Props) {
  const [state, formAction, pending] = useActionState<
    EtablissementActionState,
    FormData
  >(action, { status: "idle" });

  // États locaux pour le dépliage conditionnel ERP/IGH — cohérence UI
  // immédiate sans tour serveur.
  const [estERP, setEstERP] = useState<boolean>(
    valeursInitiales?.estERP ?? false,
  );
  // Le type est suivi en état depuis le 2026-09-20 : la question du sommeil
  // n'existe que pour certains types, et doit apparaître ou disparaître au
  // moment où le dirigeant en change, pas au rechargement.
  const [typeErp, setTypeErp] = useState<string>(
    valeursInitiales?.typeErp ?? "",
  );
  const poseLocauxSommeil =
    estERP &&
    (TYPES_ERP_QUESTION_LOCAUX_SOMMEIL as readonly string[]).includes(typeErp);
  const [estHabitation, setEstHabitation] = useState<boolean>(
    valeursInitiales?.estHabitation ?? false,
  );
  const [estIGH, setEstIGH] = useState<boolean>(
    valeursInitiales?.estIGH ?? false,
  );

  const err = (champ: string) =>
    state.status === "error" ? state.fieldErrors?.[champ]?.[0] : undefined;

  return (
    <form action={formAction} className="flex flex-col gap-8">
      {/* Identité */}
      <section className="flex flex-col gap-5">
        <ChampBoard
          id="raisonDisplay"
          name="raisonDisplay"
          label="Nom de l'établissement"
          requis
          defaultValue={valeursInitiales?.raisonDisplay}
          placeholder="Ex : Restaurant du Marché, Bureau de Nantes"
          erreur={err("raisonDisplay")}
        />

        <ChampBoard
          id="adresse"
          name="adresse"
          label="Adresse"
          requis
          defaultValue={valeursInitiales?.adresse}
          erreur={err("adresse")}
        />

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <ChampBoard
            id="codeNaf"
            name="codeNaf"
            label="Code NAF du site"
            defaultValue={valeursInitiales?.codeNaf ?? ""}
            placeholder="ex. 56.10A"
            aide="Facultatif. Si vide, on utilise le code NAF de l'entreprise. À renseigner si ce site a une activité distincte de celle du siège."
            erreur={err("codeNaf")}
          />

          <ChampBoard
            id="effectifSurSite"
            name="effectifSurSite"
            label="Effectif sur site"
            requis
            // Un champ `type="number"` change de valeur à la molette, sur une
            // saisie déjà faite et sans que rien ne le signale. Le contrôle de
            // borne reste au serveur, où il est de toute façon rejoué.
            type="text"
            inputMode="numeric"
            defaultValue={valeursInitiales?.effectifSurSite}
            erreur={err("effectifSurSite")}
          />

          {/* Fiche « Renseignements généraux » du registre de sécurité
              (CCH R. 143-44). La donnée vit ici, le registre la lit — il ne
              la recopie pas, sans quoi les deux écrans divergeraient. */}
          <div className="sm:col-span-2">
            <label className="label-board" htmlFor="natureActivite">
              Nature de l&apos;activité
            </label>
            <textarea
              id="natureActivite"
              name="natureActivite"
              rows={2}
              defaultValue={valeursInitiales?.natureActivite ?? ""}
              className="champ-board"
              aria-invalid={Boolean(err("natureActivite"))}
              aria-describedby="natureActivite-aide"
            />
            <p
              id="natureActivite-aide"
              className="m-0 mt-1.5 text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
            >
              Ce que l&apos;on fait ici, en clair — pas le code NAF. Cette
              phrase figure au registre de sécurité.
            </p>
            <Erreur message={err("natureActivite")} />
          </div>

          {/* Champ de R. 4227-34 CT : alarme sonore → consigne → exercices
              semestriels. Question distincte de l'effectif salarié.
              ~~Elle n'est PAS reposée au parcours de création (décision du
              2026-09-01, confirmée le 2026-09-02) : c'est une question de
              technicien, et le moteur s'en passe désormais.~~ [2026-09-20 :
              elle y est reposée, aux seuls dossiers que
              `nombreDePersonnesADemander` désigne, et le schéma l'exige d'eux
              ici aussi.] Elle reste sur la fiche pour tous, parce qu'y répondre
              reste ce qui tranche — au-dessus comme en dessous du seuil, ce que
              la déduction ne fait que dans un sens. */}
          <ChampBoard
            className="sm:col-span-2"
            id="personnesPresentesHabituellement"
            name="personnesPresentesHabituellement"
            label={LIBELLE_NOMBRE_DE_PERSONNES}
            type="text"
            inputMode="numeric"
            defaultValue={
              valeursInitiales?.personnesPresentesHabituellement ?? ""
            }
            aide={`${AIDE_NOMBRE_DE_PERSONNES} Ce nombre vous est demandé si vous recevez du public et que ni votre catégorie d'ERP ni votre effectif n'établissent le seuil ; sinon vous pouvez le laisser vide.`}
            erreur={err("personnesPresentesHabituellement")}
          />

          {/* LA QUESTION DÉCRIT DÉSORMAIS L'ARTICLE QU'ELLE SERT, ET NON CELUI
              DONT L'ATTRIBUT PORTE LE NOM. L'aide disait « produits classés
              explosifs, comburants ou extrêmement inflammables (art.
              R. 4227-22), manipulés ou mis en œuvre — pas seulement stockés ».
              Les trois classes sont bien celles de R. 4227-22 ; la CONDITION
              ne l'est pas. R. 4227-22 vise les locaux où ces matières sont
              « entreposées OU manipulées » : le seul entreposage le déclenche.
              « Manipulées ET mises en œuvre » est la phrase de R. 4227-34 —
              l'article que le moteur sert réellement, par `champR422734`
              (`matching/engine.ts`, critère 3 bis), et le seul dont dépendent
              l'alarme, la consigne et les exercices.
              Verbatim des deux articles relevé le 2026-09-02 :
              `referentiels/corpus/code-travail-matieres-inflammables.ts` et
              `code-travail-incendie.ts`.

              CE QUI RESTE OUVERT, ET QUI N'EST PAS TRANCHÉ ICI : le champ du
              moteur. Élargir la question à l'entreposage ferait entrer dans
              les obligations de R. 4227-34 des établissements que ce texte
              n'atteint pas ; la laisser étroite laisse un simple entreposeur
              hors du champ de R. 4227-22, dont aucune obligation du
              référentiel ne dépend aujourd'hui. La dernière phrase de l'aide
              dit au dirigeant ce que la question ne couvre pas, plutôt que de
              trancher à sa place. Renommer l'attribut est une migration, hors
              de ce lot. */}
          <div className="sm:col-span-2">
            <label className="label-board" htmlFor="manipuleMatieresR422722">
              Manipulez-vous <em>et</em> mettez-vous en œuvre des matières
              explosives ou inflammables ?
            </label>
            <select
              id="manipuleMatieresR422722"
              name="manipuleMatieresR422722"
              className="champ-board"
              aria-describedby="manipuleMatieresR422722-aide"
              defaultValue={
                valeursInitiales?.manipuleMatieresR422722 === true
                  ? "oui"
                  : valeursInitiales?.manipuleMatieresR422722 === false
                    ? "non"
                    : ""
              }
            >
              <option value="">Je ne sais pas encore</option>
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
            <p
              id="manipuleMatieresR422722-aide"
              className="m-0 mt-1.5 max-w-[66ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
            >
              Matières classées explosives, comburantes ou extrêmement
              inflammables, ou dans un état physique susceptible d&apos;engendrer
              une explosion ou une inflammation instantanée. Répondez oui si
              elles sont <strong>à la fois manipulées et mises en œuvre</strong>{" "}
              chez vous : c&apos;est ce que vise l&apos;art. R. 4227-34 du Code
              du travail, et c&apos;est lui qui rend l&apos;alarme sonore, la
              consigne incendie et les exercices semestriels dus quel que soit
              l&apos;effectif. Les entreposer sans les mettre en œuvre ne relève
              pas de cette question — d&apos;autres articles de la même section
              le visent, que Rojer ne suit pas.
            </p>
          </div>
        </div>
      </section>

      {/* Régimes réglementaires — le filet suffit à séparer : une carte dans
          une carte poserait un second rayon 30 au milieu du premier. */}
      <div className="border-t border-[color:var(--board-slate-line)] pt-7">
        <SectionChamps
          titre="Régimes réglementaires applicables"
          chapeau="Cochez tous les régimes applicables — ils se cumulent. Par défaut, tout établissement ayant des salariés relève du Code du travail."
        >
          <div className="flex flex-col gap-5">
            {/* Travail */}
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name="estEtablissementTravail"
                defaultChecked={
                  valeursInitiales?.estEtablissementTravail ?? true
                }
                className={CASE_A_COCHER}
              />
              <div className="min-w-0 flex-1">
                <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                  Établissement de travail
                </p>
                <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                  Au moins un salarié présent. Obligations DUERP + vérifications
                  électriques / aération / incendie au titre du Code du travail.
                </p>
              </div>
            </label>

            {/* ERP */}
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="estERP"
                  checked={estERP}
                  onChange={(e) => setEstERP(e.currentTarget.checked)}
                  className={CASE_A_COCHER}
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                    Établissement Recevant du Public (ERP)
                  </p>
                  <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    Accueille du public (clients, patients, visiteurs…).
                    Règlement de sécurité du 25 juin 1980 — obligations
                    supplémentaires selon type et catégorie.
                  </p>
                </div>
              </label>

              {estERP && (
                /* TYPE ET CATÉGORIE PRENNENT LA LIGNE ENTIÈRE, ET C'EST UNE
                   CORRECTION DE 2026-09-03.

                   Ils tenaient en `sm:grid-cols-2`, soit un champ de ~373 px.
                   Un `<select>` ne replie pas son texte et ne l'abrège pas : il
                   le TRANCHE, sans ellipse, vers 57 caractères. Trois des
                   vingt-deux libellés de GN 1 dépassent — J (59), R (68) et L
                   (76) —, et ce sont les trois que le lot du 2026-09-03 venait
                   de recaler mot pour mot sur le texte. Un directeur d'EHPAD
                   relisait sa fiche et y lisait « personnes âgées ou handica ».

                   Ça ne gêne pas au moment de CHOISIR — le menu natif s'ouvre à
                   sa largeur propre — mais quand on revient RELIRE, c'est-à-dire
                   la seule chose que cette page sert.

                   Abréger les libellés était l'autre voie, et elle est fermée :
                   `referentiels/types-erp.test.ts` les tient sur le verbatim de
                   GN 1 § 1, et les rogner ferait revenir le défaut qu'on vient
                   de corriger. C'est donc le champ qui s'élargit.

                   La paire perdue ne coûte rien : la catégorie portait déjà
                   trois lignes d'aide sous elle et le type aucune, si bien que
                   les deux colonnes ne s'alignaient pas. */
                <div className="ml-7 grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="label-board" htmlFor="typeErp">
                      Type ERP *
                    </label>
                    <select
                      id="typeErp"
                      name="typeErp"
                      value={typeErp}
                      onChange={(e) => setTypeErp(e.currentTarget.value)}
                      required={estERP}
                      className="champ-board"
                      aria-invalid={Boolean(err("typeErp"))}
                    >
                      <option value="">— Sélectionner —</option>
                      {TYPE_ERP.map((t) => (
                        <option key={t} value={t}>
                          {LABEL_TYPE_ERP[t]}
                        </option>
                      ))}
                    </select>
                    <Erreur message={err("typeErp")} />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="label-board" htmlFor="categorieErp">
                      Catégorie *
                    </label>
                    <select
                      id="categorieErp"
                      name="categorieErp"
                      defaultValue={valeursInitiales?.categorieErp ?? ""}
                      required={estERP}
                      className="champ-board"
                      aria-invalid={Boolean(err("categorieErp"))}
                      aria-describedby="categorieErp-aide"
                    >
                      <option value="">— Sélectionner —</option>
                      {CATEGORIES_ERP.map((c) => (
                        <option key={c} value={c}>
                          {LABEL_CATEGORIE_ERP[c]}
                        </option>
                      ))}
                    </select>
                    {/* La règle du classement se lit en clair sous le champ :
                        une infobulle n'existe pas au doigt. */}
                    <p
                      id="categorieErp-aide"
                      className="m-0 mt-1.5 max-w-[66ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
                    >
                      La catégorie dépend du nombre total de personnes (public +
                      personnel) que peut accueillir l&apos;établissement (art.
                      R. 143-19 CCH). Elle figure sur l&apos;arrêté
                      d&apos;ouverture ou le procès-verbal de la commission de
                      sécurité quand il y en a un ; un établissement de 5ᵉ
                      catégorie sans hébergement du public n&apos;a pas
                      d&apos;autorisation d&apos;ouverture à demander (art.
                      R. 143-38 CCH).
                    </p>
                    <Erreur message={err("categorieErp")} />
                  </div>

                  {/* Fiche « Établissement recevant du public » du registre de
                      sécurité (CCH R. 143-44). Trois faits que seul
                      l'exploitant détient — le registre les lit ici. */}
                  <ChampBoard
                    className="sm:col-span-2"
                    id="effectifPublicAdmis"
                    name="effectifPublicAdmis"
                    label="Effectif du public susceptible d'être admis"
                    type="text"
                    inputMode="numeric"
                    defaultValue={valeursInitiales?.effectifPublicAdmis ?? ""}
                    aide="Le chiffre retenu à votre classement ERP — distinct de votre effectif salarié et des personnes présentes."
                    erreur={err("effectifPublicAdmis")}
                  />

                  <ChampBoard
                    id="dateAutorisationOuverture"
                    name="dateAutorisationOuverture"
                    label="Autorisation d'ouverture donnée le"
                    type="date"
                    defaultValue={
                      valeursInitiales?.dateAutorisationOuverture ?? ""
                    }
                    erreur={err("dateAutorisationOuverture")}
                  />

                  <ChampBoard
                    id="dateCertificatConformite"
                    name="dateCertificatConformite"
                    label="Certificat de conformité délivré le"
                    type="date"
                    defaultValue={
                      valeursInitiales?.dateCertificatConformite ?? ""
                    }
                    erreur={err("dateCertificatConformite")}
                  />

                  {/* LA QUESTION DU SOMMEIL — posée aux seuls types où il est plausible
                      (`TYPES_ERP_A_SOMMEIL_PLAUSIBLE`), ici comme au parcours
                      d'accueil, et la réponse est due : « oui » ou « non »
                      (arbitrages de la propriétaire, 2026-09-09 puis
                      2026-09-20). Hors de ces types elle ne s'affiche pas :
                      le type déclaré a déjà répondu, et le moteur ne retient
                      rien sur leur silence.

                      Un dossier ANCIEN de ces types peut encore porter `null`
                      — la colonne date du 2026-09-01. Le moteur le couvre par
                      prudence, « à confirmer », et c'est ici qu'il répond : à
                      son prochain enregistrement la réponse lui est
                      demandée. */}
                  {poseLocauxSommeil && (
                  <div className="sm:col-span-2">
                    <label
                      className="label-board"
                      htmlFor="comporteLocauxSommeilPublic"
                    >
                      Votre établissement héberge-t-il du public pour la nuit ?
                    </label>
                    <select
                      id="comporteLocauxSommeilPublic"
                      name="comporteLocauxSommeilPublic"
                      className="champ-board"
                      required
                      aria-describedby="comporteLocauxSommeilPublic-aide"
                      defaultValue={
                        valeursInitiales?.comporteLocauxSommeilPublic === true
                          ? "oui"
                          : valeursInitiales?.comporteLocauxSommeilPublic ===
                              false
                            ? "non"
                            : ""
                      }
                    >
                      <option value="" disabled>
                        Choisir…
                      </option>
                      <option value="oui">Oui</option>
                      <option value="non">Non</option>
                    </select>
                    <p
                      id="comporteLocauxSommeilPublic-aide"
                      className="m-0 mt-1.5 max-w-[66ch] text-[12px] leading-[1.5] text-[color:var(--board-slate-mid)]"
                    >
                      Chambres d&apos;hôtel, chambres d&apos;hôtes, gîte,
                      hébergement — des locaux où le public dort. Un logement de fonction occupé par
                      vous ou par un salarié ne compte pas : le texte vise le
                      sommeil du public. Si oui, et en 5ᵉ catégorie,
                      s&apos;ajoutent un contrat
                      annuel d&apos;entretien de la détection incendie, des
                      consignes et des plans affichés, et une visite de la
                      commission de sécurité tous les cinq ans (arrêté du
                      25 juin 1980, art. PE 4, PE 33, PE 35 et PE 37).
                    </p>
                  </div>
                  )}
                </div>
              )}
            </div>

            {/* IGH */}
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="estIGH"
                  checked={estIGH}
                  onChange={(e) => setEstIGH(e.currentTarget.checked)}
                  className={CASE_A_COCHER}
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                    Immeuble de Grande Hauteur (IGH)
                  </p>
                  <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    Hauteur &gt; 28 m (habitation) ou &gt; 50 m (autres
                    activités). Arrêté du 30 décembre 2011 — rare en TPE/PME.
                  </p>
                </div>
              </label>

              {/* LA QUESTION « CLASSE IGH » A ÉTÉ RETIRÉE LE 2026-09-03.
                  Elle était obligatoire, offrait les dix classes de R. 146-4,
                  et ne décidait de rien : mesuré en appelant le moteur, les
                  dix valeurs et l'absence rendaient le même jeu d'obligations.
                  Les vérifications de l'arrêté du 30 décembre 2011 sont à la
                  charge des « propriétaires » (GH 5) et ne varient pas par
                  classe ; la seule périodicité que l'arrêté indexe sur la
                  classe est la visite de la commission de sécurité (GH 4 § 3) ;
                  et GH 66 dispose que le classement retient l'usage PRINCIPAL
                  de l'immeuble, les dispositions de chaque classe s'appliquant
                  « dans chacune des parties concernées » — la classe d'une tour
                  ne décrit donc pas le plateau qu'on y occupe.

                  CE QUI PART AVEC ELLE, ET QU'IL FAUT SAVOIR : ce menu était le
                  seul chemin par lequel un dossier portant l'ancienne valeur
                  `GHW` pouvait être corrigé en GHW1 ou GHW2. Le palier du
                  § 9 bis de `docs/chantiers-ouverts.md` comptait dessus ; son
                  amendement du 2026-09-03 dit ce que cela change. Ce qui est
                  ACQUIS en revanche l'est plus fortement qu'avant : plus aucune
                  surface ne peut écrire une classe, quelle qu'elle soit, donc
                  le compte des `GHW` en production ne peut plus remonter. */}
            </div>

            {/* Habitation */}
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-start gap-3">
                <input
                  type="checkbox"
                  name="estHabitation"
                  checked={estHabitation}
                  onChange={(e) => setEstHabitation(e.currentTarget.checked)}
                  className={CASE_A_COCHER}
                />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[14px] font-semibold leading-[1.35] text-[color:var(--board-ink)]">
                    Immeuble d&apos;habitation
                  </p>
                  <p className="m-0 mt-1 max-w-[66ch] text-[12.5px] leading-[1.55] text-[color:var(--board-slate-mid)]">
                    Logements collectifs. Code de la construction et de
                    l&apos;habitation — paratonnerres, ramonage, ascenseurs.
                  </p>
                </div>
              </label>

              {/* LA QUESTION « FAMILLE D'HABITATION » A ÉTÉ RETIRÉE LE
                  2026-09-03, trois jours après avoir été posée. Elle offrait
                  les cinq familles de l'article 3 de l'arrêté du 31 janvier
                  1986 — liste juste, source juste, confrontée au verbatim le
                  2026-09-03 et confirmée. Elle part parce qu'aucune obligation
                  n'en dépend : l'unique obligation périodique du texte est son
                  article 101, il vise « le propriétaire » et ne mentionne
                  aucune famille. Les familles gouvernent la CONSTRUCTION —
                  degrés coupe-feu des cages d'ascenseurs (art. 97), colonnes
                  sèches (art. 98) —, et l'article 98 dispense même certaines
                  3ᵉ familles B de colonne sèche : la famille ne détermine donc
                  pas ce que le bâtiment contient. Voir
                  `corpus/arrete-1986-habitation.ts`. */}
            </div>
          </div>
        </SectionChamps>
      </div>

      {state.status === "error" && !state.fieldErrors && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]">
          {state.message}
        </p>
      )}
      {/* Un refus qui vise un champ est rendu SOUS ce champ — six cents lignes
          plus haut que le bouton pour les premiers d'entre eux. Sans cette
          ligne, « Enregistrer » ne changeait rien à portée de regard. */}
      {state.status === "error" && state.fieldErrors && (
        <p
          role="alert"
          className="m-0 text-[12.5px] text-[color:var(--board-signal-ink)]"
        >
          Non enregistré —{" "}
          {Object.values(state.fieldErrors).flat().filter(Boolean)[0] ??
            "un champ est à corriger plus haut."}
        </p>
      )}
      {state.status === "success" && (
        <p className="m-0 text-[12.5px] text-[color:var(--board-green-ink)]">
          Enregistré.
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="board" size="board" disabled={pending}>
          {pending ? "Enregistrement…" : libelleSubmit}
        </Button>
        {labelAnnuler && (
          <Link
            href={labelAnnuler.href}
            className={buttonVariants({
              variant: "boardClair",
              size: "board",
            })}
          >
            {labelAnnuler.libelle}
          </Link>
        )}
      </div>
    </form>
  );
}
