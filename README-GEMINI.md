# Configuration de l'Assistant d'Urgence avec Google Gemini

Ce document explique comment configurer l'API Google Gemini pour l'Assistant d'Urgence dans l'application 19SOS.

## Obtenir une clé API Google Gemini

1. Rendez-vous sur [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Connectez-vous avec votre compte Google
3. Cliquez sur "Create API Key" pour générer une nouvelle clé API
4. Copiez la clé API générée

## Configurer la clé API dans l'application

1. Ouvrez le fichier `lib/gemini.ts`
2. Remplacez `YOUR_GEMINI_API_KEY` par votre clé API Google Gemini
3. Enregistrez le fichier

```typescript
// Exemple de configuration
export const GEMINI_API_KEY = 'AIzaSyC1234567890abcdefghijklmnopqrstuvwxyz';
```

## Modèle utilisé

L'application utilise le modèle **Gemini 2.0 Flash**, qui est plus rapide et plus efficace que les versions précédentes. Ce modèle est optimisé pour les réponses rapides et concises, ce qui est idéal pour un assistant d'urgence.

## Fonctionnalités de l'Assistant d'Urgence

L'Assistant d'Urgence utilise l'API Google Gemini pour répondre aux questions des utilisateurs sur les soins d'urgence de base. Il est configuré pour:

- Fournir des informations précises sur les premiers secours
- Donner des conseils sur la gestion des situations d'urgence
- Recommander d'appeler les services d'urgence (112 ou 15) en cas d'urgence grave
- Répondre de manière concise et utile

## Personnalisation

Vous pouvez personnaliser le comportement de l'assistant en modifiant le contexte dans la fonction `fetchGeminiResponse` dans le fichier `lib/gemini.ts`.

## Dépannage

Si vous rencontrez des problèmes avec l'API:

1. Vérifiez que votre clé API est correcte
2. Assurez-vous que votre compte Google a accès à l'API Gemini
3. Vérifiez les quotas d'utilisation dans la console Google Cloud

## Test de l'API

Vous pouvez tester l'API directement avec curl:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=YOUR_API_KEY" \
-H 'Content-Type: application/json' \
-X POST \
-d '{
  "contents": [{
    "parts":[{"text": "Explique comment fonctionnent les premiers secours en cas d'arrêt cardiaque"}]
    }]
   }'
```

## Ressources supplémentaires

- [Documentation de l'API Google Gemini](https://ai.google.dev/docs/gemini_api_overview)
- [Guide de démarrage rapide de Google AI Studio](https://ai.google.dev/tutorials/web_quickstart) 