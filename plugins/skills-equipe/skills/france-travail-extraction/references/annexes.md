# Annexes — à lire quand le sujet se présente

## Pourquoi Playwright (v10.0)

Mesuré le 04/10/2026 sur le profil Playwright `C:/Users/julien/.chrome-claude` :

- **Pas d'API.** `recherche-profil` est une appli Apache Tapestry rendue côté serveur.
- **La double authentification ne bloque qu'une fois.** La première connexion complète (code
  compris) pose le cookie `EnrolementEffectue` (un an) : l'appareil est enrôlé. Ensuite,
  identifiant + mot de passe suffisent, sans écran de code (relevé écran par écran, 55 s). Le
  journal de juin (« Playwright bloque sur l'OTP ») date d'avant cet enrôlement.
- **La session ne survit pas à la fermeture du navigateur** : ses cookies (`JSESSIONID_CVRECHERCHE`,
  `idtkes`) sont des cookies de session. Le navigateur Playwright se relance avec chaque
  session Claude, donc Julien retape son mot de passe à chaque run. Elle est aussi tombée une fois
  sans cause identifiée, alors qu'elle a tenu plus de 9 min sans activité le même jour.
- **Pas d'onglet visible à tenir.** Playwright lance Chrome avec
  `--disable-backgrounding-occluded-windows` et `--disable-renderer-backgrounding` : fenêtre
  réduite, la page reste `visible` et le parcours tourne à pleine vitesse (2 profils en 2 s).
  `arriere-plan.js` ne sert plus qu'au repli Claude in Chrome.
- **Pas d'autorisation « téléchargements multiples »**, et la souris de Julien n'est jamais
  touchée : les clics passent par le protocole.
- **Pas le navigateur intégré, ni Firecrawl.** Ils n'ont pas la session recruteur.

**Repli Claude in Chrome** (v9.6) si le serveur MCP Playwright manque : session ouverte dans
le Chrome de Julien, `arriere-plan.js` injecté avant tout, onglet visible en Phase 2,
téléchargements multiples autorisés, CV dans Downloads (les scripts s'y replient d'eux-mêmes
quand le dossier du lot Playwright n'existe pas). Le détail est dans l'historique git de
`SKILL.md` (v9.6).

L'email n'apparaît **jamais** dans l'interface (« masqué pour raisons de sécurité »). Il ne
s'obtient que par le CV téléchargé. Un candidat sans CV n'a donc pas d'email : c'est normal.

## Replis

| Symptôme | Cause et geste |
|---|---|
| Retour vers la page de connexion en plein run | session expirée (inactivité ou navigateur relancé) : relancer `ft-connexion.js`, Julien se reconnecte, puis `ft-extraction.js` reprend (le journal saute les profils déjà vus) |
| `Connection closed` au premier CV, le serveur Playwright redémarre | **Chrome plante sur le profil** à chaque téléchargement (rapports dans `C:/Users/julien/.chrome-claude/Crashpad/reports`), et le serveur sort sur l'erreur. Vu le 04/10/2026 après un redémarrage de Claude Desktop, réglé en vidant l'historique de téléchargements du profil : `browser_close`, vérifier qu'aucun `chrome.exe` ne tourne sur `.chrome-claude`, copier `Default/History` en `.bak`, puis vider les tables `downloads`, `downloads_url_chains` et `downloads_slices` (sqlite3 en Python). Cause exacte non prouvée. La session France Travail a survécu au plantage : relancer `ft-connexion.js`, puis reprendre la recherche |
| `ERREUR : ecouteur de telechargements absent` | le navigateur Playwright a été relancé : relancer `ft-connexion.js` |
| `erreurs` non vide dans le retour d'un tour | un CV n'a pas pu être enregistré : le noter, il sortira `non recu` à la revue |
| `cv_enregistres` = 0 alors que `telecharges` > 0 | écouteur branché sur un autre onglet : relancer `ft-connexion.js` |
| `playwright.js` refuse : fichiers d'un lot précédent | un lot n'a pas été nettoyé : `nettoyer-cv.sh` d'abord |
| « Afficher le numéro » absent alors qu'un bloc contact existe | un scroll ou un rechargement de la section, puis conclure à l'absence de téléphone |
| `ERREUR : … absent` dans un script Bash | poppler ou tesseract manquent : le signaler, ne pas continuer sans OCR |
| `revue` montre beaucoup d'`incertain` | des CV manquent ou un fichier étranger s'est glissé : `nom-du-cv.sh` sur les CV du segment, puis corriger dans `choix.json` |

## Relire un long journal sans `__exporter()`

Repli Claude in Chrome seulement : la sortie de son pont JavaScript est tronquée **en silence**
vers 1 000 caractères. Injecter le journal dans la page puis le lire avec `get_page_text` :

```js
const a = document.createElement('article');
a.id = '__dump';
a.textContent = window.__log.filter(r => !r.deja).map(r => [r.pag, r.nom, r.titre, r.maj, r.tel, r.telecharge, r.dlRang, r.presentation].join('~')).join('\n');
document.body.insertBefore(a, document.body.firstChild);
```

Retirer l'élément ensuite. `navigator.clipboard.writeText` n'est pas une option : il bloque
jusqu'au timeout.

## Conformité (détail)

Les données traitées sont des **données personnelles de demandeurs d'emploi**. La convention
CVthèque du 29/09/2026 (dépôt `ecole-naturo-ops`,
`prospection-france-travail/convention/convention-cvtheque-france-travail-signee-2026-09-29.pdf`)
fait de l'École le responsable de traitement de la base qu'elle constitue (art. 4.1). Son
annexe 2 habilite le gérant, Antoine Rayes, et tous les salariés de l'École.

**Finalités autorisées** (art. 2) : rechercher des candidats dont le profil correspond aux
formations de l'École, les contacter pour présenter ces formations et les orienter vers
l'emploi, et constituer la base de l'École.

**Obligations**, à tenir hors du skill :

- informer chaque candidat, au premier contact, du responsable du traitement, de la finalité et
  de ses droits (art. 4.2) ;
- supprimer une fiche sur demande, et au plus tard **24 mois** après le dernier contact
  (`Date extraction` sert de point de départ quand aucun contact n'a eu lieu) ;
- ne jamais céder, louer ni vendre la base (art. 3.3).

Côté skill, depuis la v9.2 : les hors-cible ne sont jamais écrits. Seule une empreinte
(SHA-256 tronqué du « prénom nom ») reste dans `%LOCALAPPDATA%/france-travail-extraction/ecartes.json`,
180 jours au plus, pour ne pas retraiter la même personne. C'est une donnée pseudonymisée, pas
anonyme : un nom connu se reteste contre la liste. La supprimer efface toute trace des
hors-cible.

Depuis la v9.4 : le CV de chaque candidat **retenu** est gardé dans le Google Drive de Julien,
`Mon Drive/01 ECOLE NATURO/CV France Travail`, sous « Prénom Nom AAAA-MM-JJ.pdf ». Il fait
partie de la base de l'École et suit les mêmes règles : jamais partagé hors de l'École,
supprimé avec la fiche (sur demande, ou 24 mois après le dernier contact). Le CV d'un
hors-cible n'y entre jamais.
