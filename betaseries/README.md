# community/regseb/betaseries

Ce module affiche les prochains épisodes de séries à récupérer et/ou voir. La
liste est récupérée de votre compte du site
**[BetaSeries](https://www.betaseries.com/)**.

## Configuration

Le répertoire du widget doit avoir un fichier ***config.json*** contenant un
objet
[JSON](https://www.json.org/json-fr.html "JavaScript Object Notation") avec les
propriétés suivantes :

- `"shows"` (optionnel - valeur par défaut : toutes vos séries) : la liste des
  noms de série ;
- `"format"` (optionnel - valeur par défaut :
  `"S{season}E{episode} : {title} ({show})"`) : le format du texte affiché ;
- `"color"` (optionnel - valeur par défaut : `"#2196f3"`) : la couleur de fond
  du cadre (au format hexadécimale, régulier RGB ou avec des mots-clefs
  prédéfinis) ;
- `"key"` : votre [clé pour l'API](https://www.betaseries.com/api/) de
  BetaSeries ;
- `"secret"` : votre clé secrète pour l'API de BetaSeries ;
- `"cron"` (optionnel - valeur par défaut : `"@daily"`) : la notation cron
  indiquant la fréquence de mise à jour ;
- `"max"` (optionnel - aucune limite par défaut) : le nombre maximal d'épisodes
  affichés dans le widget.

Une image ayant pour nom ***icon.svg*** peut aussi est présente dans le
répertoire du widget. Par défaut, le logo de BetaSeries sera utilisé. L'image
doit être carrée et le dessin doit occupé toute la zone de l'image. Si le dessin
n'est pas carré, il faut le centrer verticalement et l'aligner à droite. Seule
la couleur noire doit être utilisée et elle doit avoir une opacité de `0.2`.

## Scraper

Ce module n'utilise pas de scraper.

## Exemple

Cet exemple affiche la liste des épisodes à récupérer et/ou voir pour la série
[The IT Crowd](https://www.betaseries.com/serie/itcrowd) (avec une mise à jour à
minuit).

```JSON
{
    "module": "community/regseb/betaseries",
    "files": {
        "config.json": {
            "shows": ["The IT Crowd"],
            "format": "s{season}e{episode} : {title}",
            "key": "d527c40702a3 (une clé de ce style)",
            "secret": "6d587671250475442502c66593526 (une clé de ce style)",
            "max": 3
        }
    }
}
```
