# community/regseb/om

Ce module affiche le résultat du dernier match de
l'**[Olympique de Marseille](https://www.om.net/)** et des informations sur le
prochain match.

## Configuration

Le répertoire du widget doit avoir un fichier ***config.json*** contenant un
objet
[JSON](https://www.json.org/json-fr.html "JavaScript Object Notation") avec les
propriétés suivantes :

- `"color"` (optionnel - valeur par défaut : `"#03a9f4"`) : la couleur de fond
  du cadre (au format hexadécimale, régulier RGB ou avec des mots-clefs
  prédéfinis) ;
- `"cron`" (optionnel - valeur par défaut : `"0 7 * * *"`) : la notation cron
  indiquant la fréquence de mise à jour.

Les dimensions conseillées sont **20x3**.

## Scraper

Ce module n'utilise pas de scraper.

## Exemple

Cet exemple affiche les informations sur les matchs de l'OM tous les jours à
sept heures.

```JSON
{
    "om": {
        "module": "community/regseb/om",
        "coord": { "x": 1, "y": 1, "w": 20, "h": 3 },
        "files": { "config.json": {} }
    }
}
```
