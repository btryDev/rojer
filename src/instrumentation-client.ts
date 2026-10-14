// Exécuté dans le navigateur avant que l'application ne devienne interactive
// (convention Next `instrumentation-client`).
//
// zod sans compilation à la volée (audit OWASP S7, 2026-10-14). À la création
// de chaque schéma objet, zod 4 sonde `new Function("")` pour savoir s'il peut
// compiler un analyseur rapide. Sous la CSP bloquante, qui n'admet pas
// `'unsafe-eval'`, la sonde lève — zod se replie sur l'analyseur interprété,
// rien ne casse — mais le navigateur journalise une violation de CSP sur
// chaque page qui porte un formulaire (relevé dans Chrome sur
// `/etablissements/[id]/accessibilite`). `jitless` coupe la sonde : zod ne
// tente plus rien. Le réglage doit précéder la création du premier schéma,
// d'où ce fichier, chargé avant le code des pages. Seul `config` est importé :
// `zod` déclare `sideEffects: false`, le reste du paquet n'entre pas dans les
// pages qui n'ont pas de schéma (mesuré sur `/login`).
import { config } from "zod";

config({ jitless: true });
