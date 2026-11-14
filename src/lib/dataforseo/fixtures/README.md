# Fixtures DataForSEO

Réponses au format de l'API v3 (enveloppe `tasks[].result`) servant aux tests : la CI n'appelle jamais DataForSEO.

Statut : **synthétiques** (écrites d'après la documentation officielle, valeurs plausibles pour mega-coloring.com). L'appel réel de démonstration n'a pas pu être fait lors de M1.1 : le proxy de la session n'injectait aucun identifiant pour api.dataforseo.com (réponse 40100). Dès que DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD sont disponibles, lancer `pnpm demo:dataforseo` et remplacer serp-organic-live.json par la réponse réelle.
