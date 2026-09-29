# Journal de bord — france-travail-extraction

Trace horodatée des runs réels, de la v2.0 (2026-06-17) à la v4.7 (2026-09-18).
**Ce ne sont pas des consignes.** En cas de désaccord avec `SKILL.md`, le corps de la
skill fait foi : il est tenu à jour, ce journal ne l'est pas. Il sert à comprendre
*pourquoi* une règle existe, avant de la contester ou de la modifier.

Le texte d'origine est conservé tel quel, y compris ses entrées sans accents.

---

JOURNAL DE BORD — trace horodatee des runs, PAS des consignes. En cas de desaccord entre une
entree ancienne et le corps du skill, LE CORPS FAIT FOI : il est tenu a jour, le journal ne
l est pas. Deux points ont change depuis les premieres entrees — le telephone ne vient plus
du clic « Afficher le numero » mais du CV (v4.3), et l appariement des CV se fait par l ordre
des fichiers ancre sur les noms, pas par le nom seul (v4.6).

2026-06-17 — refonte v2.0 à partir d'un test live. Constats vérifiés en session connectée
(compte ECOLE DE NATURO) :
(1) ARCHITECTURE — pro.francetravail.fr/recherche-profil est une appli Apache Tapestry RENDUE
CÔTÉ SERVEUR (assets tapestry-*, events `eventredirection…`), PAS d'API JSON publique. Donc
AUCUN équivalent du pipeline « API via Playwright » de la skill moncompteformation : l'extraction
doit passer par l'UI dans le navigateur réel.
(2) AUTH — l'espace recruteur exige login + mot de passe PUIS un code 2FA (OTP SMS+mail) à usage
unique. Test Playwright : login/mdp acceptés mais blocage systématique sur l'OTP (code non
récupérable côté automatisation). → Claude in Chrome sur session déjà ouverte = seule voie fiable.
(3) DONNÉES profil — le vrai nom EST exposé au format « Prénom NOM(majuscules) » (ex.
« Marie DUPONT–MARTIN ») ; l'adresse postale complète est visible ; le téléphone derrière
« Afficher le numéro » ; l'EMAIL est MASQUÉ dans l'UI (« Pour des raisons de sécurité, l'adresse
e-mail des candidats n'est pas visible ») → l'email ne s'obtient QUE via le CV téléchargé, et
manque donc pour tout candidat sans CV.
(4) TEST LIVE 2026-06-17 sur 4 profils « infirmière libérale » (pipeline validé de bout en bout,
3 leads injectés dans Instantly) — enseignements intégrés ci-dessous :
• Les CV sont le plus souvent des SCANS IMAGE → la lecture brute Windows-MCP `read` renvoie le
  PDF binaire (inutile) et `pdftotext` renvoie vide. SEUL l'OCR (pdftoppm + tesseract dans le
  sandbox) extrait l'email. Certains CV ont quand même une couche texte → essayer `pdftotext`
  d'abord, OCR en repli.
• Le CV téléchargé s'appelle TOUJOURS `Document.pdf` (Chrome suffixe `Document (1).pdf`,
  `(2)`…) quel que soit le nom affiché → identifier le nouveau fichier par DIFF du dossier
  Downloads, jamais par le nom affiché.
• Champs INCONSTANTS d'un profil à l'autre : nom réel parfois absent (seul l'intitulé s'affiche),
  bouton « Afficher le numéro » parfois absent, email JAMAIS dans l'UI. Le téléphone peut être
  récupéré dans le CV par OCR quand il manque sur le profil.
• Rendement réaliste pour l'emailing : ~1 profil sur 4 totalement inexploitable (ni nom, ni tél,
  ni CV). Prévenir l'utilisateur.
• Destination réelle : INSTANTLY (cold email).
(5) DÉCISION v2.1 (2026-06-17, validée Julien) : le LIVRABLE s'arrête au CSV. L'import Instantly
a été retiré du parcours automatisé — l'app Instantly (SPA, rendu blanc, dropdowns react-select
non ouvrables, bouton d'import exigeant un clic réel) n'est pas pilotable de façon fiable, et
l'import manuel par l'utilisateur prend ~30 s avec la visibilité (mapping, dédup, erreurs) qui
manque en automatisation. Confirmé en conditions réelles : à l'import manuel, Instantly AUTO-MAPPE
`job_title` sur son champ natif « Job Title » (stocké, mais non affiché dans le tableau Leads).
Ajout du champ `job_title` (= titre/fonction du profil) à l'extraction et au CSV.
(6) LIMITE INSTANTLY (2026-06-17, vérifiée en édition réelle de leads) : le champ « Job Title »
d'Instantly a une **limite ~32 caractères** — au-delà, la valeur est SILENCIEUSEMENT refusée à
l'enregistrement (le panneau reste ouvert, la cellule reste vide, aucune erreur). Constaté sur
« Actuellement ASH - objectif Infirmière libérale » et « Infirmière en santé au travail
(ex-libérale) » qui ne passaient pas, alors que « Infirmière libérale » / « Infirmière libérale
remplaçante » passaient. → Garder `job_title` COURT (< 32 car.) et concis. La ponctuation n'est
PAS en cause (testé) ; c'est bien la longueur. Corollaire : mieux vaut mapper `job_title` à
l'import (auto-détecté « Job Title ») que remplir le champ après coup lead par lead.
(7) PASSAGE À L'ÉCHELLE v2.2 (2026-06-17, run réel de 20 leads, profils 14→87) — méthode rapide :
• Le screenshot par profil est trop lent. À la place, tout se pilote en JAVASCRIPT depuis le
  panneau profil : avancer (clic JS sur « Suivant »), lire (nom, fonction, commune, présence CV)
  et TÉLÉCHARGER le CV (un `.click()` JS sur le lien « Télécharger » DÉCLENCHE bien le download —
  seul `fetch()` est bloqué). On enchaîne ainsi 10-12 profils par appel dans une boucle async.
• Isoler le panneau : le plus petit élément contenant « Contacter par e-mail » + « EXPÉRIENCES »
  mais NI « Filtres appliqués » NI « résultats pour » (sinon la liste de gauche pollue la lecture).
  Nom+fonction = les lignes entre « Profil mis à jour le <date> » et « Disponibilité ».
• Le ref du bouton « Suivant » devient PÉRIMÉ après chaque avance (re-render) → re-trouver via JS
  à chaque fois, ne pas réutiliser un ref.
• Journaliser dans un tableau PERSISTANT (`window.__log.push(...)`), jamais une variable
  réassignée : sinon un lot entier est perdu si la lecture arrive avant la fin de la boucle async.
• MAPPER CV → candidat PAR LE NOM, pas par l'ordre de téléchargement : l'ordre des
  `Document (N).pdf` dérive dès qu'un download rate. Or l'email du CV contient le nom
  (`marie.dupont@…` → Marie DUPONT) → appariement fiable avec le nom lu sur le panneau.
• FILTRE DE PERTINENCE indispensable : « infirmière libérale » renvoie beaucoup de hors-cible,
  croissant en profondeur (photographe, préparateur de commandes, professeur d'arabe, hôtesse de
  caisse, plieur de parachute…). Garder infirmier/IDE/aide-soignant ; écarter le reste. Les
  meilleurs profils sont en TÊTE de liste.
• Copie des CV en lot via UN SEUL PowerShell (boucle `Copy-Item Document (N).pdf → cvN.pdf`), puis
  OCR en lot dans le sandbox. Email = facteur limitant (pas de CV ou pas d'email = lead écarté).
(8) OPTIMISATIONS v3.0 (2026-07-22, session d'optimisation — ⚠️ NON testées en live, à valider
au prochain run réel puis corriger la skill si besoin) :
• SCRIPT CANONIQUE figé dans la Phase 3 : la méthode rapide n'est plus re-dérivée à chaque run
  (tokens économisés, pièges déjà résolus non réintroduits : ref « Suivant » périmé, isolation
  du panneau, __log persistant).
• ATTENTE CONDITIONNELLE : le « ~1,3 s fixe » après chaque « Suivant » est remplacé par un
  polling du compteur de pagination (150 ms, timeout 4 s) → plus rapide sur site réactif, plus
  robuste sur site lent.
• OCR ENTRELACÉ : copie PowerShell + OCR du lot N lancés EN ARRIÈRE-PLAN dans le sandbox
  (nohup … &) pendant que Chrome extrait le lot N+1 → temps OCR quasi nul sur les gros runs.
(9) DESTINATION NOTION v3.1 (2026-09-17, demande de Julien — ⚠️ écriture Notion NON testée
en live, à valider au premier run puis corriger ici) :
• Le registre cumulatif des leads est désormais la base Notion « Leads France Travail »
  (data source collection://c9a8febd-29ae-468e-a320-bd2fd62a161f), créée le 2026-09-17.
• Elle résout le trou de la v3.0 : la dédup n'avait aucun référentiel par défaut et
  dépendait d'un CSV que l'utilisateur devait penser à fournir. Elle est maintenant
  automatique, par lecture SQL de la base.
• Le CSV reste produit : Instantly s'alimente par upload de fichier, pas depuis Notion.
  Notion est le registre, le CSV est le véhicule d'import — les deux, jamais l'un ou l'autre.
(10) INSTANTLY ABANDONNÉ v3.2 (2026-09-17, Julien : « je n'utilise plus Instantly ») :
• Toute la marche à suivre d'import, le mapping des colonnes et la limite ~32 caractères du
  champ « Job Title » disparaissent des instructions — c'étaient des contraintes de cet
  outil-là, pas du métier. Les constats (5) et (6) ci-dessus restent au journal : ils
  expliquent pourquoi le CSV a la forme qu'il a.
• La destination est désormais Notion seule. Le CSV reste produit comme export local, pour
  ne pas dépendre d'un seul endroit — mais plus aucun outil d'emailing n'est nommé tant
  que Julien n'a pas dit lequel remplace Instantly.
(11) SIMPLIFICATION v4.0 (2026-09-17, demande de Julien : « Notion uniquement, simplifie et
optimise pour Claude Code / Opus 5 ») :
• Le CSV disparaît complètement. Notion est le seul livrable. Tout ce qui décrivait un
  tableur, des en-têtes de colonnes ou un import sort des instructions.
• Le corps passe de 418 à moins de 200 lignes. Le script d'extraction et le pipeline OCR
  ne sont plus recopiés en bloc dans le markdown : ils vivent dans `scripts/`, à côté de ce
  fichier, et sont appelés par leur chemin. Un bloc de code cité dans une instruction se
  fait re-dériver, paraphraser et casser ; un fichier appelé s'exécute tel quel.
• `copier-cv.sh` et `ocr-lot.sh` fusionnent en `scripts/emails-depuis-cv.sh` : l'agent
  n'avait aucune raison de piloter deux étapes séparément et se trompait de dossier entre
  les deux.
• Environnement cible : Claude Code, plus Cowork. L'outil Bash remplace le sandbox et
  Windows-MCP ; `present_files` disparaît.
(12) PREMIER RUN REEL EN CLAUDE CODE (2026-09-17, 10 profils « infirmiere liberale »,
compte ECOLE DE NATURO). Le script de juin ne fonctionnait plus. Constats verifies :
• SELECTEUR DE PANNEAU MORT — l ancien cherchait un element contenant « Contacter par
  e-mail » ET « EXPÉRIENCES » en textContent. Or « EXPÉRIENCES » n existe QUE en innerText :
  la majuscule vient du CSS. Le script rendait done:0 sans rien signaler. Le panneau est
  `div.modal-body`, a reperer par « Profil mis à jour le » SEUL — exiger « Adresse » en plus
  fait rater tous les profils sans bloc adresse.
• OUVRIR UN PROFIL EXIGE UN VRAI CLIC. Un `.click()` JS sur `button.lienclic-profil` ne
  declenche rien : le handler veut un evenement de confiance. Le clic JS reste valable pour
  « Afficher le numero » et « Telecharger ».
• FENETRE MINIMISEE = PANNE SILENCIEUSE. Chrome suspend le rendu : le panneau ne s ouvre pas,
  innerWidth reste fige (784x363 constate), les captures partent en timeout. Symptome
  indiscernable d un site casse. Verifier `window.outerWidth` avant de conclure a autre chose.
• TELECHARGEMENTS MULTIPLES BLOQUES PAR CHROME : sur 9 clics « Telecharger », UN SEUL fichier
  est arrive. Chrome demande une autorisation pour les telechargements automatiques multiples.
  A autoriser pour pro.francetravail.fr AVANT le lot, sinon tous les emails manquent sauf un.
• L OCR DEFORME L AROBASE : « mdurand@gmail.com » est ressorti en « mdurandegmail.com ».
  Chercher aussi le motif sans arobase, et ecrire l adresse reconstruite en le signalant dans
  la Note plutot qu en la donnant pour sure.
• LE TELEPHONE EST SOUVENT DANS LE TEXTE DE PRESENTATION alors que le champ dedie affiche
  « Information indisponible ». Prendre le champ en priorite, le texte en repli, noter la source.
• INJECTER LE SCRIPT PRECEDE DE `await` : sans lui l IIFE rend `{}`, ce qui se lit comme un
  lot vide alors que rien n a tourne.
• RENDEMENT MESURE : 10 profils parcourus, 9 pertinents, 1 hors cible (facturiere pour IDEL),
  6 telephones, 1 seul email — a cause du blocage Chrome, pas du vivier.
(13) SECOND PASSAGE, MEME JOUR, telechargements autorises. Corrections et ajouts :
• RENDEMENT REEL, une fois Chrome debloque : 9 CV sur 9 rendent un email, soit 8 leads avec
  email sur 10 profils. Le « 1 sur 4 inexploitable » du constat (4) etait une mesure faite
  dans des conditions degradees — ne pas s en servir pour rabaisser les attentes.
• DEUX CV LISIBLES NE RENDAIENT RIEN pour des raisons de forme : domaine coupe en deux
  (« JDURAND.75@YAHO O.COM », coupure presente dans le PDF lui-meme et non dans l OCR,
  donc la reparation doit s appliquer AUSSI a la couche texte), et arobase lue comme un e
  (« mdurandegmail.com »). `emails-depuis-cv.sh` fait desormais trois passes et suffixe
  [RECONSTRUIT] ce qui n est pas sur.
• UN CV PEUT REVELER L IDENTITE d un profil anonyme : le profil 3 n affichait que son intitule,
  son CV portait nom, email et telephone. Ne pas classer un profil sans nom comme inexploitable
  avant d avoir lu son CV.
• LE BLOC NOM/TITRE EST INCONSTANT D UN PASSAGE A L AUTRE : le meme profil a rendu « Marie
  DURAND » puis « Infirmière libérale » a la relecture. S appuyer sur le numero de pagination
  pour reapparier, jamais sur le nom relu.
• AJOUT DE LA COLONNE `Profil mis a jour` (demande de Julien) : seul indicateur de fraicheur
  d un lead. La liste sort deja triee du plus frais au plus ancien — sur ce lot, du 17/09 au
  16/07, et la pertinence decroit dans le meme ordre.
(14) LE TELEPHONE VIENT DU CV, PAS DU PANNEAU (2026-09-17, mesure sur 26 CV reels).
• L OCR rend 25 telephones sur 26 CV. Le clic « Afficher le numero » n en rendait que 25 sur
  30 profils, coutait 1,6 s chacun, et RATAIT des numeros que le CV porte en clair — le champ
  du panneau affiche souvent « Information indisponible » alors que le CV donne le numero.
• Donc : ne cliquer « Afficher le numero » QUE pour les profils SANS CV, ou c est la seule
  source. Gain mesure : 16,3 s/profil -> 7,4 s/profil, soit 55 % du temps total. Sur 1000
  profils, 4 h 32 deviennent 2 h 03.
• LE TELEPHONE EST AUSSI UNE CLE D APPARIEMENT : une adresse qui ne porte pas le nom
  (petit.nuage@hotmail.fr) se rattache par le numero lu dans le meme CV.
• L ordre chronologique des `Document (N).pdf` peut servir d appariement de secours, mais
  SEULEMENT s il est ancre par au moins deux ou trois correspondances nominatives dans le
  meme lot — et il se dit alors dans la Note.
(15) MOT-CLE ET VIVIER (2026-09-17). « Infirmiere liberale » ne rend que 86 resultats et
beaucoup de hors-cible en profondeur. « Naturopathie » en rend 1592, tous dans le champ, avec
des profils en reconversion qui cherchent explicitement une FORMATION — la vraie cible d une
ecole. Le mot-cle pese plus sur le rendement que n importe quelle optimisation technique :
le choisir sur l intention (reconversion, formation) autant que sur le metier exerce.
(16) LOT REEL SUR « FORMATION NATUROPATHIE » (2026-09-17, 30 profils, protocole v4.3) :
• 21 CV telecharges, 21 emails extraits — 100 pourcent, contre 1 sur 10 au premier run.
  18 appariements attestes par le nom, 2 probables, 1 orphelin.
• Chrono : 4 min 07 de parcours, 16 s d OCR, 1 min 20 d ecriture Notion = 5 min 43 pour 30
  profils, soit 11,4 s/profil. Extrapolation : 1000 profils en 3 h 10.
• Qualite sans commune mesure avec « infirmiere liberale » : aucun hors-cible, et une majorite
  d intitules qui declarent explicitement un projet de formation (« A la recherche d une
  formation en Naturopathie », « Projet : formation naturopathie », « Etudiante en naturopathie »).
• LE RECOUVREMENT ENTRE REQUETES EST REEL : 2 profils sur 30 etaient deja en base via la
  requete « Naturopathie ». La dedup par email n est pas un confort, c est une necessite des
  qu on enchaine plusieurs requetes.
• COLONNES AJOUTEES (demande de Julien) : `Requete` (renommage de `Metier recherche`, contient
  la requete exacte) et `Type de requete` (FORMULE deduite de `Requete` — ne jamais l ecrire).
  Le statut « Importe Instantly » devient « Importe SalesHandy » : outil change, mais AUCUN
  export n est automatise pour l instant, la chaine s arrete a Notion.
(17) LOT DE 100 SUR « FORMATION NATUROPATHIE » (2026-09-17, positions 31 a 130, v4.3).
• L ONGLET EN ARRIERE-PLAN EST LE PIEGE LE PLUS COUTEUX DE CE RUN. Chrome bride les
  minuteries d un onglet cache : `setTimeout` tombe a 1 par seconde. Le parcours passe de
  1,4 s a 25 s par profil SANS AUCUNE ERREUR — le script tourne, il rampe. Symptome
  indiscernable d un site lent. Le controle qui tranche est `document.hidden`, PAS
  `window.outerWidth` : la fenetre peut etre grande ouverte et l onglet quand meme cache,
  par exemple parce qu une autre fenetre Chrome est passee devant. Verifier avant chaque lot.
• REMETTRE LA BONNE FENETRE DEVANT : `App mode resize` de Windows-MCP vise une fenetre
  Chrome quelconque — il a saisi une fenetre personnelle pendant que France Travail restait
  derriere. Cibler le PID (`Get-Process chrome | Where MainWindowTitle -ne ""`) puis
  ShowWindow + SetForegroundWindow sur ce handle-la.
• DEBIT MESURE, ONGLET VISIBLE : 1,4 a 1,7 s/profil. Des lots de 15 passent sans probleme ;
  a 10 profils un lot a depasse le timeout CDP de 45 s parce que l onglet etait cache.
• CHRONO BOUT EN BOUT : 10 min 53 de parcours + OCR intercale, 12 min 33 d appariement et
  d ecriture Notion = 23 min 26 pour 100 profils. Extrapolation : 1000 profils en ~3 h 55,
  dont 1 h 50 de parcours. L incident de l onglet cache a coute ~3 min sur ce lot.
• LE VIVIER S EPUISE VERS LA POSITION 100. Jusqu a ~100, les profils restent centres sur la
  naturopathie ; au-dela France Travail elargit et rend du hors-sujet (chauffeur de bus,
  juriste, assistante dentaire, RRH). Sur 1079 resultats annonces, la matiere utile est bien
  plus courte que le compteur. Ne pas confondre volume annonce et vivier reel.
• RENDEMENT : 99 fiches ecrites, 1 doublon ecarte. 73 CV pour 57 emails et 71 telephones ;
  76 fiches exploitables sur 99. Le plafond n est pas l OCR mais le depot de CV : 26 profils
  n en ont pas.
• UN SEUL TELECHARGEMENT PERDU SUR 74 CLICS, une fois l autorisation Chrome accordee.
• LE CV TRANCHE L APPARIEMENT ET REVELE LES ANONYMES. Quand l email ne porte pas le nom,
  lire les premieres lignes du CV : le nom y figure presque toujours. Ce controle a identifie
  6 profils affiches sans nom (noms retires pour publication) et confirme 4 appariements douteux. Il a aussi
  corrige une attribution : un CV que l ordre placait chez un profil appartenait au suivant.
• LA SORTIE DU PONT JAVASCRIPT PLAFONNE vers 1000 caracteres : un journal de 100 profils
  revient tronque, en silence. Parade : injecter le journal dans un `<article>` de la page
  puis le lire avec `get_page_text`, qui rend 10 000 caracteres d un coup. `navigator.
  clipboard.writeText` ne marche pas ici (il bloque jusqu au timeout CDP).
• ISOLER LES CV PAR TOUR AVANT DE LES LIRE : des que Downloads est vide, Chrome recycle les
  noms `Document (n).pdf`. Deplacer les CV du tour dans son propre dossier avant l OCR evite
  l ecrasement, et rend l OCR parallelisable avec le tour suivant.
• VOLUMES MESURES : reconversion bien-etre 3218, sophrologie 2195, naturopathie 1592, formation
  naturopathie 1079, infirmiere liberale 86. Les mots-cles se croisent en ET : naturopathie +
  reconversion bien-etre = 28 profils tres cibles.
• ECONOMIE DE JETONS : plutot que de re-injecter le script a chaque lot, l enregistrer une fois
  dans `window.__run = async (BATCH) => {...}` puis appeler `await window.__run(7)`.
(18) RELECTURE CRITIQUE DE LA SKILL (2026-09-17, apres le lot de 100). Defauts corriges :
• LA REGLE D APPARIEMENT ETAIT FAUSSE. Elle disait « jamais par l ordre des fichiers » alors
  que l ordre EST la methode : sur 57 emails attribues, beaucoup ne portent aucun nom. La
  regle juste est : l ordre porte, les noms ancrent, nom-du-cv.sh tranche les trous.
• DEUX BLOCS DE CODE CASSES en v4.5 : une sequence backslash-n ecrite en vrai saut de
  ligne, et un bloc bash jamais ferme qui faisait passer trois paragraphes pour du code.
• LE SCRIPT LIVRE N ETAIT PAS CELUI UTILISE. Le fichier contenait une IIFE avec BATCH=8 en
  dur, alors que la pratique reelle enregistre `window.__run(n)`. Le script livre definit
  maintenant cette fonction et fait un premier lot a l injection (v4.7 : il tourne aussi en
  arriere-plan des lors que les parades sont installees).
• LA DEDUP CHARGEAIT TOUTE LA BASE en un `group_concat`. Passe a 177 lignes, cela finira
  tronque EN SILENCE. Remplacee par une interrogation ciblee sur les valeurs du lot, en
  Phase 5 : la reponse reste courte quelle que soit la taille de la base. Charger en amont
  n economisait aucun parcours, puisqu on ne sait pas d avance qui on va croiser.
• TAILLE DE LOT INCOHERENTE : le corps disait 8, le journal 7, la mesure dit 15. Tranche par
  la regle du timeout CDP de 45 s.

(19) CE QU UN ONGLET CACHE EMPECHE VRAIMENT (2026-09-18, mesure sur 177 profils). Chrome
degrade un onglet en arriere-plan de QUATRE facons. Deux se contournent, deux non :
• MINUTERIES BRIDEES — 10 attentes de 200 ms (2 s attendues) ont depasse 45 s, facteur 22.
  Parade : les minuteries d un Web Worker y echappent — meme test a 2 047 ms.
• requestAnimationFrame GELE — 0 image par seconde, pas « ralenti ». Toute animation
  d ouverture reste figee : la modale du profil garde width:0 et ne s ouvre JAMAIS. Parade :
  reimplementer rAF sur le Worker (32 images/s obtenues). Les deux parades sont dans
  `scripts/arriere-plan.js`, a injecter apres chaque rechargement.
• CLICS DU PROTOCOLE DE DEBOGAGE SANS EFFET — un ecouteur pose sur le bouton ne recoit RIEN.
  Sans parade. C est ce qui empeche d ouvrir le premier profil.
• RENDU DE LA LISTE SUSPENDU — 0 li.cv-result construit alors que les filtres sont bons.
  Sans parade.
Un AudioContext silencieux, parade classique, ne leve aucune des quatre : teste, sans effet.
• WINDOWS INTERDIT LE VOL DE FOCUS : SetForegroundWindow echoue depuis une application qui n a
  pas l entree utilisateur. AttachThreadInput ramene la fenetre mais pas l onglet. Ne pas
  tenter ctrl+<n> a l aveugle — le raccourci part dans la fenetre au premier plan, qui peut
  etre une autre fenetre de l utilisateur : cela lui a change son onglet actif. C est a lui
  de basculer, et il faut le lui demander.
• NI FIRECRAWL NI BROWSER-USE N Y CHANGENT RIEN : le premier n a pas la session recruteur (la
  page deconnectee ne montre ni nom ni CV), le second pilote le meme Chrome et subit les
  memes quatre limitations. Lui passer les cookies de session serait fragile et imprudent.
• LA RECHERCHE SE PILOTE PAR L UI, CONFIRME : ?mot=... est ignore, la requete vit cote
  serveur et survit aux rechargements. Le mot-cle se pose en cliquant la suggestion
  « Ajouter : <requete> » (Entree vide le champ), puis il FAUT cliquer « Rechercher » :
  sans ce clic le tag est pose mais l en-tete affiche encore l ancienne requete. C est
  l en-tete « N resultats pour : X » qui fait foi, pas les tags.
• RESUME DE PROFIL : il vit dans un `blockquote` du panneau, et aussi — complet — dans
  `li.cv-result` de la liste, mais la liste n affiche PAS le nom. Seul le panneau donne le
  couple nom + resume, donc seul lui permet un appariement sur.
• RENDEMENT : 177 resumes collectes, 100 pourcent des profils parcourus en avaient un.
  0,32 s par profil sans telechargement de CV — 135 profils en 41 s.

(20) REFONTE v5.0 POUR CLAUDE SONNET 5.5 (2026-09-29, demande de Julien). Aucun changement de
methode ni de logique de script. Ce qui a change dans SKILL.md :
• Ce journal sort du frontmatter : il representait ~40 pourcent du fichier et etait charge a
  chaque appel de la skill.
• Deux contradictions corrigees, qu un modele plus litteral aurait suivies : la Phase 3 disait
  que le script clique « Afficher le numero » pour tout profil (il ne le fait que sans CV,
  constat 14), et la Phase 6 imposait d annoncer « 1 profil sur 4 inexploitable », chiffre que
  le constat (13) declarait perime. Remplace par le repere mesure du lot de 100 (76/99).
• Chaque phase finit par une barriere verifiable ; la Phase 6 interdit d annoncer l ecriture
  avant la relecture de la base (a effort bas, Sonnet 5.5 tend a declarer fini sans verifier).
• Chemins des scripts rendus explicites (relatifs au dossier de la skill, pas au dossier de
  travail) et obligation d utiliser les scripts fournis plutot que du code improvise.
• Commentaire d emails-depuis-cv.sh aligne sur la regle d appariement v4.6 (l ordre porte, les
  noms ancrent).
• Non verifie en run reel a la date de la refonte : a confirmer au prochain lot.

(v5.2) DEDOUBLONNAGE AVANT PARCOURS ET MESURE DES TEMPS (2026-09-29)
• Lot de 20 « Formation naturopathie » : 17 profils deja en base. Chacun a coute un
  telechargement de CV, un OCR et un appariement pour rien. Correctif : les noms connus
  (Prenom NOM, pagines depuis Notion) sont injectes avant le script, qui saute un profil
  connu AVANT tout clic. `__run(n)` compte desormais n NOUVEAUX profils, avec un budget de
  35 s par appel. Teste sur une page simulee : 2 connus sautes (dont un accent different),
  3 nouveaux, 3 CV seulement.
• Le connecteur Notion coupe une reponse SQL a 100 lignes, signale seulement par
  `has_more: true` : 100 cles rendues sur 160. Paginer avec LIMIT 100 OFFSET n.
• OU PASSE LE TEMPS, mesure reelle : parcours de 20 profils ~90 s (horodatage des CV),
  OCR des 13 CV 5,4 s (la plupart ont une couche texte). Le reste d'une session est la
  connexion 2FA et les allers-retours de l'assistant. Reecrire en Rust ne ferait rien
  gagner : aucun calcul n'est lent ici (pas de Python dans la chaine ; pdftotext et
  tesseract sont deja du C/C++). La vitesse de parcours est bornee par le site, dont il
  faut de toute facon respecter le rythme.

(v5.3) NOTE OBLIGATOIRE, RECHERCHE ENREGISTREE, CV A LA CORBEILLE (2026-09-29)
• Sur les lots du 17/09, la Note portait le texte de presentation du candidat, recopie a la
  main par l assistant : aucune regle ne le demandait (la Note n etait prevue que pour le
  motif d un champ vide). Au lot du 29/09, deux fiches sur trois sont donc sorties sans Note.
  Correctif : le script releve `presentation` (entre « Disponibilite » et « Points forts »,
  coupe avant « Adresse » : un candidat y avait colle son adresse postale), la Note est
  obligatoire, et la Phase 6 controle qu aucune Note du lot n est vide.
• Recherche enregistree sur France Travail (« Formation naturopathie dispo immediate maj 3
  mois ») : mot-cle et filtres rappeles en un clic. Un premier essai avec « < » dans le nom a
  laisse la fenetre bloquee sur « Enregistrement en cours… » sans rien creer.
• `nettoyer-cv.sh` envoie les CV du lot a la corbeille apres verification Notion : 13 CV
  retires le 29/09, 0 echec.

(v6.0, 2026-09-29, demande de Julien) DESTINATION NOCODB. Notion remplace par NocoDB (base
« Leads », table « Leads France Travail », 197 lignes migrees, memes colonnes sauf « Type de
requete », formule Notion non reprise). Lecture et ecriture par scripts/nocodb.js (resume,
connus, dedup, ecrire, verifier) ; il remplace notion-query-data-sources et notion-create-pages.
• Regle Ecarte : le skill n'ecrit jamais Statut=Ecarte ; un profil Ecarte en base reste un
  doublon, jamais ré-ajouté. Les 31 lignes Ecarte ont ete supprimees de NocoDB le 29/09/2026
  (table passee de 197 a 166). Effet de bord : ces personnes ne sont plus reconnues comme connues.
• Test ecriture : une ligne d'essai inseree puis supprimee (total revenu a 197 avant la purge).

(v7.0, 2026-09-29, demande de Julien) DOUBLE DESTINATION NOCODB + NOTION. NocoDB reste la
reference (dedup, connus, verifier) ; Notion devient un miroir ecrit apres NocoDB.
• Incident a l'origine : la v5.3 du plugin (ancienne destination Notion) a ete utilisee alors que
  le depot etait deja en v6.0 (NocoDB) : 60 fiches ecrites dans Notion, aucune dans NocoDB. Les
  deux copies du skill (depot ecole-naturo-ops et plugin marketplace-equipe) doivent rester alignees.
• Limite Notion : `query_data_sources` a repondu `usage_limit_reached` le 29/09/2026 apres un gros
  lot. Regle : alerte visible dans la conversation des la premiere reponse de limite, pas de
  reessai, fiches mises en attente (`nocodb.js attente`), run poursuivi, alerte repetee en tete
  du recapitulatif. « Notion : non vérifié » si la relecture est elle-meme bloquee.
• nocodb.js : `ecrire` rend `ids=` ; `notion-pages <ids|--attente>` sort les fiches au format
  notion-create-pages (plus de retape a la main, source d'erreurs : une date et deux Notes
  deformees le 29/09) ; `attente` / `attente-vider` gerent la file d'attente Notion.
• extraction-profils.js : regex du nom corrigee (`\n+`), le panneau met une ligne vide entre la
  date et le nom. Avant : nom0 toujours vide, aucun profil connu saute (6 profils sur 8 du premier
  lot etaient deja en base).
• Colonne « Type de requete » ajoutee dans NocoDB (formule : « formation » -> Intention de
  formation, « reconversion » -> Reconversion, sinon Metier exerce). Jamais ecrite par le skill.

(v7.1, 2026-09-29, demande de Julien) FILE D'ATTENTE NOTION SUR GITHUB + RECONCILIATION.
• La file d'attente Notion n'est plus un fichier du dossier temporaire de Windows : c'est
  `etat/notion-en-attente-leads-france-travail.txt` dans le depot prive JRAYES000/claude-config
  (Id NocoDB seulement, aucune donnee personnelle), ecrit par `gh` ; conflit de deux sessions
  detecte par le sha et rejoue une fois. Teste de bout en bout (ajout, second ajout fusionne,
  lecture, vidage).
• `nocodb.js reconcilier <export.csv|.json> [--importer]` : ecarts NocoDB <-> Notion, appariement
  par email puis nom+prenom+commune+requete (multi-ensemble), fiches Ecarte jamais importees.
  Teste sur un export factice (223 lignes, 3 absentes cote Notion, 1 fiche en plus, 1 Ecarte) :
  chiffres exacts ; import d'une fiche d'essai (date francaise -> ISO, note multiligne) relue puis
  supprimee, table revenue a 224 lignes.
• Blocage constate le 29/09/2026 : `query_data_sources` en limite, Notion absent de Composio, la
  recherche Notion ne liste pas 250 lignes. D'ou l'export CSV manuel comme voie sans quota.

(v7.1, 2026-09-29, suite) PREMIERE RECONCILIATION REELLE, via Composio (Notion connecte a Composio
par Julien apres la limite du connecteur MCP). 258 lignes Notion lues en 3 appels
`NOTION_QUERY_DATABASE`, comparees aux 224 lignes NocoDB : 2 fiches seulement dans NocoDB
(Reconversion bien-etre, recopiees dans Notion), 5 seulement dans Notion hors 31 `Ecarte` ignorees.
Sur ces 5 : 2 vraies fiches (RENELLE Sophie, CORREIA Arminda, ecrites dans Notion par la v5.3
le matin du 29/09, apres la migration) importees dans NocoDB ; 3 doublons Notion non importes
(2 ecrits par erreur par ma propre ecriture Notion avant dedup NocoDB, 1 fiche « fonction
publique » deja presente). Relecture : NocoDB 226, Notion 260, 0 fiche NocoDB absente de Notion.
Lecon : une ecriture Notion faite AVANT le dedoublonnage NocoDB cree des doublons Notion ; la
Phase 5 bis recopie desormais seulement les Id acceptes par `ecrire`.

(v8.0, 2026-09-29, demande de Julien) AUDIT ET REFONTE DE L'APPARIEMENT, NOTION EN DIFFERE.
• Deux copies divergentes : la skill personnalisee claude.ai (v5.3, destination Notion seule,
  declenchement automatique) masquait la v7.1 du plugin dans la liste des skills d'une session
  Claude Code (meme nom). Une session lancee ce jour-la aurait ecrit dans Notion seul.
• Bug : emails-depuis-cv.sh listait les CV par `sort` sur le nom, soit (1), (10), (2)… et
  Document.pdf en dernier, alors que l'appariement repose sur l'ordre. Corrige : rang tire du
  numero Chrome (Document.pdf = 0), tri numerique, rang en premiere colonne. Teste sur 4 PDF
  factices (0, 1, 2, 10) : ordre exact.
• Appariement automatise (`assembler.js`) : la page note `dlRang` a chaque telechargement ; le
  texte de chaque CV est garde dans cv.tsv ; un CV qui porte le nom + prenom, le telephone ou un
  email au nom d'un profil devient une ancre ; entre deux ancres, rattachement par ordre
  seulement si les comptes sont egaux, sinon « appariement incertain ». Teste : CV perdu entre
  deux ancres -> « CV non recu » ; CV perdu hors ancres -> les deux profils « incertain », aucun
  email attribue.
• `window.__exporter()` telecharge le journal (ft-journal.json) : plus de relecture tronquee
  par get_page_text ni de transcription a la main. `assembler.js lot` construit lot.json (Note
  et motifs compris) depuis un choix.json { pag: Fonction }.
• Notion retire du run : plus d'alerte de limite, plus de file d'attente GitHub (commandes
  `attente` / `attente-vider` supprimees ; la file etait vide). Synchro a la demande :
  references/synchro-notion.md.
• ocr-par-tour.sh ne deplace plus que les CV des 4 dernieres heures ; nettoyer-cv.sh emporte
  aussi ft-journal*.json et les fichiers de travail passes en argument.
• SKILL.md : 36,5 Ko -> 19,2 Ko ; replis, conformite detaillee, relecture manuelle du journal
  dans references/annexes.md.

(v9.0, 2026-09-29, demande de Julien) NOTION FAIT FOI, PAR L'API PUBLIQUE ; NOCODB EN MIROIR.
• Cause : le connecteur Notion MCP plafonne ses appels (usage_limit_reached ;
  query_multiple_data_sources reserve a l'offre payante). L'API publique Notion avec un jeton
  d'integration interne est gratuite et sans quota d'usage (~3 req/s).
• Connexion interne « Leads France Travail - API » creee dans l'espace CLAUDE PARTNERS, base
  connectee (sans cette connexion : 404 object_not_found), jeton NOTION_TOKEN_FT range dans le
  coffre (empreintes locale et distante identiques).
• scripts/notion.js : resume, connus, dedup, ecrire, reprendre, verifier, export,
  miroir-nocodb, amorcer, archiver-test. Teste sur 3 fiches TEST- : ecriture 2/2, verifier
  compte=2, dedup 2 doublons, echec force (jeton invalide) -> code 3 + file d'attente 1,
  reprise 1 creee, reprise d'une fiche deja ecrite -> « 1 deja dans Notion » sans doublon,
  Ecarte refuse, archivage 3/3 (base revenue a 257).
• amorcer --sec : 0 fiche NocoDB absente de Notion. Premier miroir : 8 modifications, 0
  creation, 0 suppression, relu = attendu = 226, relance a 0 ecart. Chemin de suppression du
  miroir et garde-fou non exerces sur donnees reelles (aucune suppression a faire).
• Incident : valeurs du coffre entourees de backticks ; un export bash non nettoye les a
  executees et a affiche une partie de NOCODB_TOKEN dans une erreur. Regle ajoutee en Phase 1.
