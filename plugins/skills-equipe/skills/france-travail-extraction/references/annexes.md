# Annexes — à lire quand le sujet se présente

## Pourquoi Claude in Chrome, et pas une autre route

Trois impasses testées, à ne pas refaire :

- **Pas d'API.** `recherche-profil` est une appli Apache Tapestry rendue côté serveur.
- **Pas de Playwright ni de fetch anonyme.** L'OTP de la 2FA bloque systématiquement.
- **Pas le navigateur intégré, ni Firecrawl.** Ils n'ont pas la session recruteur : une page
  déconnectée ne montre ni nom ni CV.

La skill `routage-lecture-web` fait préférer ces autres routes pour ne pas confisquer le poste.
**Ici, Claude in Chrome prime sur cette matrice.** Il pilote par le protocole, sans prendre la
souris ni le clavier. La contrepartie : travailler en arrière-plan autant que possible et ne
réclamer l'onglet visible que pour la Phase 2.

L'email n'apparaît **jamais** dans l'interface (« masqué pour raisons de sécurité »). Il ne
s'obtient que par le CV téléchargé. Un candidat sans CV n'a donc pas d'email : c'est normal.

## Replis

| Symptôme | Cause et geste |
|---|---|
| Retour vers la page de connexion en plein run | session expirée : s'arrêter, demander la reconnexion, reprendre au profil en cours |
| Parcours à ~25 s par profil, sans erreur | onglet caché sans parades : réinjecter `scripts/arriere-plan.js` |
| Modale qui ne s'ouvre pas, captures en timeout | onglet caché ou fenêtre minimisée : contrôler `document.hidden`, puis demander à l'utilisateur |
| Un seul CV pour tout un lot | téléchargements multiples non autorisés dans Chrome |
| `ft-journal.json` absent de Downloads après `__exporter()` | même cause (téléchargements bloqués) ; sinon relire le journal par la méthode ci-dessous |
| « Afficher le numéro » absent alors qu'un bloc contact existe | un scroll ou un rechargement de la section, puis conclure à l'absence de téléphone |
| `ERREUR : … absent` dans un script Bash | poppler ou tesseract manquent : le signaler, ne pas continuer sans OCR |
| `revue` montre beaucoup d'`incertain` | des CV manquent ou un fichier étranger s'est glissé : `nom-du-cv.sh` sur les CV du segment, puis corriger dans `choix.json` |

## Relire un long journal sans `__exporter()`

La sortie du pont JavaScript est tronquée **en silence** vers 1 000 caractères. Injecter le
journal dans la page puis le lire avec `get_page_text` (~10 000 caractères) :

```js
const a = document.createElement('article');
a.id = '__dump';
a.textContent = window.__log.filter(r => !r.deja).map(r => [r.pag, r.nom, r.titre, r.maj, r.commune, r.tel, r.telecharge, r.dlRang, r.presentation].join('~')).join('\n');
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
