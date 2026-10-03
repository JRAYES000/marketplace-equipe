# Grille — réseaux sociaux

Post, carrousel, commentaire. Les règles de forme et de fond vivent dans les skills
métier, qui ont priorité sur cette grille. **Charge celle qui correspond et applique ses
critères** :

| Livrable | Skill de référence |
|---|---|
| Post LinkedIn | `linkedin-mise-en-forme` (forme), `contenu-linkedin` si présente (fond) |
| Carrousel LinkedIn | `linkedin-carrousel` |
| Commentaire LinkedIn | `linkedin-commentaires` |
| Post recyclé d'une veille | `linkedin-veille-virale` |
| Post Instagram | `contenu-instagram` si présente |

## Contrôle par script d'abord

Pour un post LinkedIn, le script de `linkedin-mise-en-forme` mesure ce qui se mesure.
Lance-le sur le texte final et recopie sa sortie brute comme preuve :

```bash
node "<dossier de linkedin-mise-en-forme>/scripts/verif-post.mjs" verif "C:/chemin/vers/post.final.txt"
```

Si le script réclame une dépendance, lance une fois `npm ci` dans le dossier de
`linkedin-mise-en-forme` (`npm install` réécrirait `package-lock.json`). Ajoute
`--compte julien-agency` ou `--compte julien-partners` pour comparer aux posts précédents.

Le chemin du fichier s'écrit en `C:/...` : node ne comprend pas `/c/Users/...`. Le
carrousel et les commentaires ont leurs propres contrôles, décrits dans leur skill
(`node etat.js` pour le point de situation).

## Ce que les scripts ne mesurent pas

1. **Le bon compte.** Claude Agency ou Claude Partners : le sujet et le ton
   correspondent-ils au public de ce compte ?
2. **L'accroche tient sa promesse.** Ce que la première ligne annonce, le corps le
   livre. Une accroche qui promet un chiffre ou une méthode sans la donner est
   `À REPRENDRE`.
3. **Une seule idée.** Le post se résume en une phrase. Sinon, il en contient deux.
4. **Chiffres sourcés.** Chaque chiffre renvoie à une source ouverte pendant la session.
5. **Ni copie, ni traduction.** Un post inspiré d'un autre ne reprend pas ses phrases.
   Pour ce qui peut en être gardé, la règle de `linkedin-veille-virale` fait foi.
6. **Variété.** Le schéma (accroche, plan, fin) diffère des derniers posts du même
   compte. Les relire, pas les supposer.
7. **Lu comme un humain.** Pas de tournure générique d'IA. Lire le texte à voix haute :
   ce qui ne se dirait pas se réécrit.
8. **Visuel.** Lisible sur téléphone, cohérent avec le texte, sans faute.
9. **Programmation vérifiée dans l'outil.** Le post apparaît dans la file (Buffer ou
   autre) avec le bon compte, le bon texte, le bon visuel et la bonne heure. Convertir
   l'heure : Buffer programme à l'heure de Paris, Madagascar est en avance d'une heure en
   heure d'été française, de deux en heure d'hiver.
10. **Après publication** : le lien du post publié est donné à Julien.

## Questions de challenge typiques

- Qui, précisément, doit s'arrêter sur ce post en le faisant défiler, et pourquoi lui ?
- Que doit faire le lecteur après l'avoir lu ?
- Quel post récent du même compte ressemble le plus à celui-ci, et en quoi est-il
  différent ?
- Quelle phrase couperais-tu si le post devait faire deux lignes de moins ?
