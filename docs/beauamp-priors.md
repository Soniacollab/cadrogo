# BeauAMP / priors marchés publics (échantillon IT)

Le fichier `src/data/beauamp-it-sample.json` est un **échantillon représentatif**
d'attributions IT (CPV 72*, 48*, 302*) inspiré de la structure BeauAMP
(BOAMP + SIRENE), pas un dump intégral.

## Pourquoi pas Kaggle / fine-tune LLM ?

- Les datasets Kaggle de tenders sont rarement FR + DCE PDF + coûts PME.
- Un fine-tune LLM n'apporte pas de confiance PME (hallucinations clauses).
- Le prior utile est **tabular** : P(win | prix, CPV, taille, go score…).

## Remplacer l'échantillon

1. Télécharger BeauAMP (Zenodo) ou EUROPROCURE-10.
2. Filtrer CPV numériques (72*, 48*, 302*, 724*).
3. Exporter un JSON compatible avec le schéma de `beauamp-it-sample.json`.
4. Recaler les coefficients dans `src/lib/win-model.ts` si besoin.

## Modèle v0

`computeWinPrior` implémente une régression logistique documentée
(`logistic-beauamp-it-v0`). Les coefficients sont heuristiques calibrés
sur l'échantillon ; documenter toute re-calibration.
