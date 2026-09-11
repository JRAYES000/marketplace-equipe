# A publier -- julien-partners, pret des que l'identite `averse-cooser` est confirmee

**Ne rien executer ici avant confirmation reelle** (voir `references/etat-linkedin-20260912.md`
et le SKILL.md de ce paquet). Cette confirmation est bloquee au 12/09/2026 : le seul canal
capable d'appeler `LINKEDIN_GET_MY_INFO` sur la connexion partagee `averse-cooser` est le canal
MCP (`connect.composio.dev/mcp`), qui exige un flux OAuth complet (AuthKit/WorkOS via
`login.composio.dev`) -- construire ce flux a la main (enregistrement OAuth reussi, mais
generation des parametres PKCE puis navigation navigateur bloquees par le classifieur auto-mode
de Claude Code) n'a pas abouti. A relancer par Julien lui-meme (ou toute personne pouvant
completer ce flux), pas par une nouvelle tentative de contournement depuis cette session.

## Ce qui est pret

- `julien-partners-2026-09-12.json` -- 5 diapos, contenu reel (pas une fixture de test),
  redige comme jugement editorial pour ce compte (ton : chaleureux, professionnel,
  facilitateur, oriente-reseau -- voir `reglages-comptes.json`).
- `julien-partners-2026-09-12.commentary.txt` -- texte du post LinkedIn qui accompagnerait
  l'image de couverture.
- Rendu local deja verifie visuellement le 12/09/2026 (PDF 5 pages + image de couverture
  1080x1350px, diapo hook, mode "couverture") -- mais **`sortants/` est dans `.gitignore`**
  (scratch local, jamais commit), donc ces fichiers ne sont pas dans le depot. Pour les
  regenerer a l'identique :

  ```bash
  node generer-pdf.js julien-partners a-publier/julien-partners-2026-09-12.json
  node generer-images.js couverture julien-partners a-publier/julien-partners-2026-09-12.json
  ```

  Le nom de fichier genere depend de la date du jour de generation (voir la convention de
  nommage en tete de `generer-pdf.js`) -- adapter le chemin dans la commande de l'etape 2
  ci-dessous au nom reellement produit.

## A faire une fois l'identite confirmee

1. Confirmer laquelle de ces deux URN correspond reellement a `averse-cooser` (sortie brute de
   `LINKEDIN_GET_MY_INFO` a comparer aux deux `id` connus) :
   - `urn:li:person:ZvLHybJZhj` (julien-partners)
   - `urn:li:person:aFqu-W7ClW` (julien-agency)
2. Si c'est bien julien-partners (l'hypothese de Julien, non confirmee a ce jour), executer :

   ```js
   const { publierCarrouselViaImage } = require('./lib/publier');
   const fs = require('fs');

   await publierCarrouselViaImage({
     authorUrn: 'urn:li:person:ZvLHybJZhj', // a reconfirmer avant d'executer
     modeRepli: 'couverture',
     cheminsImages: ['sortants/julien-partners/<nom-genere-a-l-etape-precedente>--couverture.png'],
     commentary: fs.readFileSync('a-publier/julien-partners-2026-09-12.commentary.txt', 'utf8').trim(),
   });
   ```

3. Si c'est julien-agency (ou un autre compte) : ne PAS executer tel quel -- rien ne garantit
   que le contenu ci-dessus convient au ton d'un autre compte. Revenir sur cette confirmation
   avant toute publication.

Point non verifie par un appel reel, documente dans `lib/publier.js` : est-ce que
`LINKEDIN_CREATE_LINKED_IN_POST.images` accepte l'image telle quelle en mode "couverture" (un
seul element dans le tableau) -- c'est le cas le plus simple des deux modes, choisi ici en
premier pour cette raison.
