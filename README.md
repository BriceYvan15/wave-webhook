# Wave Webhook

Webhook public pour traiter les notifications de paiement Wave et mettre à jour les statuts dans Supabase.

## Configuration

### Variables d'environnement

- `SUPABASE_SERVICE_ROLE_KEY` : Clé de service Supabase
- `WAVE_WEBHOOK_SECRET` : Secret du webhook Wave (optionnel)

## Déploiement

1. Connectez ce repository à Render
2. Créez un **Web Service**
3. Configurez les variables d'environnement
4. L'URL du webhook sera : `https://votre-app.onrender.com/webhook`

## Utilisation

Le webhook traite les événements Wave :
- `checkout.session.completed` : Met à jour le statut à "confirmed" et "paid"
- `checkout.session.payment_failed` : Met à jour le statut à "failed"

## Test

```bash
npm install
npm start
```

Puis testez avec :
```bash
curl -X POST http://localhost:3000/webhook \
  -H "Content-Type: application/json" \
  -d '{"event_type": "checkout.session.completed", "data": {"success_url": "https://example.com/paiement-reussi/test-123"}}'
```
