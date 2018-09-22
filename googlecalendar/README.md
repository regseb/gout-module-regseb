# community/regseb/googlecalendar

Ce module affiche les prochains évènements d'un
**[Google Agenda](https://www.google.com/calendar)**.

## Configuration

Le répertoire du widget doit avoir un fichier ***config.json*** contenant un
objet
[JSON](https://www.json.org/json-fr.html "JavaScript Object Notation") avec les
propriétés suivantes :

- `"calendars"` (optionnel - valeur par défaut : `["primary"]`) : la liste des
  identifiants des agendas qui seront affichés ;
- `"color"` (optionnel - valeur par défaut : `"#3f51b5"`) : la couleur de fond
  du cadre (au format hexadécimale, régulier RGB ou avec des mots-clefs
  prédéfinis) ;
- `"index`" (optionnel - valeur par défaut : `0`) : l'index du compte Google
  Agenda ;
- `"cron"` (optionnel - valeur par défaut : `"0 */4 * * *"`) : la notation cron
  indiquant la fréquence de mise à jour des évènements ;
- `"key"` : un identifiant client pour les API Google ;
- `"secret"` : le code secret associé à l'identifiant ;
- `"max"` (optionnel - aucune limite par défaut) : le nombre maximal de
  courriels affichés dans le widget.

Une image ayant pour nom ***icon.svg*** peut aussi est présente dans le
répertoire du widget. Par défaut, le logo de Google Agenda sera utilisé. L'image
doit être carrée et le dessin doit occupé toute la zone de l'image. Si le dessin
n'est pas carré, il faut le centrer verticalement et l'aligner à droite. Seule
la couleur noire doit être utilisée et elle doit avoir une opacité de `0.2`.

### `"key"` et `"secret"`

Pour obtenir un identifiant, allez dans la
***[Console des API Google](https://console.developers.google.com/)***. Créez un
projet, puis *Créez des identifiants* pour obtenir un *ID client OAuth* de type
*Application Web*. Laissez vide les champs pour définir les *Origines JavaScript
autorisées*. Pour les *URI de redirection autorisés*, ajoutez l'adresse fournit
par le module.

Ensuite, activez la *Calendar API*.

## Scraper

Ce module n'utilise pas de scraper.

## Exemple

Cet exemple affiche les évènements de votre calendrier principale (en les
mettant à jour une fois par jour).

```JSON
{
    "module": "community/regseb/googlecalendar",
    "files": {
        "config.json": {
            "key": "88198.apps.googleusercontent.com (une clé de ce style)",
            "secret": "sdlkfjaskd (un code de ce style)",
            "cron": "0 5 * * *",
            "max": 5
        }
    }
}
```
