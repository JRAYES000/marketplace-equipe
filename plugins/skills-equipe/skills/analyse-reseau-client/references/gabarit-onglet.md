# Gabarit d'un onglet « analyse réseau »

Squelette commun aux onglets YouTube, Instagram et X. Garde l'ordre et les titres : le client
passe d'un onglet à l'autre et retrouve les mêmes repères. Adapte le contenu des sections 3
et 4 au réseau. Supprime une section vide plutôt que de la remplir pour la forme.

Le contrôle (`scripts/verifier-onglet.mjs`) exige : le titre `#` avec « — », la ligne de
mise à jour, « L'essentiel en N points », au moins 3 sections numérotées, l'annexe A et
l'historique.

```markdown
# Votre compte Instagram — analyse et recommandations

> **Dernière mise à jour : JJ/MM/AAAA** — relevé fait <où : sur votre profil, dans YouTube
> Studio, dans vos captures du Drive>. Les chiffres datent du JJ/MM sauf mention contraire.
> Tenu à jour par <prénom>. L'historique des versions est en bas de page.

---

## L'essentiel en 6 points

1. **<Le constat, en une phrase en gras.>** <Deux ou trois phrases, avec les chiffres qui le
   prouvent.>
2. **Ce qui a marché : <…>.** <La publication la plus forte, son chiffre, pourquoi.>
3. **Ce qui ne marche pas : <…>.**
4. …
5. …
6. **<Le risque ou l'échéance la plus urgente.>** Voir « <section> ».

---

## 1. Où en est le compte

### Le profil
| Élément | État |
|---|---|
| Abonnés | … |
| Publications | … |
| Lien de la bio | … (où il mène, vérifié le JJ/MM) |

### Les chiffres de la période
| Indicateur | Valeur |
|---|---|

### Qui vous suit
| Critère | Répartition |
|---|---|
| Pays | … |
| Âge | … |

### Les publications, période par période
| Période | Publications | Vues (médiane) | Likes (moyenne) | Ce qui s'est passé |
|---|---|---|---|---|

---

## 2. Ce qui marche, ce qui ne marche pas

### Vos 5 publications les plus vues
<tableau> puis **Ce qu'elles ont en commun :** <3 à 5 puces>

### Vos 5 publications les moins vues
<tableau> puis **Ce qu'elles ont en commun :**

### Ce que ça vaut par rapport aux autres comptes
<repères chiffrés, avec la source et la réserve de méthode>

### Risques à traiter
<seulement s'il y en a : le texte de la règle, la conséquence, ce qu'on recommande, « nous ne
sommes pas juristes » si c'est du droit>

---

## 3. <Le format propre au réseau : les stories / les Shorts / la vidéo sur X>

## 4. <La vitrine : couvertures ou miniatures, légendes, titres ou textes, commentaires ou réponses>
Sur X, ajoute un tableau « Ce qu'on voudrait faire | Règle de X » pour l'automatisation.
Pour chaque sujet : **Ce qu'on voit**, puis **Nos recommandations**, puis un tableau
« Actuel → Proposition » quand on réécrit (les crochets [montant] sont à compléter par le
client, on n'invente pas).

## 5. Les outils
| Pour quoi | Outil | Prix (pages officielles, JJ/MM/AAAA) |
|---|---|---|
Puis les règles de publication sur plusieurs réseaux (une version par réseau, les
consignes du client par réseau).

## 6. Grandir : ce qu'ont fait les comptes qui ont réussi
| Compte | Pays | Profil | Abonnés | Engagement | Ce qui marche chez lui |
|---|---|---|---|---|---|
Puis **Ce qu'on en retient pour vous** et **Ce que dit la plateforme, et ce que disent les
études**.

## 7. À faire avant <l'échéance>
Une liste numérotée, dans l'ordre où le faire. Puis « Les 30 jours suivants » (tableau
Rythme | Contenu).

---

## Annexe A — Les <N> publications (depuis le début)
Légende des colonnes en une ligne, puis le tableau complet. « non relevé » dans les cases
vides. Une ligne de total en dessous.

## Annexe B — Mode d'emploi pour votre assistant
Seulement si le client a un assistant : réglage des outils, pas à pas, et la routine du
lundi (relever les 3 meilleures et les 3 moins bonnes publications de la semaine).

## Annexe C — Pour mettre à jour cette analyse (<prénom>)
Ce fichier EST la page du client ; où relever chaque chiffre ; rythme du relevé ; « un
chiffre non relevé ne s'invente pas ».

## Sources
Consultées le JJ/MM/AAAA. Une ligne par thème : règles de la plateforme, droit, études,
outils.

## Historique
| Date | Qui | Ce qui a changé |
|---|---|---|
```
