# community/regseb/openweathermap

Ce module affiche la météo d'une ville. Les prévisions sont récupérées du
service [OpenWeatherMap](https://openweathermap.org/).

## Configuration

Le répertoire du widget doit avoir un fichier ***config.json*** contenant un
objet
[JSON](https://www.json.org/json-fr.html "JavaScript Object Notation") avec les
propriétés suivantes :

- `"city"` : le nom de ville, suivit éventuellement du code du pays (séparé par
  une virgule) ;
- `"color"` (optionnel - valeur par défaut : `"#03a9f4"`) : la couleur de fond
  du cadre (au format hexadécimale, régulier RGB ou avec des mots-clefs
  prédéfinis) ;
- `"cron"` (optionnel - valeur par défaut : `"0 * * * *"`) : la notation cron
  indiquant la fréquence de mise à jour ;
- `"appid"` : le clé de l'API pour le service d'OpenWeatherMap.

Les dimensions conseillées sont **14x13**.

### `"appid"`

Pour se connecter à l'API, il vous faut une clé qui s'obtient en s'inscrivant
sur le site Internet du service :
<https://home.openweathermap.org/users/sign_up>

## Scraper

Ce module n'utilise pas de scraper.

## Exemple

Cet exemple affiche la météo d'*Aix-en-Provence* sur fond bleu.

```JSON
{
    "openweathermap/aix": {
        "module": "community/regseb/openweathermap",
        "coord": { "x": 1, "y": 1, "w": 14, "h": 13 },
        "files": {
            "config.json": {
                "appid": "1a23edc4f5b67... (une clé de ce style)",
                "city": "Aix-en-Provence,fr"
            }
        }
    }
}
```
