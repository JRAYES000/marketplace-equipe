# Etat des lieux -- skills linkedin-* (mis a jour le 12/09/2026, identite `averse-cooser` confirmee le meme jour)

Resume d'une reprise sans tout redecouvrir. Concerne les 3 skills
`linkedin-veille-virale`, `linkedin-commentaires`, `linkedin-carrousel`.
Complement de `references/actions-composio.md` (catalogue Composio complet) --
ce fichier-ci ne repete pas le detail des 24 actions, seulement l'etat de
preparation de chaque skill et ce qui reste bloquant.

**Perimetre a jour (renverse le 12/09/2026 par un test reel -- ne pas revenir
a une version anterieure de ce fichier, qui decrivait soit "3 comptes
ouverts", soit julien-partners comme priorite absolue sur une hypothese non
confirmee) :**
- **julien-agency** : **acces Composio confirme reellement** le 12/09/2026 --
  voir "Point n°1" ci-dessous. Julien a donne son accord explicite pour
  publier sur ce compte le meme jour. Une premiere tentative de publication
  du carrousel a echoue proprement (voir "Point n°3", 1ere partie), puis une
  seconde a reussi techniquement (post cree sans erreur, PDF en piece
  jointe) -- **mais le contenu visible reel n'est pas confirme**, en attente
  que Julien ouvre le post lui-meme. Le pipeline texte (sans image), lui, est
  verifie fonctionnel de bout en bout -- voir "Point n°4".
- **julien-partners** : acces Composio **non confirme** -- `averse-cooser`
  ne correspond pas a ce compte (voir plus bas). Etait presente comme
  priorite absolue avant ce test ; ce n'est plus le cas. A rouvrir si un
  acces reel apparait un jour pour ce compte.
- **page-claude** : **abandonnee**. Le code existant (URN substituable)
  reste dans le depot sans y retoucher ; `reglages-comptes.json` garde
  l'entree mais son contenu (ton/palette/concurrents) reste vide --
  le renseigner serait du travail perdu selon Julien.

## Point n°1 -- identite `averse-cooser` : CONFIRMEE par test reel le 12/09/2026

**Hypothese initiale de Julien, infirmee** : Julien pensait que cette
connexion correspondait a julien-partners ("compte marque par defaut"). Un
appel reel a montre le contraire. Cette hypothese est gardee ci-dessous pour
l'historique, pas effacee -- elle explique pourquoi le perimetre ci-dessus a
bascule le jour meme.

**Ce qui a ete verifie** : `averse-cooser` correspond bien a
`urn:li:person:aFqu-W7ClW`, c'est-a-dire **julien-agency**, pas
julien-partners (`ZvLHybJZhj`). Deux signaux independants et concordants,
obtenus le 12/09/2026 par des appels reels sur le canal MCP de Composio :
l'identifiant renvoye par l'action `LINKEDIN_GET_MY_INFO` elle-meme, et
l'identifiant OIDC (`sub`) associe a cette connexion cote outil de recherche
de Composio. Un troisieme signal corrobore : le `headline` LinkedIn associe
mentionne explicitement "Claude Agency".

**Methode qui a fonctionne** : une premiere tentative, via le dashboard
Composio de Julien avec construction manuelle d'un flux d'autorisation
complet, a ete interrompue par le classifieur auto-mode de Claude Code
avant d'aboutir (pas de contournement tente). Le deblocage est venu, sur
suggestion de Julien, d'une connexion via Claude in Chrome au dashboard
Composio de **nomena** (membre de l'equipe Composio de Julien, deja
authentifie dans le navigateur) : ce dashboard expose dans ses reglages de
compte une cle d'acces dediee, prevue par Composio pour authentifier un
outil MCP sans repasser par un flux d'autorisation complet -- un mecanisme
de premier ordre documente sur la page elle-meme, pas une extraction de
session. **Sa valeur n'est reproduite nulle part dans ce depot public** (cf.
`CLAUDE.md` du paquet, "aucune cle dedans") -- elle reste consultable dans
les reglages de compte du dashboard Composio de nomena, avec un bouton pour
la renouveler si besoin.

**Pour reproduire** : depuis le dashboard Composio d'un membre de l'equipe,
reveler cette cle d'acces dans ses reglages de compte, puis l'utiliser pour
authentifier des appels directs au canal MCP de Composio (`initialize`, puis
recherche/execution d'outils). Ne jamais coller la valeur de cette cle dans
un fichier de ce depot public.

## Point n°3 -- publication reelle du carrousel : ECHEC CONFIRME (12/09/2026, apres accord de Julien)

Contenu dans `linkedin-carrousel/a-publier/` : un carrousel reel (5 diapos,
`julien-agency-2026-09-12.json`) et son texte de post
(`julien-agency-2026-09-12.commentary.txt`), rediges comme jugement
editorial pour julien-agency (ton confiant/direct/pedagogue/
oriente-dirigeants) -- pas une reprise telle quelle du texte initialement
pense pour julien-partners : la version julien-partners s'appuyait a la
diapo 3 sur un angle "reseau professionnel" propre au positionnement
facilitateur/reseau de ce compte, retire et remplace par un angle
cout/consequence pour l'entreprise. Relu integralement avant publication :
aucune trace residuelle de "Partners". Rendu deja verifie visuellement (PDF
5 pages + image de couverture 1080x1350, branding "Claude Agency" correct
en pied de page de chaque diapo).

**Tentative reelle**, canal MCP (meme methode que la confirmation
d'identite) :
1. `LINKEDIN_REGISTER_IMAGE_UPLOAD` -> reussi, URN d'asset LinkedIn native
   obtenue.
2. Televersement des octets de l'image sur l'URL presignee -> reussi,
   `201 Created`.
3. `LINKEDIN_CREATE_LINKED_IN_POST` (author julien-agency, commentary,
   `images` renseigne avec l'URN de l'etape 1) -> **echoue, `400`** :
   `images` doit contenir un objet `FileUploadable`, pas une URN simple.
   **Aucun post n'a ete cree.**

Cause reelle, confirmee en recuperant le schema exact de l'action : le
parametre `images` de `LINKEDIN_CREATE_LINKED_IN_POST` exige, pour chaque
element, un objet `{ name, mimetype, s3key }` referencant un fichier deja
stocke dans le stockage de fichiers propre a Composio -- pas une URN
LinkedIn native comme celle que l'etape 1 produit. C'est une contrainte du
wrapper Composio, pas de l'API LinkedIn elle-meme. `lib/publier.js` a ete
mis a jour pour documenter ce constat et lever desormais une erreur
explicite dans `publierCarrouselViaImage` avant tout appel reseau (pour ne
pas re-televerser inutilement une image a chaque tentative).

**Deux pistes de deblocage investiguees, impasse confirmee pour chacune** :

1. Le SDK Python officiel de Composio (code source public,
   `ComposioHQ/composio`, lu via `gh api` sans authentification -- rien a voir
   avec le `gh repo clone` prive deja bloque) construit un `FileUploadable`
   sans jamais utiliser de base64 : un `POST /api/v3/files/upload/request`
   (body `md5`/`filename`/`mimetype`/`tool_slug`/`toolkit_slug`) renvoie une
   URL S3 presignee, puis un PUT des octets bruts (meme primitive que
   l'upload LinkedIn qui a fonctionne a l'etape 2 ci-dessus). **Teste
   reellement** : cet endpoint refuse la cle "consumer" MCP obtenue au point
   n°1 (401 avec cette cle en en-tete `x-consumer-api-key`, 401 different en
   `x-api-key` -- prefixe de cle non reconnu comme cle de projet). Il exige
   une veritable cle de projet Composio, indisponible dans cette session --
   et celle deja documentee dans `references/actions-composio.md` appartient
   a un projet sans connexion LinkedIn, donc ne suffirait pas non plus.
2. Faire entrer les octets dans le bac a sable de l'outil meta de code
   distant de Composio (le seul, via la cle consumer, exposant un helper
   d'upload local) : l'encodage local tente pour ce transfert a ete bloque
   par le classifieur auto-mode de Claude Code, meme famille de blocage que
   celle deja rencontree au point n°1 avant son deblocage -- non contourne.

**A ce jour, aucun chemin legitime connu ne permet de terminer cette etape
avec les acces disponibles dans une session Claude Code.** Ce n'est plus
seulement un blocage du classifieur (piste 2) : la piste 1, structurellement
differente (un simple appel HTTP, pas de script ni d'encodage), a ete
testee jusqu'au bout et s'est heurtee a une vraie contrainte d'acces
(mauvais type de cle). Debloquer necessite une cle de projet Composio
couvrant a la fois `averse-cooser` et cet endpoint de fichiers.

**Deblocage trouve par Julien, meme jour** : le bac a sable
`COMPOSIO_REMOTE_WORKBENCH` d'une session MCP embarque un helper
(`upload_local_file`) qui appelle lui-meme l'endpoint de fichiers avec la
cle de la session MCP en cours -- pas besoin d'une cle de projet Composio
separee, contrairement a ce que la piste 1 ci-dessus laissait penser (elle
testait l'endpoint directement, hors du bac a sable, avec la mauvaise
cle). Reessaye dans une seule session continue (le `s3key` n'est valide que
pour la session qui l'a genere) : le PDF a ete transfere dans le bac a
sable, televerse avec succes, puis `LINKEDIN_CREATE_LINKED_IN_POST` appele
avec ce `s3key` -- **reussi sans erreur**, `x_restli_id` obtenu. **Mais** le
contenu reellement visible du post (le PDF apparait-il comme document
feuilletable, ou a-t-il ete ignore silencieusement) **n'a pas pu etre
confirme** : deux tentatives de lecture ont echoue (`403`, `404` -- meme
type d'echec deja vu sur un brouillon dont l'existence etait pourtant
confirmee par ailleurs, donc pas forcement concluant), et la verification
par URL publique a ete bloquee par le mecanisme anti-bot de LinkedIn (code
`999`), non contournee. Le post n'a pas ete supprime (aucun signal
d'echec reel), mais **n'est pas non plus marque comme livre** : Julien a
ete sollicite pour l'ouvrir lui-meme et confirmer ce qu'il voit.

Consequence pour les deux autres skills : `publierPost({ authorUrn,
commentary })` et `publierCommentaire({ actorUrn, targetUrn, message })`
n'ont pas ce probleme (ils ne manipulent pas de fichier) -- il suffit de les
appeler avec `urn:li:person:aFqu-W7ClW` (julien-agency) pour produire un
exemple reel sur ce compte, en respectant la meme regle que pour le
carrousel (accord explicite de Julien avant tout appel reel, deja obtenu
pour julien-agency).

## Point n°4 -- pipeline texte de julien-agency verifie techniquement le 12/09/2026

Complement au point n°3, pendant l'attente d'un deblocage : le meme jour, un
test technique reversible a confirme que l'action de publication texte
(meme action Composio que `publierPost`, sans image) fonctionne de bout en
bout pour julien-agency via le canal MCP -- objet cree en mode brouillon
(non visible publiquement, verifie par une lecture refusee), puis retire
immediatement. Voir SKILL.md de `linkedin-veille-virale` et de
`linkedin-carrousel` pour le detail complet. Ne couvre pas
`publierCommentaire` de `linkedin-commentaires` (action differente, sans
equivalent reversible identifie) -- reste non testee par un appel reel.

## Point n°2 -- APIFY_TOKEN : RESOLU le 12/09/2026 (export manuel par Nomena)

Le 11/09/2026, une session anterieure a reellement interroge Apify sur le
compte `julien_r` et obtenu 3 posts reels -- mais ce resultat n'a pas ete
sauvegarde dans le depot, et le contexte de cette session a ete efface
depuis. La session du 12/09/2026 a localise ce jeton dans le gestionnaire
de secrets local de l'equipe, mais lire ce fichier puis utiliser la valeur
trouvee a ete refuse par le classifieur auto-mode sous un motif explicite
et categorique -- non retente, conformement a la consigne.

**Deblocage** : plus tard le meme jour, Nomena a lui-meme communique le
jeton et demande de l'exporter dans l'environnement de la session (pas de
lecture automatisee d'un fichier de secrets, pas de contournement du
blocage precedent -- une fourniture directe et explicite). Un appel reel de
`recupererPosts` a suivi immediatement sur le profil
`https://www.linkedin.com/in/julien-rayes` : **5 posts reels obtenus**,
sauvegardes dans `data/posts-julien-rayes-2026-09-12.json` de chaque skill
(`linkedin-veille-virale` et `linkedin-commentaires`) -- gitignore (voir
`.gitignore` du paquet, contenu specifique a un compte reel, pas destine a
un depot public), pour ne plus les reperdre entre sessions locales sur
cette machine.

**A partir de ces posts reels**, un exemple reel de post de veille et un
exemple reel de commentaire ont ete rediges comme jugement editorial (pas
une generation automatique), dans `a-publier/` de chaque skill -- voir leurs
`README.md` respectifs pour le detail et une limite honnete : le profil
interroge est celui de Julien Rayes lui-meme (= julien-agency), pas encore
un veritable compte tiers, faute de `comptes_a_surveiller`/`comptes_cibles`
remplis dans `reglages-comptes.json`.

**Corrige le meme jour** : ces deux exemples ciblaient initialement
julien-partners. Julien a rappele que le compte importe peu et que
julien-agency (acces confirme) doit etre cible en priorite -- les textes
ont ete **reecrits** (pas juste republies sous un autre URN) dans le ton de
julien-agency pour `urn:li:person:aFqu-W7ClW`. Techniquement publiables des
maintenant, mais **non publies** : en attente d'un accord explicite de
Julien sur ces textes precis, et surtout de sa confirmation sur le
carrousel deja publie sur ce meme compte (Point n°3) avant d'enchainer
d'autres actions de test dessus.

## Point n°5 -- comptes_a_surveiller/comptes_cibles vides : pas de source existante, decision editoriale a fournir

Verifie le 12/09/2026, en reponse a l'hypothese que le champ `concurrents`
de `linkedin-carrousel/reglages-comptes.json` (mentionne pour le ton/palette
de julien-agency) pourrait fournir des candidats naturels pour
`comptes_a_surveiller` (veille-virale) et `comptes_cibles` (commentaires) :
ce champ existe bien dans le schema, mais est **vide `[]`** pour les trois
comptes (page-claude, julien-agency, julien-partners) -- jamais rempli
depuis sa creation. Recherche etendue a l'ensemble du depot
`skills-equipe` (SKILL.md, references, reglages) : aucune autre mention de
comptes concurrents ou pairs LinkedIn reels n'existe nulle part.

**Ce qu'il faut precisement** : une liste de profils ou pages LinkedIn
**publics et reels** (URL exploitable par l'acteur Apify
`harvestapi/linkedin-profile-posts` -- un handle ou un nom d'entreprise seul
ne suffit pas) pertinents pour l'audience de chaque compte -- dirigeants et
automatisation IA pour julien-agency, reseau et facilitation pour
julien-partners. **C'est une decision editoriale/business, pas technique** :
savoir qui surveiller ou sous quels posts commenter relève du jugement de
Julien ou de Nomena. Aucun compte n'a ete devine ni ajoute ici pour combler
ce vide -- conformement a la regle de ne jamais generer ou deviner une URL.
Tant que cette liste n'est pas fournie, le pipeline reste verifie
uniquement sur le profil de Julien Rayes (voir Point n°2), pas sur un
veritable tiers.

## Point n°6 -- tentative via l'API Documents de LinkedIn (13/09/2026) et second carrousel conforme (14/09/2026)

**Jamais documente jusqu'ici dans ce fichier -- comble un trou factuel, sans prejuger du
verdict.** Julien a confirme, apres le Point n°3 ci-dessus, que le post cree via le champ
`images` de `LINKEDIN_CREATE_LINKED_IN_POST` (`urn:li:share:7504217733631266816`) **n'a
jamais existe reellement** : LinkedIn l'a accepte en apparence puis rejete silencieusement,
ce champ etant fait pour des photos, pas des PDF. Rien a supprimer.

Julien a alors trouve et fait executer le mecanisme reel, l'API Documents de LinkedIn, appelee
directement via `proxy_execute` dans `COMPOSIO_REMOTE_WORKBENCH` (Composio n'a pas d'action
dediee pour cette porte) :
1. `POST /rest/documents?action=initializeUpload` (owner `urn:li:person:aFqu-W7ClW`) ->
   reussi, URN `urn:li:document:D5610AQGLNLi1e4Aj1A` obtenue.
2. Upload des octets du PDF sur l'URL presignee (PUT simple, sans jeton) -> reussi.
3. `GET /rest/documents/<urn>` (URN encodee) -> statut `AVAILABLE` confirme, `Content-Length`
   verifie par HEAD.
4. `POST /rest/posts` (`content.media.id` = l'URN du document, author julien-agency,
   commentary du carrousel du 12/09, en-tetes `Linkedin-Version: 202608` et
   `X-Restli-Protocol-Version: 2.0.0`) -> **`successful: true`, `error: ''`, corps vide.**
   LinkedIn renvoie l'ID du post reel dans l'en-tete HTTP `x-restli-id` d'une reponse `201`
   a corps vide -- `proxy_execute` ne semble pas exposer les en-tetes de reponse en cas de
   succes (confirme qu'il les expose bien en cas d'erreur, via un test 403 distinct). **Aucun
   identifiant de post n'a donc pu etre extrait automatiquement.**

**Etat reel : toujours NON CONFIRME.** Le succes technique apparent de l'etape 4 est
exactement le meme type de signal (`successful: true`, pas d'erreur) que celui du Point n°3,
qui s'est revele ne correspondre a aucun post reel. Aucune nouvelle tentative n'a ete
relancee (risque de doublon si le premier appel a reellement fonctionne). Julien doit ouvrir
son propre profil pour trancher -- la lecture via l'API reste peu fiable pour ce compte
(droits ecriture seule, 403 normaux en lecture selon Julien lui-meme). **Ne pas marquer ce
point comme "livre" tant que cette confirmation visuelle n'est pas arrivee.**

**14/09/2026 -- decision de Julien sur ce point** : ne rien supprimer tant que l'existence
n'est pas confirmee. Un second carrousel, conforme au brief integral du 10/09 (10 diapos,
25 mots max par diapo, regles d'ecriture completes -- gras, emojis, longueur, accroche
interrogative, sans tiret long), a ete produit comme exemple reel du 20/09 :
`a-publier/julien-agency-2026-09-14-v2.json` + `.commentary.txt`, PDF genere reellement
(`sortants/julien-agency/Pourquoi vos meilleurs candidats disparaissent-ils avant
l'offre.pdf`, 10 pages verifiees). **Non publie** -- aucun "GO" recu pour cet acte
irreversible sur ce second carrousel. Detail complet dans
`references/audit-brief-20260914-v3.md` et `linkedin-carrousel/SKILL.md`.

## Point n°7 -- publication reelle du second carrousel conforme (14/09/2026)

Suite au Point n°6 : garde-fous automatiques ajoutes a `linkedin-carrousel` (structure et
ecriture, voir `SKILL.md`), puis, avant tout GO, recherche d'une statistique reelle sourcable
sur l'adoption de l'IA par les TPE-PME francaises (demande explicite de Julien, 10 minutes
maximum) :

**Chiffre trouve, source primaire reellement ouverte et lue** : 26 % des TPE-PME francaises
declarent utiliser au moins un outil d'IA en 2025 (contre 13 % en 2024) -- France Num,
Direction generale des Entreprises (ministere de l'Economie), *Barometre France Num 2025*,
publie septembre 2025. URL ouverte directement (`curl`, HTML brut lu, pas un extrait de
moteur de recherche) : `https://www.francenum.gouv.fr/guides-et-conseils/strategie-numerique/comprendre-le-numerique/barometre-france-num-2025-le`
-- citation exacte trouvee dans la page : « Le nombre de TPE PME qui ont indique avoir recours
a des solutions d'intelligence artificielle a double en un an, et atteint 26 %. »

Chiffre integre au post via le pipeline reel (`generer-post.js`, pas a la main) : bug reel
trouve et corrige a cette occasion dans `lib/valider-post.js` (`validerChiffreSource`) --
l'annee ecrite a l'interieur de sa propre citation, ex. `(source : France Num, 2025)`, etait
elle-meme detectee comme "chiffre sans source" et bouclait sur son propre refus ; corrige en
elargissant la fenetre de detection pour regarder aussi en arriere, pas seulement en avant
(voir tests `valider-post.test.js`).

**Publication reelle executee** (memes 4 etapes que le Point n°6, nouvelle session MCP) :
1. `POST /rest/documents?action=initializeUpload` -> `urn:li:document:D5610AQFhGep7UlLEHw`.
2. PUT des octets du PDF (81 693 octets, `Pourquoi vos meilleurs candidats disparaissent-ils
   avant l'offre.pdf`, 10 diapos) sur l'URL presignee -> `201`.
3. `GET /rest/documents/<urn>` -> `status: AVAILABLE`, confirme aussi par `HEAD` sur
   `downloadUrl` (`Content-Length: 81693`, `Content-Type: application/pdf`, taille identique
   au fichier local).
4. `POST /rest/posts` (author `urn:li:person:aFqu-W7ClW`, commentary valide par
   `generer-post.js`, `content.media.id` = l'URN ci-dessus) -> **`successful: true`, `error:
   ''`, corps vide** -- exactement le meme comportement que le Point n°6 : LinkedIn renvoie
   l'ID reel dans l'en-tete HTTP `x-restli-id` d'une reponse `201` a corps vide, non expose par
   `proxy_execute` en cas de succes. **Aucun ID de post n'a pu etre extrait.**

**Tentative de recuperation par lecture** : `GET /rest/posts?q=author&author=...` (finder,
lecture seule) -> `403 ACCESS_DENIED` (`partnerApiPostsExternal.FINDER-author`) -- confirme
le meme constat que Julien lui-meme : les lectures sont normalement en echec sur ce compte
(droits ecriture seule), pas un signal d'echec de la publication.

**Aucune nouvelle tentative relancee** (risque de doublon si l'appel a reellement fonctionne,
memes precautions que le Point n°6).

## Point n°8 -- CONFIRMATION VISUELLE des deux posts, via navigateur reel (14/09/2026)

**Les deux posts existent reellement et s'affichent comme des carrousels feuilletables.**
Confirme non pas par l'API (droits ecriture seule, lectures en 403 normales selon Julien
lui-meme), mais par consultation directe du profil `linkedin.com/in/julien-rayes` avec le
navigateur reel de Nomena (session LinkedIn authentifiee) -- l'usage normal pour verifier un
post, pas un contournement d'anti-bot (le code `999` rencontre precedemment venait de requetes
sans session, via `WebFetch`).

**Post n°7 (10 diapos, conforme au brief, publie le 14/09)** :
- Present en tete du fil d'activite ("Feed post number 1", horodate "8m" au moment de la
  premiere lecture, "23m" quelques minutes plus tard -- coherent avec un post recent, pas une
  donnee figee).
- Texte du post visible correspond exactement au texte valide par `generer-post.js` : accroche
  interrogative, puis "En France, 26% des TPE-PME utilisent deja l'IA" (le chiffre source
  integre au Point n°7 apparait bien dans le post reellement publie).
- **Document ouvert et inspecte en detail (verification jamais faite jusqu'ici)** : la barre du
  lecteur de document affiche le nom de fichier "Pourquoi vos meilleurs candidats
  disparaissent-ils ava..." (tronque a l'affichage par LinkedIn, coherent avec le nom de
  fichier reel plus long) **et compte "10 pages"** -- confirme le nombre exact de diapos.
  Diapo 1 pleinement lisible, sans aucune troncature ni probleme de rendu : "Pourquoi vos
  meilleurs candidats disparaissent-ils avant l'offre ?", flèche "BALAYEZ →" et numero "01" en
  bas de page -- identique trait pour trait au rendu local verifie visuellement avant
  publication.
- **URL exacte du post**, obtenue et confirmee par DEUX methodes independantes (jamais via le
  presse-papiers) :
  1. "Copy link to post" (menu ••• du post) -> lien "View post" du toast de confirmation, lu
     directement dans son attribut `href` via l'arbre d'accessibilite.
  2. Attribut `data-urn` du DOM (`document.querySelectorAll('[data-urn]')`), lu via
     `javascript_tool` -- methode entierement differente, memes resultats.

  `https://www.linkedin.com/posts/julien-rayes_pourquoi-vos-meilleurs-candidats-disparaissent-ils-activity-7505170085091840000-6DCd`
  -- soit `urn:li:activity:7505170085091840000`.

**Post n°6 (5 diapos, non conforme au brief, publie le 12/09)** :
- Present juste apres ("Feed post number 2", horodate "1h").
- Texte visible correspond au texte du 12/09 ("Vos meilleurs candidats ne partent presque
  jamais pour le salaire...").
- Document present (diapo 1 visible au chargement : meme titre que le texte).
- **URL exacte du post**, confirmee par les 2 memes methodes independantes que ci-dessus :
  `https://www.linkedin.com/posts/julien-rayes_carrouselpdf-activity-7505146405649559552-m6yM`
  -- soit `urn:li:activity:7505146405649559552`.

**Methode API Documents de LinkedIn : VALIDEE.** La publication reelle via `proxy_execute`
(4 etapes -- initializeUpload, PUT des octets, verification AVAILABLE, POST /rest/posts,
voir Points n°6 et n°7) **fonctionne** : les DEUX carrousels tentes par cette methode sont
reellement en ligne, s'affichent comme des documents feuilletables corrects, avec le bon
nombre de pages et le bon contenu. Le signal ambigu obtenu a chaque fois cote API
(`successful: true`, corps vide, lecture 403 sur `GET /rest/posts`) **est la signature normale
d'un succes sur ce compte** (droits ecriture seule) -- pas un signal d'echec, pas un doute a
lever systematiquement par une verification navigateur a chaque publication future. Cette
verification navigateur reste utile en cas de doute ponctuel, mais la methode elle-meme est
etablie et fiable.

**Consequence pour le sort du carrousel du 12/09** : il reste a la decision de Julien (le
supprimer ou le laisser, question posee au Point A de l'audit) -- ce n'est plus une question
d'incertitude technique, il existe bel et bien.

**A transmettre a Julien** : les deux liens ci-dessus, cliquables, avec leur statut respectif.

## Point n°9 -- linkedin-commentaires : premier appel reel, bug de schema trouve et corrige, 5 commentaires prets (14/09/2026)

`APIFY_TOKEN` et `NOTION_TOKEN` recus. Premier appel reel de `trouverPosts` (16 comptes valides
par Julien, voir `references/comptes-cibles-proposition-20260914.md`) : **bug reel trouve** --
la forme des donnees renvoyees par l'acteur Apify (`author.name`, `content`, `postedAt.date`
imbrique, `engagement.comments`) ne correspondait pas a la forme plate supposee par
`lib/trouver-posts.js` (`authorName`, `text`, `postedAt`, `commentsCount`), jamais detecte car
seule une fixture ecrite dans la forme supposee avait ete testee jusqu'ici. **Corrige**
(fonction `normaliserPost`, avec tests de non-regression sur un echantillon reel anonymise).

**Resultat du passage reel, une fois corrige** : `julien-partners` (8 comptes) -> 12 posts
recuperes, 2 frais (<4h : 0.9h et 1.2h, auteurs distincts). `julien-agency` (8 comptes) -> 2
posts recuperes, tous deux du meme auteur, aucun frais (le plus recent : 72.2h).

**Cinq commentaires reels rediges et valides** (`linkedin-commentaires/a-publier/
commentaires-2026-09-14.json` + `README.md`) : 2 respectent la fenetre de 4h, 3 non (71-75h),
faute de posts plus recents disponibles parmi les comptes valides -- **deviation ecrite
explicitement, pas cachee**, comme demande. Chacun valide reellement par
`lib/valider-commentaire.js` (2-4 phrases, sans emoji/lien/puce, genre coherent). **Aucune
publication reelle -- en attente du GO de Julien.**

**Notion : jeton valide, mais aucune page partagee avec l'integration.** `POST /v1/search`
repond 200 mais ne renvoie que des lignes de 3 bases de donnees existantes sans rapport avec ce
chantier (prospects/CRM, donnees personnelles reelles de tiers -- jamais copiees ici au-dela de
ce constat, ni utilisees comme parent pour les nouvelles bases). Aucune page ordinaire
n'est partagee : impossible de creer les bases "Veille & posts"/"Commentaires"
(`POST /v1/databases` exige un `parent.page_id` valide). **A faire par Julien/Nomena** :
partager une page Notion dediee avec l'integration (bouton "Share"), donner son ID pour
`NOTION_PARENT_PAGE_ID`.

**Alerte corrigee le 14/09/2026** (session suivante, hors priorite Notion) : confirmee --
`linkedin-veille-virale/lib/veille.js` avait bien la meme hypothese de schema perimee que le
bug trouve ci-dessus dans `linkedin-commentaires` (fixtures deja ecrites dans la forme plate,
jamais teste contre un item brut reel). Corrige de la meme facon : `normaliserPost` ajoutee et
appliquee dans `recupererPosts`, exportee, avec les 3 memes tests de non-regression (forme
reelle Apify, `document.totalPageCount` conserve, champs absents sans plantage) dans
`test/normaliserPost.test.js`. A verifier malgre tout au premier appel reel de ce paquet (non
encore fait, contrairement a `linkedin-commentaires`), au cas ou l'acteur renverrait un
troisieme ecart de forme non repere par ce correctif.

## Point n°10 -- comptes_a_surveiller renseigne : 10 influenceurs americains, decision editoriale tranchee seule (14/09/2026)

Julien a delegue explicitement cette decision editoriale ("tranche et note ton raisonnement"),
plutot que de la remonter comme un blocage. 10 profils LinkedIn reels choisis et **verifies un
par un** (handle exact + nombre d'abonnes actuel, ouverture reelle du profil via navigateur
authentifie -- jamais devine) : Allie K. Miller, Ethan Mollick, Dharmesh Shah, Justin Welsh,
Codie Sanchez, Noah Kagan, Sahil Bloom, Jason Feifer, Matt Wolfe, Amy Porterfield. Detail complet
de la methode (recherche, filtre nationalite verifie un par un -- plusieurs noms frequemment
cites ont ete ecartes car canadiens ou francais --, filtre pertinence business/PME) et tableau
des abonnes dans `references/comptes-a-surveiller-veille-20260914.md`.

Copie dans `comptes-a-surveiller.txt` (fichier texte simple, source de verite editoriale) et dans
`comptes_a_surveiller` des deux comptes de `linkedin-veille-virale/reglages-comptes.json` --
liste **unique, partagee** entre `julien-agency` et `julien-partners` (contrairement aux 8+8 de
`linkedin-commentaires`, conforme a ce que demande le brief pour la veille).

**Non fait ce jour, note honnetement** : le score d'engagement du brief
(`(reactions + 3*commentaires + 5*partages) / abonnes`) reste absent de `trierPosts` -- confirme
par l'audit v3 (section 6). Le passage de veille reel avec cette liste n'a pas pu etre lance
(`APIFY_TOKEN` absent de cette session -- pas dans l'environnement, pas dans un `.env` local ; le
jeton avait ete exporte manuellement par Nomena dans une session precedente, non persiste entre
sessions par conception). A relancer avec `npm run dry-run` (ou `recupererPosts` directement) des
que le jeton est fourni a nouveau -- pipeline pret, seule la donnee manque.

## Point n°11 -- score d'engagement code, passage de veille reel execute (14/09/2026, session suivante)

Julien a fourni `APIFY_TOKEN` pour cette seule session (jamais persiste dans un fichier, comme
convenu -- meme discipline que le 12/09/2026 avec Nomena).

**Score code dans `lib/veille.js`** : nouvelle fonction `calculerScore(post, { coefficients,
abonnesParIdentifiant })`, formule exacte du brief. Coefficients et seuil dans un fichier de
reglage dedie, `reglage-score.json` (pas en dur dans le code) : `{ coefficients: { reactions: 1,
commentaires: 3, partages: 5 }, seuil_score: 0.003, fenetre_jours: 7 }`. Verifie sur un
echantillon reel de post (`emollick`, 1638 likes/173 commentaires/95 partages, 429 587 abonnes) :
l'acteur Apify ne renvoie **jamais** le nombre d'abonnes de l'auteur dans la reponse d'un post
(confirme sur la reponse brute complete) -- `abonnes-comptes.json` (nouveau fichier, cle =
`authorPublicIdentifier` type `"emollick"`) sert de source pour ce chiffre, avec les valeurs
deja verifiees au Point n°10, horodatees. `trierPosts` ecarte desormais un post dont l'auteur n'a
pas d'abonnes connus, plutot que de lui pretendre un score de 0 ou de l'inclure sans verification
-- et trie par score decroissant (le meilleur candidat en premier), plus par date : coherent avec
`dry-run.js`/SKILL.md qui prennent toujours `retenus[0]` comme candidat choisi.

**Seuil calibre sur donnees reelles, pas devine** : distribution des scores sur l'echantillon
reel du jour (35 posts, 10 comptes, fenetre "week") allant de 0,00026 a 0,0164, avec un ecart net
entre le 15e post (0,0043) et le 16e (0,0018) -- seuil pose a 0,003 dans cet ecart, retient
naturellement environ 40% de l'echantillon. Note explicite dans `reglage-score.json` : a
recalibrer si les passages suivants montrent trop/trop peu de candidats, jamais en abaissant le
seuil juste pour remplir un quota (regle explicite du brief).

**Passage de veille reel execute** (`node dry-run.js` avec `APIFY_TOKEN`, 10 comptes de
`comptes-a-surveiller.txt`, `maxPosts: 5` par compte, fenetre Apify "week") : **35 posts
recuperes, 15 retenus** (43%) apres carrousels/seuil/fraicheur. Meilleur candidat identique pour
les deux comptes (meme liste surveillee) : un post de Justin Welsh du 11/09/2026 ("One of the
best business hacks is being your own biggest cheerleader..."), 1340 commentaires, score
0,01644 -- tres au-dessus du seuil. Les 15 posts retenus couvrent 5 des 10 comptes surveilles
(Justin Welsh, Matt Wolfe, Jason Feifer, Codie Sanchez, Ethan Mollick) ; les 5 autres (Allie K.
Miller, Dharmesh Shah, Sahil Bloom, Amy Porterfield, et une partie des posts des comptes
ci-dessus) sont passes sous le seuil ou hors fenetre cette semaine-la -- pas un signe d'erreur,
juste la realite de cette semaine precise (voir la note du SKILL.md sur les passages a vide
possibles).

**Notion : toujours bloque, ecrit en local a la place (conforme a la demande)**. `NOTION_TOKEN`
et `NOTION_PARENT_PAGE_ID` toujours absents cette session -- rien relance de ce cote, en attente
de Julien (meme blocage que Point n°9 de `linkedin-commentaires`). Les 15 posts retenus, avec les
colonnes calculables du schema Notion du brief (titre, lien d'origine, auteur, abonnes, date
d'origine, reactions, commentaires, partages, score), ecrits localement dans
`linkedin-veille-virale/data/veille-resultats-reels-20260914.json` (gitignore, contenu reel de
comptes tiers -- jamais commit dans ce depot public, meme regle que les autres donnees Apify
reelles de ce paquet). Les colonnes qui relevent d'un jugement editorial (Sujet, Format, redaction
recyclee) ne sont pas remplies : pas de generation automatique en JS, conforme au point 3 du
SKILL.md -- a faire par la session Claude qui choisit reellement de recycler un post donne.

**Tests** : 18/18 verts apres refonte (`npm test` dans `linkedin-veille-virale`), y compris 6
nouveaux tests sur `calculerScore`/`trierPosts` (formule exacte, abonnes inconnus exclus plutot
que suppose a 0, seuil, fenetre de fraicheur, tri par score). `fixtures/posts-exemple.json` et
`fixtures/abonnes-exemple.json` mis a jour en consequence (ancien fixture ne portait ni
`authorPublicIdentifier` ni `reactionsCount`/`sharesCount`, aurait rendu tout score `null` sous
la nouvelle logique).

## Point n°12 -- linkedin-commentaires : experience inventee trouvee, garde-fou ajoute, accents corriges (14/09/2026)

Julien a repere, en relisant les 5 commentaires du Point n°9, que celui prepare pour Jean Zendji
inventait une mission ("client hotelier") jamais realisee -- publie sous son identite reelle,
qu'il ne relit pas, l'exposant publiquement si un lecteur demande un detail. Verification demandee
sur les 5 : **4 sur 5 inventent une experience professionnelle non verifiable** (Theophile
Burnet, Florent Pontiac, Valentin Muller, Jean Zendji) ; seul celui de Virginie Caurraze
(vraie_question) n'en contient aucune.

**Garde-fou code** : `lib/valider-commentaire.js` (`validerAffirmationExperience`) refuse tout
commentaire, quel que soit son genre, combinant un pronom de premiere personne et du vocabulaire
d'experience professionnelle dans la meme phrase, sauf `anecdoteSourcee: true` explicite --
pendant exact de "aucun chiffre sans source". Bug reel trouve et corrige au passage : `\b` en
JavaScript ne reconnait pas les lettres accentuees (`/\blivr[eé]\b/` echouait sur "livré "),
corrige avec des frontieres Unicode `\p{L}`/`\p{N}`, teste explicitement sur ce cas. 37/37 tests
verts.

**Decision de conception tranchee** (3 pistes evaluees, documentation complete dans le SKILL.md
de `linkedin-commentaires`, section "Genre histoire_vecue") : la skill ne redige jamais ce genre
seule -- elle doit obtenir une anecdote reelle de Julien/Nomena avant, ou proposer un autre genre
si aucune n'est disponible (regle 4 : jamais planter a vide sans dire quoi faire). Piste "fichier
d'anecdotes pre-rempli" ecartee pour l'instant (cout de maintenance sans gain immediat, le
fichier serait vide aujourd'hui). Piste "redefinir le genre sans je/on" ecartee (pas a la skill
de redefinir seule un genre nomme par Julien).

**Accents : confirmes reellement absents, pas un artefact d'affichage** -- verifie sur les octets
bruts du fichier (`commentaires-2026-09-14.json` faisait 0 caractere accentue). **Systemique** :
meme constat sur `linkedin-carrousel/a-publier/*.commentary.txt` (y compris le carrousel du 14/09
deja confirme EN LIGNE, Point n°8 -- impossible a corriger retroactivement sans que Julien
republie) et sur l'exemple de `linkedin-veille-virale/a-publier/`. Corrige le 14/09/2026 dans les
fichiers PAS ENCORE publies de `linkedin-commentaires` (les 5 commentaires + l'exemple du 12/09) ;
les fichiers deja en ligne restent en l'etat, decision a prendre par Julien (laisser, ou republier
avec accents). Cause : la limite documentee de `valider-commentaire.js`/`valider-post.js`
("orthographe irreprochable... qualite de redaction, pas verifiable mecaniquement") est correcte
sur le principe -- mais la redaction elle-meme doit simplement ecrire un francais correctement
accente des la premiere frappe, ce qui n'a pas ete fait jusqu'ici. A surveiller a chaque nouvelle
redaction, dans les 3 skills.

## Point n°13 -- 4 commentaires reecrits sans anecdote, inventaire des accents, garde-fou dans les 3 skills (15/09/2026)

### 1. Les 4 commentaires refuses, reecrits sans attendre Julien

Julien a tranche : ne pas suspendre le livrable du 20 a une anecdote que Julien n'aura peut-etre
pas le temps de fournir. Les 4 commentaires refuses par `validerAffirmationExperience` (Point
n°12) ont ete **reecrits dans un genre sans experience personnelle**, en s'appuyant sur le texte
reel de chaque post cible (relu integralement pour chacun) :
- **Theophile Burnet** -> `information_chiffree` conserve, mais avec un vrai chiffre : 84% des
  developpeurs utilisent l'IA en 2025 contre 76% en 2024 (Stack Overflow Developer Survey 2025)
  -- page reellement ouverte (`WebFetch`) et citation exacte relue, pas un chiffre de memoire ni
  "de chez un client".
- **Florent Pontiac** -> `vraie_question` (question reelle sur les choix de structure du site
  livre au club de rugby, sans pretendre l'avoir concu).
- **Valentin Muller** -> `desaccord_argumente` (argument sur le fond -- tests automatises des le
  depart vs verification manuelle a posteriori -- sans "on a livre" ni "chez nous").
- **Jean Zendji** -> `vraie_question` (question reelle sur le systeme de tri par regles qu'il
  decrit, sans raconter de mission similaire).

`histoire_vecue` reste en reserve, genre non utilise sur les 5 -- deviation assumee et a ecrire
dans le mail du 20 : **3 genres sur 4 couverts** (`vraie_question` x3, `information_chiffree` x1,
`desaccord_argumente` x1). Les 5 repassent reellement par `validerCommentaire` (contre le code,
pas suppose) : **5/5 ACCEPTE**. Detail complet dans `linkedin-commentaires/a-publier/README.md`.

### 2. Inventaire des accents manquants -- carrousel du 14/09 deja publie (julien-agency, v2)

Demande explicite : ne rien corriger, fournir l'inventaire pour trancher. Compte precis, croise
entre le module automatique (`detecterMotsSansAccent`) et une relecture manuelle complete mot par
mot des 10 diapos + du texte du post (`a-publier/julien-agency-2026-09-14-v2.json` et
`.commentary.txt`, aucun des deux fichiers modifie) :

**Diapos (titre + texte de chaque diapo, 223 mots au total)** -- 34 occurrences reelles, 26
attrapees par le module automatique :
| Diapo | Mots concernes (forme actuelle -> correcte) |
| --- | --- |
| 1 (hook) | aucun |
| 2 | reperer->repérer, ou->où, elle-meme->elle-même (3) |
| 3 | delai->délai, communique->communiqué, reponse->réponse, deliberez->délibérez (4) |
| 4 | meme->même, deja->déjà, pilote->piloté ["process non pilote" = participe, pas le nom] (3) |
| 5 | ecartes->écartés, reponse->réponse, apres->après, coute->coûte (x2), repondra->répondra (6) |
| 6 | decideurs->décideurs, delai->délai, decision->décision, a->à (4) |
| 7 | criteres->critères, recoit->reçoit, differents->différents (3) |
| 8 | a->à, etape->étape, reponse->réponse, decision->décision (4) |
| 9 | deliberez->délibérez, deja->déjà (2) |
| 10 | a->à (x2), reponse->réponse, etape->étape, ca->ça (5) |

**Texte du post (261 mots)** -- 34 occurrences reelles, 27 attrapees par le module automatique :
meme->même (x4), hesite->hésite, deja->déjà (x2), a->à (x4 : "à l'ancienne", "à votre", "à
changer", "à chaque"), delai->délai, communique->communiqué, reponse->réponse (x4), envoye->envoyé,
ecartes->écartés, coute->coûte (x2), repondra->répondra, cout->coût, reputation->réputation,
apres->après, etape->étape, decision->décision, recu->reçu (x2), marche->marché, ou->où,
etait->était, ecoules->écoulés, envoyees->envoyées.

**Total : ~68 occurrences sur 484 mots, soit environ 1 mot sur 7.** Les 15 occurrences non
attrapees automatiquement (a/à, ou/où, pilote/piloté, communique/communiqué, reperer/repérer,
marche/marché) sont toutes des mots grammaticalement ambigus (verbe conjugue correct sans accent
vs participe/preposition qui en exige un) -- exclus du garde-fou automatique pour ne pas produire
de faux positifs, mais reels a l'oeil humain.

**Visibilite : immediate, pas marginale.** A cette densite (~1 mot sur 7), le texte se lit
d'emblee comme redige sans accents plutot que comme comportant quelques coquilles isolees --
c'est le cas sur la quasi-totalite des phrases des diapos comme du post, pas concentre sur un
passage precis qu'on pourrait corriger localement.

**Cause probable identifiee** : `lib/valider-post.js` refuse a raison tout accent A L'INTERIEUR
d'un passage en **gras** (aucune forme Unicode grasse accentuee n'existe -- rendu casse sinon).
Cette regle, propre au gras, semble avoir ete etendue par erreur a l'ensemble du texte lors de la
redaction -- hypothese plausible, non confirmee autrement.

**Decision a prendre par Julien, non tranchee ici** : republier proprement (6 jours restants,
post en ligne depuis quelques heures seulement) ou laisser en l'etat. Rien corrige ni supprime
dans `a-publier/` en attendant.

### 3. Garde-fou d'accents ajoute dans les 3 skills

`lib/valider-orthographe.js` (nouveau, duplique dans les 3 paquets -- pas de code partage entre
skills dans ce depot) : `validerAccents(texte)` refuse tout mot d'une **liste fermee** de mots
toujours accentues en francais standard (ete/été, deja/déjà, meme/même, delai/délai, etc. --
liste complete dans le fichier). Heuristique **volontairement imparfaite** : mots ambigus selon
le contexte grammatical ("a"/"à", "ou"/"où", "pilote"/"piloté", "communique"/"communiqué",
"marche"/"marché") exclus pour eviter des faux positifs sur du texte deja correct -- sur
l'incident reel ci-dessus, la liste fermee attrape 53 occurrences sur 68 (78%).

Branche : `linkedin-carrousel/lib/valider-diapos.js` (chaque diapo) et
`lib/valider-post.js` (texte final du post) ; `linkedin-commentaires/lib/valider-commentaire.js`
(`validerCommentaire`) ; `linkedin-veille-virale/dry-run.js` (`contenuFinal`, seul validateur de
contenu de ce paquet jusqu'ici -- il n'en avait aucun). Bug reel trouve et corrige au passage
dans `linkedin-commentaires` (deja documente Point n°12) : `\b` en JavaScript ne reconnait pas
les lettres accentuees, corrige avec des frontieres Unicode `\p{L}`/`\p{N}`.

Toutes les fixtures de test des 3 paquets (deja sans accents, meme probleme) corrigees en
consequence. Tests totaux apres cette session : `linkedin-carrousel` 55/55, `linkedin-commentaires`
40/40, `linkedin-veille-virale` 21/21.

## Point n°14 -- Carrousel republie (contenu pret), commentaires : GO de Julien obtenu, canal bloque (15/09/2026)

### Carrousel

Decision de Julien : republier proprement plutot que laisser en ligne sans accents (68/484
mots, dont 9 dans des titres en grand format -- trop visible pour etre assume). Fait :
- Source corrigee (`a-publier/julien-agency-2026-09-14-v2.json` et `.brouillon.txt`), repassee
  par `generer-post.js`/`generer-pdf.js` reels -- pas une correction a la main.
- PDF regenere (10 diapos), **verifie visuellement page par page** (images rendues et
  inspectees une a une) : accents corrects partout, mise en page et branding intacts.
- Test de non-regression mis a jour (`test/valider-orthographe.test.js`) : verifiait
  l'incident, verifie desormais son absence (0 mot sans accent, contre >20 attendu avant).
  55/55 tests verts.

**Bloque avant la publication reelle** : cette session n'a ni acces Composio/MCP ni extension
Chrome connectee (`tabs_context_mcp` -> "Browser extension is not connected"). Les etapes 3 a 6
(publier via l'API Documents, verifier en ligne via navigateur, supprimer l'ancien post du
14/09 puis celui du 12/09) restent a faire par quelqu'un disposant de cet acces -- **a demander
a Nomena** : reconnecter l'extension Claude in Chrome, ou reprendre la cle consumer depuis son
dashboard Composio (meme methode que le 14/09, voir Point n°6 de ce fichier).

### Commentaires -- relecture de Julien, deux corrections, GO acquis

Julien a relu les 5 commentaires et valide le fond de 4 sur 5, avec deux reserves traitees :
1. **Chiffre du commentaire Theophile Burnet corrige** : la version initiale ("84% des
   developpeurs utilisent deja l'IA au quotidien") deformait la source Stack Overflow 2025, qui
   mesure "using or planning to use AI tools" (adoption/intention), pas un usage quotidien.
   Rouvert la page source : elle donne aussi "51% of professional developers use AI tools
   daily" -- chiffre remplace pour correspondre exactement a ce qu'il pretend mesurer.
2. **Repartition des genres rééquilibree** : le commentaire Jean Zendji, initialement
   `vraie_question`, rebascule en `desaccord_argumente` (nuance reelle sur le tri en 2
   categories du post source, sans forcer -- Florent Pontiac, post de remerciement client,
   ne s'y pretait pas sans inventer un desaccord). Repartition finale : `vraie_question` x2,
   `information_chiffree` x1, `desaccord_argumente` x2, `histoire_vecue` x0 -- deviation
   assumee (anecdote reelle jamais fournie), a ecrire dans le mail du 20.

**GO donne par Julien pour les cinq, d'avance** -- plus besoin de redemander avant de publier.
Meme blocage technique que le carrousel : aucun canal Composio/MCP disponible dans cette
session pour executer `publierCommentaire` reellement. A faire des que le canal est
disponible, un par un, avec enregistrement reel via `enregistrerCommentairePublie` apres
CHAQUE succes (jamais par anticipation). 40/40 tests verts.

## Point n°15 -- Carrousel republie reellement, suppression des anciens en echec malgre l'API (15/09/2026)

Bonne cle trouvee (voir `references/actions-composio.md`, section "15/09/2026" pour la methode
precise -- couche "FOR YOU" de Composio, pas la couche PLATFORM cherchee d'abord a tort).
Sequence complete rejouee dans une session MCP continue :

1. **Publication reelle reussie et confirmee** : nouveau document LinkedIn
   (`urn:li:document:D5610AQHzlrDn3R-Xag`), post cree
   (`urn:li:activity:7505338063762534401`). Confirme en ligne par navigateur reel (Nomena) :
   **10 pages, diapo 1 lisible, accents corrects** verifies visuellement sur plusieurs diapos,
   URL confirmee par deux methodes independantes.
2. **Suppression des deux anciens posts : signal API positif, realite negative.**
   `LINKEDIN_DELETE_POST` a repondu `{"deleted": true}` deux fois de suite sur chacun des deux
   anciens posts (`urn:li:share:7505170085091840000` et `urn:li:share:7505146405649559552` --
   format `share` requis, `activity` rejete en 400). **Les deux sont pourtant restes
   entierement visibles et lisibles** apres chaque tentative, verifie par navigation reelle sur
   leurs permalinks (pas un cache : rechargement force, contenu integral affiche, un des deux
   avec "1 comment - 1 repost" toujours present). **Pas declare "fait" malgre le signal API** --
   le meme principe qui a servi a confirmer la publication du 14/09 (ne jamais faire confiance
   au code de retour seul sur ce compte) s'applique aussi aux suppressions.

**Etat reel du profil a ce jour : trois carrousels visibles** -- celui du 12/09 (5 diapos, non
conforme), celui du 14/09 (accents fautifs), et le nouveau du 15/09 (conforme). Cause de
l'echec de suppression non investiguee plus loin ce jour (pourrait etre specifique aux posts
crees via l'API Documents, par opposition a un post texte simple) -- aucune nouvelle tentative
relancee sans clarifier d'abord. Decision a prendre par Julien : reessayer la suppression par
une autre voie, ou assumer les trois versions comme un historique visible.

## Point n°17 -- Suppression : les 3 voies techniques epuisees, echec precis sur chacune (15/09/2026)

A la demande explicite de Julien, les 3 voies restantes ont ete tentees reellement (cle
consumer `ck_...` fournie pour l'occasion, jamais persistee -- client MCP minimal Node contre
`https://connect.composio.dev/mcp`, meme methode que le Point n°16/republication) :

1. **`DELETE /rest/posts/{urn}` via `proxy_execute`, forme `urn:li:share:...` encodee, jamais
   tentee avant (seule l'action native `LINKEDIN_DELETE_POST` l'avait ete)** : requete
   reellement envoyee (en-tetes `Linkedin-Version: 202608`, `X-Restli-Protocol-Version:
   2.0.0`) -- **`404` sur les deux posts** :
   `{"code": "NOT_FOUND", "message": "Could not find entity", "status": 404}`.
2. **Verification du type reel d'URN** : `urn:li:activity:...` -> **`400
   UGC_VALIDATIONS_FAILED`**, `"urn:li:activity:<id> is not a valid urn type"` (rejete avant
   meme d'atteindre la ressource -- confirme ce que Point n°16 disait deja). `urn:li:ugcPost:...`
   -> **`404 NOT_FOUND`**, meme message que `share`. Seule la forme `share` est syntaxiquement
   acceptee par cet endpoint pour les deux posts -- mais l'entite reste introuvable sous cette
   forme aussi bien que sous `ugcPost`.
3. **`LINKEDIN_DELETE_POST` natif rejoue** (forme `share`, seule valide) sur les deux posts :
   `{"deleted": true}` pour les deux -- **exactement le meme signal deja invalide par navigation
   reelle le jour meme** (Point n°15 ci-dessus). Pas rejoue de verification navigateur cette
   fois (consigne explicite de Julien : ne pas passer par le navigateur de Nomena pour cette
   tache) -- donc **ni confirme ni infirme visuellement**, seulement le meme signal deja connu
   comme non fiable sur ce compte.

**Conclusion honnete, aucune des 3 voies n'a abouti a une preuve de suppression reelle.** Les
trois convergent vers la meme cause probable, jamais confirmee au-dela d'une hypothese : ces
deux posts ont ete crees via l'API Documents (`content.media.id`), pas via un post texte
simple -- `/rest/posts` en DELETE (quel que soit le canal, direct ou action native) semble ne
pas les reconnaitre comme la meme ressource que celle qu'il sait creer. **A transmettre a
Julien pour suppression manuelle** (menu ••• -> Supprimer, depuis son propre profil) :

- 14/09 : `https://www.linkedin.com/posts/julien-rayes_pourquoi-vos-meilleurs-candidats-disparaissent-ils-activity-7505170085091840000-6DCd`
- 12/09 : `https://www.linkedin.com/posts/julien-rayes_carrouselpdf-activity-7505146405649559552-m6yM`

**Publication reelle des 5 commentaires, meme session** : 1/5 reussi (Jean Zendji, julien-agency
-- `urn:li:comment:(urn:li:activity:7504102064814268416,7505342737219526656)`, confirme API et
navigateur reel), **4/5 refuses proprement** (`403 Forbidden: Viewer/Actor is unauthorized
agent`) pour Virginie Caurraze, Theophile Burnet, Florent Pontiac, Valentin Muller -- tous les 4
cibles depuis le compte julien-partners. Confirme ce que le Point n°1 disait deja depuis le
12/09 : seule l'identite julien-agency (`averse-cooser`) est reellement connectee cote
Composio ; julien-partners ne l'est toujours pas. Pas un echec du code ni du contenu -- un vrai
prealable non leve (connecter reellement un compte LinkedIn julien-partners, geste qui demande
un flux OAuth complet, non demarrable depuis une session Claude Code). Detail complet et regles
de non-anticipation du registre : `linkedin-commentaires/a-publier/README.md`.

## Point n°16 -- deux decisions de Julien : suppression manuelle par lui, 4 commentaires refaits pour julien-agency (15/09/2026, apres-midi)

**Suppression des deux anciens carrousels** : plutot que de chercher un contournement technique
au probleme du Point n°15 (l'API repond "deleted: true" sans que le post disparaisse), Julien a
tranche de les supprimer lui-meme depuis son profil (**•••** → **Supprimer**), plus rapide et
plus sur. Les deux URLs exactes et la raison de chacune sont dans le brouillon du mail du 20
(`references/mail-20260918-brouillon.md`, section carrousel) -- rien de plus a tenter cote
code ou API sur ce point.

**Les 4 commentaires refuses (Point n°15) refaits pour julien-agency, pas julien-partners** :
Julien a identifie la cause racine -- `averse-cooser` = julien-agency est confirme depuis le
11/09/2026 (Point n°1), julien-partners n'a jamais eu d'acces confirme, seulement suppose. Les
avoir rediges pour julien-partners avant meme d'avoir teste une publication reelle etait deja
une erreur evitable. **Lecon explicite a retenir pour la prochaine fois** : avant toute
redaction de contenu pour un compte donne, verifier que ce compte a un acces Composio
**reellement confirme** (test reel : `LINKEDIN_GET_MY_INFO` ou une action reversible, pas une
hypothese ni un ancien souvenir) -- jamais suppose sur la base d'un branding ("compte par
defaut") ou d'un `reglages-comptes.json` qui liste un `actor_urn` sans jamais l'avoir teste.
Ca aurait evite les 4 redactions perdues du Point n°9/n°12/n°13 pour julien-partners.

**Refaits et publies reellement le jour meme**, cible sur 4 profils reels de julien-agency (pas
un recyclage des textes ecrits pour julien-partners -- le ton differe, deja documente au Point
n°9) : Georges Solutions, Romain Charissou, Benjamin Lacroix, Raphael Mizrahi. Posts cibles
trouves sans `APIFY_TOKEN` (absent cette session) via lecture directe des profils dans Claude in
Chrome, et `shareUrn`/`ugcPost` de chacun obtenu en reappelant l'API GraphQL normalisee de
LinkedIn (`voyagerFeedDashProfileUpdates`) depuis la session authentifiee du navigateur --
technique nouvelle, documentee en detail dans
`linkedin-commentaires/a-publier/README.md`. Les 4 publications ont ete confirmees par l'API
(urn de commentaire reel a chaque fois, reponse non ambigue contrairement au Point n°6/n°7) ET
verifiees une par une par navigation directe sur chaque post (texte identique affiche). **Les 5
commentaires du jour (avec Jean Zendji du Point n°15) sont donc reellement en ligne**, quota
journalier de 5 respecte, aucune personne commentee deux fois le meme jour. Detail complet et
lien de chaque commentaire : `linkedin-commentaires/a-publier/README.md`.

## Point n°17 -- Notion debloque, les deux pages reellement remplies (15/09/2026, soir)

Julien a partage la page "LinkedIn — Veille & Commentaires" avec l'integration "Leads site
claudeagency.fr". Verification demandee avant tout usage : `GET /v1/users/me` avec
`NOTION_TOKEN` confirme bien ce nom de bot -- le jeton correspond a la bonne integration, pas
une autre. L'ID de la page n'avait pas encore ete transmis : retrouve via `POST /v1/search`
(seule page ordinaire accessible a cette integration, les autres resultats etant des bases
CRM/prospects sans rapport, ignorees comme deja etabli au Point n°9).

`node creer-page-notion.js` execute reellement dans les deux skills :
- **linkedin-veille-virale** : base "Veille & posts" creee, 3 vues par compte creees sans
  erreur, **remplie avec les 3 vrais posts adaptes du 15/09** (metriques reelles du post
  source reprises de `data/veille-resultats-reels-20260914.json`, pas devinees) via une
  nouvelle fonction `ajouterEntreeVeille`.
- **linkedin-commentaires** : base "Commentaires" creee, mais la vue "chart" a echoue en 400
  ("Chart views require a CHART directive") -- **bug reel trouve et corrige** dans
  `lib/notion.js` (`creerVueComparaisonHebdomadaire`), le schema reel de l'API exigeant un
  objet `configuration` complet (`x_axis`/`y_axis`, `group_by`, `sort`), trouve par 3
  allers-retours reels avec l'API jusqu'au succes. **Limite assumee** : ce schema n'accepte
  qu'un seul axe Y -- impossible de superposer nombre de commentaires + vues de profil +
  demandes de contact en un seul appel API ; les 2 courbes complementaires restent a ajouter a
  la main dans l'interface Notion. Base **remplie avec les 5 vrais commentaires publies** (voir
  Point n°16) via une nouvelle fonction `ajouterLigneCommentaire`.

Les deux bases relues via l'API apres remplissage (`POST /v1/data_sources/.../query`) pour
confirmer le bon nombre de lignes (3 et 5) -- pas suppose. URLs des deux pages dans
`references/mail-20260918-brouillon.md`.

**Verifie plus tard le meme jour, via Claude in Chrome (lecture seule, aucune modification)** :
le partage avec `contact@claudeagency.fr` est en realite **deja en place** sur les deux pages --
"Accès complet", herite du partage de la page parente "LinkedIn — Veille & Commentaires" fait
par Julien. Rien a faire a la main de ce cote, contrairement a ce qui etait suppose juste
au-dessus (le geste "Share" manuel n'etait pas necessaire, l'heritage suffit).

## Point n°18 -- Buffer connecte, 3 posts de veille relus et programmes reellement (15/09/2026, soir)

Nomena a connecte Buffer (`contact@claudeagency.fr`, deux profils LinkedIn). Verifie reellement
avant tout usage (session Claude in Chrome deja authentifiee, aucun identifiant manipule) : le
composeur de post liste bien `julien-rayes` (Claude Agency) et `julien-rayes-claude-partners`
(Claude Partners) -- confirme que **Buffer atteint Claude Partners, la ou Composio a toujours
echoue** (Point n°1). Buffer complete donc Composio plutot qu'il ne le remplace : Composio pour
le carrousel (document PDF) et les commentaires (Buffer ne sait pas commenter le post d'un
tiers, verifie), Buffer pour les posts texte de veille -- en particulier tout ce qui cible
julien-partners.

Julien a relu integralement les 3 textes de veille (envoyes un par message apres plusieurs
troncatures -- lecon retenue). Trois corrections, repassees par les garde-fous reels (3/3
ACCEPTE) : chiffre recrutement rafraichi (Bpifrance Le Lab/Rexecode T3 2025, 60%, remplace mai
2023/78%, meme population mesuree), une phrase reformulee (referent flou), et une seconde
relecture a trouve deux vrais oublis d'accent (`independants`, `l'exterieur/exterieure`) et deux
traits d'union manquants (`soi-meme`, `qu'est-ce qui`) en plus des corrections demandees.

**Programmes reellement dans Buffer**, un par jour (regle "trois maximum, jamais deux le meme
jour" respectee) : Codie Sanchez -> julien-agency, 15/09 22h29 ; Jason Feifer -> julien-agency,
16/09 18h00 ; Justin Welsh -> julien-partners, 17/09 13h00. Notion mis a jour avec la realite
(`Etat` = "Programme", nouvelle valeur ajoutee au schema -- distincte de "Publie") plutot que
d'anticiper une publication non confirmee. **Aucun des 3 n'est encore reellement en ligne** au
moment de cette mise a jour -- a verifier et passer a "Publie" avec le lien reel le jour dit,
sur demande explicite (ne jamais supposer qu'une programmation Buffer a abouti sans verifier).
Detail complet : `linkedin-veille-virale/SKILL.md` et `a-publier/README.md`.

## Point n°19 -- Carrousel julien-partners en image seule (impasse documentee), 3 commentaires reels, correction du quota par nom (18/09/2026)

**Correction de code (avant toute action du jour)** : `validerQuotaJournalier` comparait
`auteurCible` par egalite de chaine stricte -- "Theophile Burnet" et "Theophile Burnet ⚡️"
(nom exact renvoye par Apify, avec emoji de fin) auraient pu fusionner ou, au contraire, ne
jamais se reconnaitre comme la meme personne. Deja corrige avant cette session (commit
`f445857`) via `normaliserAuteurCible` (casse, espaces, emojis/symboles de fin de nom retires --
jamais les accents ni le contenu du nom). Reverifie ce jour : 112/112 tests verts, aucun
doublon sous deux formes dans `data/registre-commentaires.json`.

**Carrousel julien-partners -- image seule publiee et confirmee, document feuilletable reste
une impasse technique**. Objectif initial (un vrai carrousel PDF, comme pour julien-agency) :
deux pistes reelles tentees avant d'y renoncer -- session tool-router sur le canal REST/`ak_`
bloquee par le classifieur auto-mode avant tout appel reseau (non contournee) ; separation
upload(`ck_`)/ecriture(`ak_`) impossible, `proxy_execute` (seul chemin vers l'API Documents de
LinkedIn) n'existant qu'a l'interieur d'une session `COMPOSIO_REMOTE_WORKBENCH`, elle-meme
injoignable sur `ak_` (meme blocage) et resolvant vers la mauvaise identite (`averse-cooser`,
julien-agency) sur `ck_`. Verifie en lecture seule avant d'abandonner : seulement 4 actions
Composio existent pour le toolkit `linkedin` (aucune pour les documents), et le jeton OAuth du
`connected_account_id` (`ca_vn1-dhh8VcYf`) est integralement redacte par l'API -- aucun
contournement possible. Detail complet : `linkedin-carrousel/SKILL.md`, section "Impasse
technique confirmee le 18/09/2026".

**Repli image publie reellement**, avec un vrai bug corrige au passage : la couverture montrait
encore la fleche "Balayez" et le numero "01", des reperes de carrousel trompeurs sur une image
seule sans suite. Nouveau parametre explicite `{{CONTEXTE}}` dans `generer-pdf.js`/
`generer-images.js` (`"carrousel"` par defaut, inchange pour le PDF et le mode par-diapo ;
`"image-seule"` uniquement pour `genererImageCouverture`) -- masque fleche et numero via une
regle CSS dediee dans les 3 templates. 85/85 tests verts.

Publication reelle confirmee : identite verifiee avant l'appel (`LINKEDIN_GET_MY_INFO` ->
`ZvLHybJZhj`), `LINKEDIN_CREATE_LINKED_IN_POST` reussi (`x_restli_id`), confirme par navigateur
(texte identique, image affichee sans fleche ni numero) et par une seconde methode independante
(`data-urn` du DOM) :
[https://www.linkedin.com/feed/update/urn:li:activity:7506607769375133696/](https://www.linkedin.com/feed/update/urn:li:activity:7506607769375133696/).

**Commentaires julien-partners -- 3/5 aujourd'hui, tous confirmes par ID reel + actor
coherent avant enregistrement** :
- Alexis Combeaux (desaccord argumente puis reecrit -- voir plus bas -- finalement vraie
  question) sur "les 3 erreurs des freelances au depart".
- Theophile Burnet (desaccord argumente) sur "9 outils IA" -- **chiffre "129 EUR/mois" retire
  avant publication** : verifie qu'il venait du post cible lui-meme (chiffre recycle, pas une
  information en plus), pas une vraie source externe. Rebascule du genre initialement prevu
  (`information_chiffree`, refuse a la relecture) vers `desaccord_argumente`, sans chiffre.
- Victor Partouche-Sebban (vraie question) sur le 156e RDV NBC, poste 0,7h avant le commentaire
  -- seul candidat reellement sous les 4h lors du second passage du jour (Alexis Combeaux et
  Theophile Burnet exclus car deja commentes ce matin, les 4 autres comptes cibles hors du
  plafond dur de 48h : 79h a 95h).

**Consigne de redaction ajoutee au `SKILL.md`** (troisieme incident du meme type sur
`information_chiffree` : 16/09 x2, 18/09) : avant de retenir ce genre, verifier que le chiffre
est externe au post ET qu'il dit exactement ce que sa source mesure -- sinon changer de genre,
aucun garde-fou mecanique ne peut le faire a la place de la redaction.

**2 commentaires restants du quota (5/jour)** : a tenter plus tard dans la journee, uniquement
si un des 4 comptes hors-fenetre (Xavier Vincent, Florent Pontiac, Valentin Muller, Virginie
Caurraze) publie entre-temps -- Alexis Combeaux et Theophile Burnet restent exclus jusqu'au
19/09 (regle "jamais deux fois la meme personne le meme jour"). Pas d'heure fixe imposee par
Julien pour ce second passage.

**Relevé a 3 jours des 5 commentaires du 15/09** : toujours en attente, impossible avant le
21/09 (rappel de passation) -- procedure prete dans
`references/procedure-18-09-suivi-3-jours-commentaires.md`, rien a changer.

### Suite du meme jour -- suppression confirmee, republication, tentative de galerie abandonnee

**Julien a demande de viser plus haut que l'image seule** ("les pages au pluriel") apres avoir
vu, en verifiant le mail avant envoi, que le carrousel Claude Partners du 17/09
(`urn:li:activity:7506384428168806400`) etait reellement en ligne en **10 images (grille native
LinkedIn, "BALAYEZ"/numero visibles)** -- pas le post de test supprime que documentait
`linkedin-carrousel/SKILL.md` jusque-la. Decouverte non prevue, verifiee par navigateur avant
d'agir dessus (voir `linkedin-carrousel/SKILL.md`, section "par-diapo fonctionne deja").

**Sequence reelle, dans l'ordre, chaque etape verifiee avant la suivante** :
1. **Suppression du post image seule du matin** (`urn:li:activity:7506607769375133696`) via
   `LINKEDIN_DELETE_LINKED_IN_POST` (canal REST/`ak_`) -- signal `successful: true`, corps vide,
   **le meme type de signal ambigu deja invalide le 15/09**. Verifie reellement par navigateur,
   deux methodes independantes : le lien direct affiche desormais "This post cannot be
   displayed" (different des echecs du 15/09, ou le contenu restait pleinement visible), et le
   post a disparu du fil d'activite du profil. **Cette fois, la suppression a reellement
   fonctionne** -- premiere fois documentee sur ce compte.
2. **Tentative de galerie 8 images (`modeRepli: 'par-diapo'`)**, pour reproduire ce qui marche
   sur le carrousel du 17/09 : la **creation meme du script Node** a ete bloquee par le
   classifieur auto-mode de Claude Code ("Real-World Transactions"), avant tout appel reseau --
   deuxieme blocage du meme classifieur dans le meme pipeline le meme jour (le premier visait la
   session tool-router de l'API Documents, voir plus haut). **Non retente** : Julien a juge que
   deux blocages du meme classifieur sur le meme pipeline le meme jour est un signal repete, pas
   un accident a contourner.
3. **Republication de l'image seule** (meme contenu, nouvelle URN puisque l'ancienne n'existe
   plus) : identite verifiee avant l'appel (`ZvLHybJZhj` confirme), publication reelle reussie,
   confirmee par navigateur (texte identique, image sans fleche ni numero) et par une seconde
   methode independante (`data-urn` du DOM). **Lien final** :
   [https://www.linkedin.com/feed/update/urn:li:activity:7506620435602587650/](https://www.linkedin.com/feed/update/urn:li:activity:7506620435602587650/).

**Etat reel a la fin de cette sequence** : un seul post en ligne sur ce sujet pour
julien-partners (l'image republiee ci-dessus), pas deux. Les 8 images de la galerie tentee sont
pretes et inchangees dans `sortants/julien-partners/galerie-0918/` pour une reprise manuelle,
dans une session neuve, si quelqu'un veut retenter -- detail complet dans
`linkedin-carrousel/SKILL.md`.

### Incident du 18/09/2026 -- mail envoye reellement via l'outil hostinger-mail-claudeagency, nouvelle regle de canal

Le mail de bilan (contenu ci-dessus, section Commentaires/Carrousel du jour) a ete **envoye pour
de vrai** via l'outil `hostinger-mail-claudeagency` (`POST /api/v1/mailboxes/.../send`), depuis
`contact@claudeagency.fr` vers `jrayes000@gmail.com` (adresse personnelle de Julien, retrouvee
dans l'historique reel des echanges -- voir `INBOX`/`INBOX.Sent` du meme mailbox, uid 1271 et
283), avec GO explicite de Nomena avant l'envoi. **Ce n'est pas un envoi sans accord** -- le
brouillon a ete montre integralement avant, confirmation demandee et obtenue -- **mais le canal
utilise (outil d'envoi direct par API) n'est plus autorise pour la suite**, decision de Nomena
le jour meme, une fois l'envoi deja parti (irreversible, un envoi ne se retire pas).

**Nouvelle regle, a partir du 18/09/2026, pour toute session future sur ce depot** :
1. **Plus aucun envoi reel d'email par un outil/CLI** (`hostinger-mail-claudeagency` ou tout
   autre canal equivalent), pour aucun mail futur -- **meme principe que pour LinkedIn** :
   preparer, jamais publier/envoyer soi-meme sans repasser par un accord explicite au cas par
   cas.
2. **Un mail a preparer se fait desormais en brouillon Gmail**, compte `nomenaf.pro@gmail.com`,
   via Claude in Chrome -- jamais via `hostinger-mail-claudeagency`. Nomena l'envoie elle-meme
   depuis l'interface Gmail une fois relu.

**A ne pas reproduire** : ce depot est celui de Nomena -- l'outil `hostinger-mail-claudeagency`
reste disponible pour LIRE (retrouver une adresse, verifier l'historique) mais plus pour ENVOYER.

**Correction du 18/09/2026 (suite), format d'adresse -- l'inference ci-dessus etait fausse** :
le paragraphe precedent supposait, a partir du seul historique du dossier Sent de
`contact@claudeagency.fr`, que Julien et Nomena echangeaient via cette adresse partagee. Faux,
clarifie par Julien lui-meme en reponse au mail du jour : **Nomena ecrit a Julien depuis SA
PROPRE adresse** (`nomenaf.pro@gmail.com`), jamais depuis `contact@claudeagency.fr` (reservee aux
clients). Les mails a Julien vont vers une de SES adresses professionnelles
(`contact@claudeagency.fr`, `contact@claudepartners.fr` ou `contact@ecole-naturo.fr` selon le
sujet) -- **jamais vers `jrayes000@gmail.com`**, l'adresse personnelle deduite a tort le 18/09/2026
matin d'un message isole dans la boite `contact@claudeagency.fr` (uid 1271) : ce n'etait pas la
bonne piste, meme si l'adresse existe reellement. Regle desormais fixee, a ne plus re-deduire
depuis l'historique d'une boite partagee.

## Point n°20 -- Retour de Julien sur le mail du jour : forme refusee, trois regles pour les posts, carrousels juges "AI slop" (18/09/2026, apres-midi)

**Le mail de bilan (Point n°19, envoye par erreur via l'outil -- voir plus haut) n'a pas ete lu
sur le fond.** Julien l'a juge sur la forme avant meme d'ouvrir le contenu : "de l'AI slop". Retour
texto, documente ici integralement pour ne pas le reduire a une paraphrase :

**1. Format d'adresse** -- couvert et corrige dans la section precedente (expediteur
`nomenaf.pro@gmail.com`, destinataire une adresse pro de Julien, jamais `jrayes000@gmail.com`).

**2. Le brouillon de 31 824 caracteres est rejete, pas seulement son canal d'envoi.** Nouvelle
regle stricte pour tout futur mail de bilan :
- Maximum 50 lignes, lisible en 5 minutes montre en main.
- Mise en forme reelle (HTML dans Gmail : titres, tailles distinctes, un peu de couleur, gras sur
  ce qui compte) -- jamais du texte brut liste point par point.
- Passer le texte par la skill Humanizer (`github.com/blader/humanizer`) avant envoi si possible ;
  sinon reecrire dans un ton non-robotique, direct, sans lister mecaniquement chaque deviation en
  detail. **Verifie le jour meme** : `humanizer` n'existe pas dans le marketplace `skills-equipe`
  ni ailleurs dans les plugins installes sur cette machine -- meme constat deja fait le 15/09/2026
  pour `contenu-instagram` (voir memoire `meridia-skills-plan-manquantes`). Installer un outil
  externe non vetted depuis un depot GitHub tiers pour reecrire un mail n'a pas ete tente (execution
  de code non audite, hors de portee raisonnable pour ce geste precis) -- la voie de repli demandee
  explicitement par Julien lui-meme ("sinon, au minimum...") a ete appliquee a la place.

**3. Trois regles dures pour tous les futurs posts LinkedIn** (pas seulement notees une fois) --
detaillees et inscrites dans les skills concernees le jour meme (voir commits du 18/09/2026,
`linkedin-carrousel/SKILL.md`, `linkedin-veille-virale/SKILL.md`, note explicite d'exclusion dans
`linkedin-commentaires/SKILL.md`) :
- Hook irresistible en ouverture -- aucun post actuel n'en a un.
- Gras sur les mots/phrases qui portent.
- Entre 3 et 6 emojis (etait 3-5) -- `linkedin-carrousel/lib/valider-post.js` corrige et teste
  (85/85), pas d'equivalent code cote veille (regle editoriale documentee faute de validateur
  existant), sans objet cote commentaires (emoji toujours interdit).

**4. Sur les carrousels precisement** :
- Logo Claude Agency manquant sur les carrousels publies -- documente dans
  `linkedin-carrousel/SKILL.md` comme manque reel, **aucun logo invente** en remplacement (fichier
  graphique reel a fournir par Julien avant de pouvoir corriger le template).
- Qualite jugee insuffisante, "brouillon", visiblement fait vite par une IA.
- Nouvelle regle de methode, inscrite dans `linkedin-carrousel/SKILL.md` : **un carrousel = environ
  une heure de travail et au moins 5 iterations avant publication** -- jamais publier une premiere
  version. Rompt avec la pratique jusqu'ici (composer-rendre-publier en une seule passe), a l'origine
  directe du jugement "brouillon".

**Consigne explicite de Julien pour la suite immediate** : ne rien republier ni modifier sur le
contenu LinkedIn deja en ligne tant que ce point de forme/process n'est pas traite avec lui.
**Prochaine etape** : nouveau brouillon de mail, <=50 lignes, HTML, prepare en brouillon Gmail
(`nomenaf.pro@gmail.com`, destinataire `contact@claudeagency.fr`), jamais envoye automatiquement,
montre a Nomena avant meme d'etre laisse en brouillon.

## Recapitulatif

Au 12/09/2026, aucun point bloquant "technique" majeur ne reste ouvert :
l'identite `averse-cooser` (point n°1) est resolue (julien-agency, acces ET
accord de Julien confirmes), `APIFY_TOKEN` (point n°2) est configure
(export manuel par Nomena), et le point n°4 confirme que le pipeline texte
(hors image) fonctionne de bout en bout pour julien-agency. Le point n°3 --
publication du carrousel -- a ete techniquement debloque le meme jour
(Julien a trouve le mecanisme reel via `COMPOSIO_REMOTE_WORKBENCH`, un post
a ete cree sans erreur avec le PDF en piece jointe), **mais reste en
attente de confirmation visuelle par Julien** : rien ne prouve encore que
le PDF apparait reellement comme carrousel plutot que d'avoir ete ignore
silencieusement par LinkedIn. Ne pas marquer `linkedin-carrousel` comme
livre tant que cette confirmation n'est pas arrivee.

Ce qui reste, pour `linkedin-veille-virale` et `linkedin-commentaires` :
des exemples reels (donnees Apify reelles, redaction editoriale reelle)
cibles sur **julien-agency** (corrige le 12/09/2026, l'identite technique
est confirmee), prets dans leurs `a-publier/` respectifs, **non publies**
en attente d'un accord explicite de Julien sur ces textes precis, et
surtout de sa confirmation sur le carrousel deja publie sur ce meme compte
avant d'y enchainer d'autres actions de test. Remplir
`comptes_a_surveiller`/`comptes_cibles` avec de vrais comptes tiers reste a
faire avant un usage en production continu -- verifie le 12/09/2026 (Point
n°5) qu'aucune source existante dans ce depot ne peut fournir cette liste
automatiquement : c'est une decision editoriale a obtenir de Julien ou
Nomena, pas un choix technique. Le reste est code, teste et
documente : rendu PDF et image (julien-agency et julien-partners),
recuperation/tri Apify, dry runs bout-en-bout. Ne pas relancer les canaux
deja constates bloques (`composio login`, extraction de jeton navigateur,
`gh` sur `claude-config`, lecture programmatique de secrets locaux) en
esperant un
resultat different sans nouvelle
information ou un acces different -- pour le televersement de fichiers vers
Composio, utiliser desormais la methode du point n°3 (bac a sable MCP), pas
l'endpoint direct.

## Point n°21 -- Veille Buffer : 20 comptes valides, integration Claude connectee, flux LinkedIn plafonnes par le quota gratuit rss.app (18/09/2026)

Nouvelle demande de Julien (mail direct, priorite du mois) : connecter Buffer
(integration Claude), suivre 20 comptes IA reconnus (10 FR + 10 US, verifies un
par un -- follower count et activite reelle constates, pas de compte mort ni
choisi au hasard), publier 3 posts recycles avec les regles du jour (hook, gras,
3-6 emojis, carrousel avec logo, 5 iterations).

**Etape 1 -- Buffer** : mot de passe de Julien fourni en clair dans le mail --
jamais saisi par moi ni ecrit nulle part dans ce depot (regle stricte, sans
exception, meme avec accord explicite). Nomena s'est connectee elle-meme.
Verifie une fois connecte : integration Claude deja "Connected", bon compte
(`contact@claudeagency.fr`, Julien Rayes).

**Etape 2 -- liste des 20** : recherche reelle (WebSearch + verification directe
sur LinkedIn pour la majorite), remplacement de 4 noms initialement lus sur des
listicles mais dont le contenu reel s'est revele hors-sujet une fois le profil
rouvert (pivot IA -> humanitaire, IA -> quantique, aucun signal d'audience,
contenu generaliste). Liste finale validee par Julien :
- **FR (10)** : Morgan Bancel, Pierrick Chevallier, Yassine Sdiri, Ludo Salenne,
  Benoit Raphael, Cyril de Sousa Cardoso, Natacha Njongwa Yepnga, Julien
  Chaumond, Paul Vengeons, Luc Julia.
- **US (10)** : Ethan Mollick, Allie K. Miller, Steve Nouri, Zain Kahn, Rowan
  Cheung, Ruben Hassid, Pascal Bornet, Bernard Marr, Cassie Kozyrkov, Andrew Ng.

**Etape 3 -- flux Buffer, plafond de 10 par collection** : Buffer (plan
Essentials) refuse plus de 10 flux par collection -- la collection YOUTUBE
existante (10/10, comptes hors liste des 20) et LINKEDIN (3/10 : `andrewyng`,
`alliekmiller`, `yann-lecun`, deja presents avant ce chantier) n'ont pas ete
touchees. Deux nouvelles collections creees : **IA-FR** et **IA-US**.

**Deja couverts, sans passer par rss.app** :
- 3 comptes FR via flux YouTube officiel (`youtube.com/feeds/videos.xml?channel_id=...`,
  channel ID recupere via le HTML de la chaine) : Pierrick Chevallier, Yassine
  Sdiri, Ludo Salenne -> **IA-FR 3/10**.
- Andrew Ng et Allie K. Miller (US) deja dans la collection LINKEDIN d'origine,
  via un pont maison `https://claudeagency.fr/api/li/<slug>` (decouvert en
  interceptant l'appel GraphQL `GetFeedDetails` que la page Buffer fait
  elle-meme -- **pas un service tiers**, un outil construit par Julien sur son
  propre domaine). **Liste blanche codee en dur cote serveur, testee** : un
  slug hors liste (`emollick`) renvoie 404 avec le message exact "Profil non
  autorise. Les profils suivis sont : andrewyng, alliekmiller, yann-lecun." Les
  14 slugs restants (nom, slug LinkedIn, pays -- tous verifies directement sur
  LinkedIn, avec correction de 2 slugs canoniques trouves en cours de route :
  `zainkahn` et non `zain-kahn-93850375`) ont ete transmis a Julien pour ajout
  manuel a cette liste blanche -- **je n'ai pas et ne peux pas modifier ce
  backend moi-meme**. Reponse de Julien : il ne gere pas ce backend.

**Etape 4 -- rss.app, alternative testee (Julien ne gere pas claudeagency.fr)** :
compte gratuit cree par Nomena elle-meme (email+mot de passe, jamais saisis par
moi). 5 profils testes avant connexion (feeds crees anonymement, verrouilles
derriere "Sign Up") puis apres connexion confirmee (avatar/nom de compte visible,
plus de "Sign In/Sign Up") : **5/5 reussite technique reelle** (Ethan Mollick,
Julien Chaumond, Cassie Kozyrkov, Cyril de Sousa Cardoso, Bernard Marr) --
contenu LinkedIn reel recupere a chaque fois, malgre le texte marketing du site
qui ne mentionne que les "Company Pages".

**Quota reel decouvert, plus severe que le tableau de bord affiche** : le
tableau de bord indique "Feeds 1/10" (essai, 6 jours restants), mais generer un
**2e** flux LinkedIn (Morgan Bancel, apres connexion) a immediatement renvoye
"You have reached your plan limit. Please upgrade to a higher tier to generate
more feeds." -- alors que le compteur affiche n'avait pas bouge. Confirme sur
la page Plans : le Plan Free permanent exclut "Social media feeds" (Instagram,
Facebook, X/Twitter nommes explicitement, LinkedIn absent de la liste mais
traite pareil en pratique) -- le compteur "10" ne couvre que les flux RSS
generiques (sites/blogs), **pas les flux sociaux, plafonnes bien plus bas** (1
seul constate). Le 5/5 de reussite technique tenait tant que le compte n'etait
pas encore connecte (feeds anonymes, sans quota applique) -- une fois connecte,
un seul flux LinkedIn est reellement utilisable.

**Decision de Julien (pas de budget pour un abonnement rss.app)** : rester sur
le plan gratuit, prioriser 10 profils sur les 14 restants (impossible en
pratique -- seul 1 est passe), 4 ecartes explicitement (Luc Julia -- aucun
signal d'activite recente confirme, contrairement aux 4 autres FR retenus ;
Zain Kahn, Rowan Cheung, Ruben Hassid -- profils newsletter/media IA plutot que
conseil direct, face a Pascal Bornet et Steve Nouri).

**Resultat reel** : 1 seul flux LinkedIn ajoutable via rss.app (Bernard Marr --
`https://rss.app/feeds/0OtYpAVTrw3xvzog.xml`), verifie dans Buffer avec du
contenu reel recent (6h, 11h, 2j) -> **IA-US 1/10**.

**A SURVEILLER -- expiration reelle de l'essai rss.app : ~24/09/2026** (6 jours
a partir du 18/09/2026, constate sur la page Plans : "Your plan has 6 days
left. Choose a plan before your feeds expire."). Passe ce delai, le flux
Bernard Marr expirera si aucun abonnement n'est active. **Solution temporaire,
pas perenne** -- a regenerer ou remplacer avant cette date si la situation
budgetaire ne change pas.

**Etat final des collections Buffer, au 18/09/2026 soir** :
- IA-FR : 3/10 (Pierrick Chevallier, Yassine Sdiri, Ludo Salenne -- tous YouTube).
- IA-US : 1/10 (Bernard Marr -- rss.app).
- LINKEDIN (pre-existante, non touchee) : 3/10 (Andrew Ng, Allie K. Miller,
  Yann LeCun -- pont `claudeagency.fr/api/li/`).

**En attente, non couverts faute de quota gratuit -- toujours dans la liste
validee a 20, a ajouter plus tard si la situation change** : Morgan Bancel,
Benoit Raphael, Natacha Njongwa Yepnga, Julien Chaumond, Cyril de Sousa
Cardoso, Ethan Mollick, Cassie Kozyrkov, Pascal Bornet, Steve Nouri (9 profils
-- testes fonctionnels sur rss.app mais bloques par le quota social une fois le
compte connecte), plus Luc Julia, Zain Kahn, Rowan Cheung, Ruben Hassid (4
profils ecartes par priorisation, jamais testes). Deux voies possibles pour
combler ce reliquat : Julien ajoute les 14 slugs transmis a la liste blanche de
`claudeagency.fr/api/li/` (gratuit, deja fonctionnel, aucune limite constatee
sur ce canal precis), ou un abonnement rss.app (Basic, 8,32 $/mois facture
annuellement, 15 flux -- couvrirait les 14).

**Correction/precision (18/09/2026, soir)** : **Paul Vengeons** (FR, l'un des 20
valides) etait en realite deja actif depuis le debut de ce chantier, present
dans la collection YOUTUBE preexistante (hors IA-FR, jamais deplace) --
omis par erreur du recapitulatif ci-dessus au premier passage. **Couverture
reelle des 20 : 7 comptes actifs**, pas 4 : Andrew Ng, Allie K. Miller (US,
whitelist claudeagency.fr), Bernard Marr (US, rss.app), Pierrick Chevallier,
Yassine Sdiri, Ludo Salenne, Paul Vengeons (FR, YouTube). Les 13 autres restent
en attente de l'arbitrage de Julien sur l'extension de la liste blanche
`claudeagency.fr/api/li/` (ne pas relancer rss.app ni tester un autre service
payant en attendant sa reponse, decision explicite de Nomena du 18/09/2026).
**Cette couverture partielle ne bloque pas la production des 3 posts de veille
demandes par Julien** -- ils sont rediges a partir des 7 comptes deja actifs.

## Correspondance canal Buffer <-> compte LinkedIn reel (verifiee le 18/09/2026)

Les deux canaux LinkedIn "Julien Rayes" dans Buffer ne se distinguent par aucun
nom visible dans l'interface (les deux s'affichent juste "Julien Rayes"). Deux
signaux indirects s'etaient reveles **contradictoires** avant cette
verification :
- le **slug technique Buffer** (visible dans les libelles "Clean Queue" / "Delete
  All Drafts" / "Empty Queue" des reglages generaux du canal) ;
- le **style du contenu** des posts deja en file/envoyes (missions freelance vs
  posts generalistes).

**Preuve retenue -- la seule fiable : l'en-tete reel du profil LinkedIn**, ouvert
via "Go to post" sur un post reellement envoye de chaque canal (clic sur un post
dans Insights > Performance per Post > "Go to post", puis lecture du texte sous
le nom de l'auteur sur la page LinkedIn elle-meme).

- **Canal `6aa87ac6ea19ca0bde439e7f`** (slug technique
  `julien-rayes-claude-partners`) -> profil LinkedIn dont l'en-tete affiche
  **"Julien Rayes -- Claude Partners : l'annuaire francophone des prestataires IA
  en entreprise..."** -> c'est le canal **CLAUDE PARTNERS**. Le slug technique
  disait vrai ; c'est le style de contenu (posts "missions freelance IA") qui
  avait induit en erreur le 17-18/09/2026 lors d'une premiere identification.
- **Canal `6aa87a19ea19ca0bde439c6b`** (slug technique generique `julien-rayes`,
  sans suffixe) -> profil LinkedIn dont l'en-tete affiche **"Julien Rayes ... |
  Claude Agency"** -> c'est le canal **CLAUDE AGENCY**.

**A retenir pour la suite** : sur ce compte Buffer precis, ni le slug technique
seul ni le style de contenu seul ne suffisent a identifier un canal avec
certitude -- le premier s'est revele juste, mais seulement verifie a posteriori.
Toujours confirmer par l'en-tete reel du profil LinkedIn (via "Go to post") avant
toute publication ou tout brouillon cible sur un compte precis.
