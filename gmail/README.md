# community/regseb/gmail

Ce module affiche les derniers courriels reçus sur une boite
**[Gmail](https://mail.google.com/)**.

## Configuration

Le répertoire du widget doit avoir un fichier ***config.json*** contenant un
objet
[JSON](https://www.json.org/json-fr.html "JavaScript Object Notation") avec les
propriétés suivantes :

- `"query"` (optionnel - valeur par défaut : `"is:unread"`) : le
  [filtre](https://support.google.com/mail/answer/7190) des courriels affichés ;
- `"color"` (optionnel - valeur par défaut : `"#f44336"`) : la couleur de fond
  du cadre (au format hexadécimale, régulier RGB ou avec des mots-clefs
  prédéfinis) ;
- `"index`" (optionnel - valeur par défaut : `0`) : l'index du compte Gmail ;
- `"cron"` : la notation cron indiquant la fréquence de mise à jour des
  nouveaux courriels ;
- `"key"` : un identifiant client pour les API Google ;
- `"secret"` : le code secret associé à l'identifiant.

**28** est une taille raisonnable pour la largeur du cadre. La hauteur dépend
du nombre de courriel qui peuvent être affichés dans le cadre. Si vous souhaitez
avoir les *N* derniers courriel : il faut fixer la hauteur à *N + 1*.

### `"key"` et `"secret"`

Pour obtenir un identifiant, allez dans la
***[Console des API Google](https://console.developers.google.com/)***. Créez un
projet, puis *Créez des identifiants* pour obtenir un *ID client OAuth* de type
*Application Web*. Laissez vide les champs pour définir les *Origines JavaScript
autorisées*. Pour les *URI de redirection autorisés*, ajoutez l'adresse fournit
par le module.

Ensuite, activez la *Gmail API*.

Puis il faut rejoindre le groupe *[Allow Risky Access Permissions By Unreviewed
Apps](https://groups.google.com/forum/#!forum/risky-access-by-unreviewed-apps)*
avec les comptes Google que vous souhaitez consulter.

## Scraper

Ce module n'utilise pas de scraper.

## Exemple

Cet exemple actualise, toutes les minutes, la liste des courriels non-lus et qui
sont dans la boite de réception.

```JSON
{
    "gmail": {
        "module": "community/regseb/gmail",
        "coord": { "x": 1, "y": 1, "w": 28, "h": 5 },
        "files": {
            "config.json": {
                "query": "is:unread in:inbox",
                "key": "88198.apps.googleusercontent.com (une clé de ce style)",
                "secret": "sdlkfjaskd (un code de ce style)",
                "cron": "* * * * *"
            }
        }
    }
}
```
