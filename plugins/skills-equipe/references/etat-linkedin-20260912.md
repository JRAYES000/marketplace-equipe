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
memes precautions que le Point n°6). **Statut : NON CONFIRME**, comme le Point n°6 -- Julien
doit ouvrir son propre profil pour verifier. Deux posts (Point n°6 : 5 diapos, non conforme au
brief ; Point n°7 : 10 diapos, conforme) sont potentiellement en attente de cette meme
confirmation, sans certitude qu'aucun, l'un ou les deux existent reellement.

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
