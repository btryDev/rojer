// Fabrique la vidéo d'une visite guidée, depuis son gabarit HTML animé.
//
//   pnpm visite:rendre equipements
//
// Si `scripts/visites/musique/<cle>.m4a` existe, la musique est posée sous
// l'image : ramenée à -21 LUFS (discrète), coupée à la durée de la vidéo,
// fondue sur sa dernière seconde.
//
// Écrit, dans `public/videos/` : `visite-<cle>.mp4`, son image d'aperçu
// `visite-<cle>.jpg` et la vignette de l'îlot `visite-<cle>-vignette.jpg`
// (les noms que lit `src/lib/visite/visites.ts`).
//
// Comment : le gabarit `scripts/visites/<cle>.html` est une page animée par
// GSAP, aux couleurs de la charte. Ses `{{…}}` reçoivent les vraies icônes
// et la vraie illustration de l'app (rendues ici depuis leurs composants),
// et GSAP lui-même. Chrome, sans fenêtre, avance l'horloge de l'animation
// image par image (30 par seconde) et capture chacune ; FFmpeg assemble.
// Rien n'est filmé en temps réel : le rendu est identique d'une fois sur
// l'autre.
//
// Prérequis : FFmpeg (`brew install ffmpeg`) et Google Chrome — ou un
// Chromium désigné par `CHROME_PATH`.

import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentType } from "react";
import * as Lucide from "lucide-react";
import { chromium } from "playwright-core";
import { IllustrationEquipements } from "../../src/components/entete-page/illustrations/Equipements";
import { ICONE_CATEGORIE } from "../../src/components/equipements/MarqueCategorie";

const FPS = 30;
/** Volume de la musique, en LUFS intégrés : sous une page qu'on lit, pas devant. */
const VOLUME_MUSIQUE = -21;
// Lancé par `pnpm`, depuis la racine du dépôt.
const RACINE = process.cwd();
const CHROME =
  process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

type Icone = ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
const icone = (C: Icone, size: number, color?: string) =>
  renderToStaticMarkup(<C size={size} strokeWidth={1.75} color={color} />);

/** Ce que les `{{…}}` des gabarits peuvent demander. */
function remplissages(): Record<string, string> {
  const lucide = Lucide as unknown as Record<string, Icone>;
  const r: Record<string, string> = {
    illustration: renderToStaticMarkup(<IllustrationEquipements />),
    extincteur: icone(ICONE_CATEGORIE.EXTINCTEUR as Icone, 22, "#fff"),
    extincteur_grand: icone(ICONE_CATEGORIE.EXTINCTEUR as Icone, 40, "#fff"),
    elec: icone(ICONE_CATEGORIE.INSTALLATION_ELECTRIQUE as Icone, 22, "#fff"),
    ClipboardCheck_grand: icone(lucide.ClipboardCheck, 38),
    gsap: readFileSync(createRequire(path.join(RACINE, "package.json")).resolve("gsap/dist/gsap.min.js"), "utf8"),
  };
  for (const nom of [
    "ListTodo", "HardHat", "Building2", "Archive", "Settings", "Wrench", "Warehouse", "Users",
    "NotebookText", "Accessibility", "Droplets", "PanelLeft", "House", "ArrowLeft", "ChevronDown",
    "Check", "FileText",
  ]) {
    r[nom] = icone(lucide[nom], 18);
  }
  return r;
}

function construire(cle: string): string {
  const gabarit = path.join(RACINE, "scripts/visites", `${cle}.html`);
  if (!existsSync(gabarit)) throw new Error(`Pas de gabarit : ${gabarit}`);
  const r = remplissages();
  // Une fonction de remplacement, et non une chaîne : GSAP contient des `$`.
  return readFileSync(gabarit, "utf8").replace(/\{\{(\w+)\}\}/g, (_, k: string) => {
    if (!(k in r)) throw new Error(`{{${k}}} : rien pour le remplir`);
    return r[k];
  });
}

async function rendre(cle: string) {
  const travail = mkdtempSync(path.join(tmpdir(), `visite-${cle}-`));
  const html = path.join(travail, "visite.html");
  writeFileSync(html, construire(cle));
  const images = path.join(travail, "images");
  execFileSync("mkdir", [images]);

  let dureeRendue = 0;
  const navigateur = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await navigateur.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5 });
    await page.goto(`file://${html}`);
    await page.waitForFunction(() => (window as unknown as { pret?: boolean }).pret === true);
    const { duree, debut } = await page.evaluate(() => {
      const w = window as unknown as { duree: number; debut?: number };
      return { duree: w.duree, debut: w.debut ?? 0 };
    });
    const n = Math.ceil((duree - debut) * FPS);
    for (let i = 0; i < n; i++) {
      await page.evaluate((t) => (window as unknown as { allerA: (t: number) => void }).allerA(t), debut + i / FPS);
      await page.screenshot({ path: path.join(images, `${String(i).padStart(5, "0")}.png`) });
    }
    console.log(`${n} images, ${(n / FPS).toFixed(1)} s`);
    dureeRendue = n / FPS;
  } finally {
    await navigateur.close();
  }

  const sortie = (nom: string) => path.join(RACINE, "public/videos", nom);
  const ffmpeg = (...args: string[]) => execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...args]);
  const premiere = path.join(images, "00000.png");
  const musique = path.join(RACINE, "scripts/visites/musique", `${cle}.m4a`);
  const son = existsSync(musique)
    ? [
        "-i", musique, "-map", "0:v", "-map", "1:a",
        "-af", `loudnorm=I=${VOLUME_MUSIQUE}:TP=-2:LRA=11,afade=t=out:st=${(dureeRendue - 1.2).toFixed(2)}:d=1.2,apad`,
        "-c:a", "aac", "-b:a", "160k", "-t", dureeRendue.toFixed(2),
      ]
    : ["-an"];
  ffmpeg("-framerate", String(FPS), "-i", path.join(images, "%05d.png"), ...son, "-c:v", "libx264", "-preset", "slow",
    "-crf", "25", "-pix_fmt", "yuv420p", "-movflags", "+faststart", sortie(`visite-${cle}.mp4`));
  ffmpeg("-i", premiere, "-vf", "scale=1280:-1", "-q:v", "4", sortie(`visite-${cle}.jpg`));
  ffmpeg("-i", premiere, "-vf", "scale=240:-1", "-q:v", "5", sortie(`visite-${cle}-vignette.jpg`));
  rmSync(travail, { recursive: true, force: true });
  console.log(`public/videos/visite-${cle}.mp4, .jpg, -vignette.jpg`);
}

const cle = process.argv[2];
if (!cle) {
  console.error("Usage : pnpm visite:rendre <cle>   (ex. equipements)");
  process.exit(1);
}
rendre(cle).catch((e) => {
  console.error(e);
  process.exit(1);
});
