# A publier -- julien-agency, identite confirmee -- en attente de l'accord de Julien pour publier

**Identite `averse-cooser` confirmee par test reel le 12/09/2026** (voir
`references/etat-linkedin-20260912.md` pour le detail complet de la methode) : appel MCP
reel de `LINKEDIN_GET_MY_INFO` sur la connexion partagee `averse-cooser`, champ `id` retourne
= `aFqu-W7ClW` -- **julien-agency**, pas julien-partners comme le pensait initialement Julien
(hypothese "compte marque par defaut", non confirmee a l'epoque, infirmee par ce test).

**Ne pas publier malgre tout** : l'identite technique est solide, mais publier un post reste
un acte public et irreversible sur le compte de Julien -- Julien a ete informe du renversement
d'identite et son accord explicite est attendu avant tout appel reel de
`publierCarrouselViaImage`. Ne pas trancher ce point seul.

## Ce qui est pret (rebascule sur julien-agency le 12/09/2026)

- `julien-agency-2026-09-12.json` -- 5 diapos, contenu reel (pas une fixture de test),
  **re-redige** dans le ton de julien-agency (confiant, direct, pedagogue, oriente-dirigeants
  -- voir `reglages-comptes.json`), pas une simple reutilisation du texte pense pour
  julien-partners : la version initiale s'appuyait sur un angle "reseau professionnel"
  (diapo 3, "le reseau professionnel est plus petit qu'on ne le pense") propre au
  positionnement facilitateur/reseau de julien-partners -- retire et remplace par un angle
  cout/consequence pour l'entreprise, coherent avec le positionnement dirigeants de
  julien-agency.
- `julien-agency-2026-09-12.commentary.txt` -- texte du post LinkedIn, meme ajustement de ton
  (registre plus direct/affirmatif, moins empathique).
- Rendu local deja verifie visuellement le 12/09/2026 (PDF 5 pages + image de couverture
  1080x1350px, diapo hook, mode "couverture", template julien-agency -- palette verte/terracotta
  correcte) -- mais **`sortants/` est dans `.gitignore`** (scratch local, jamais commit), donc
  ces fichiers ne sont pas dans le depot. Pour les regenerer a l'identique :

  ```bash
  node generer-pdf.js julien-agency a-publier/julien-agency-2026-09-12.json
  node generer-images.js couverture julien-agency a-publier/julien-agency-2026-09-12.json
  ```

  Le nom de fichier genere depend de la date du jour de generation (voir la convention de
  nommage en tete de `generer-pdf.js`) -- adapter le chemin dans la commande ci-dessous au nom
  reellement produit.

## Trace de l'ancienne hypothese (julien-partners) -- gardee pour l'historique

Le contenu initial (memes 5 diapos, angle "reseau professionnel" a la diapo 3, commentary un
peu plus chaleureux) a ete redige le 12/09/2026 pour julien-partners, sur l'hypothese non
confirmee de Julien. Il n'est plus dans ce dossier (remplace par la version julien-agency
ci-dessus) mais son historique reste dans `git log` de ce fichier et de
`julien-partners-2026-09-12.json`/`.commentary.txt` (renommes puis reecrits dans le meme
commit que celui-ci). julien-partners reste un compte a acces LinkedIn **non confirme/a
ouvrir** -- rien n'empeche d'y refaire un carrousel une fois son propre acces verifie, mais ce
n'est plus la priorite du 20/09 (voir SKILL.md).

## A faire une fois l'accord explicite de Julien obtenu

```js
const { publierCarrouselViaImage } = require('./lib/publier');
const fs = require('fs');

await publierCarrouselViaImage({
  authorUrn: 'urn:li:person:aFqu-W7ClW', // confirme par LINKEDIN_GET_MY_INFO le 12/09/2026
  modeRepli: 'couverture',
  cheminsImages: ['sortants/julien-agency/<nom-genere-a-l-etape-precedente>--couverture.png'],
  commentary: fs.readFileSync('a-publier/julien-agency-2026-09-12.commentary.txt', 'utf8').trim(),
});
```

Point non verifie par un appel reel, documente dans `lib/publier.js` : est-ce que
`LINKEDIN_CREATE_LINKED_IN_POST.images` accepte l'image telle quelle en mode "couverture" (un
seul element dans le tableau) -- c'est le cas le plus simple des deux modes, choisi ici en
premier pour cette raison.
