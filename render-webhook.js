// render-webhook.js
// Webhook simple pour Render ou Railway

const express = require('express');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3000;

// Configuration Supabase
const SUPABASE_URL = 'https://yvhsqrjezhjavnzgrwkp.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Middleware
app.use(cors());
app.use(express.json());

async function updateBooking(bookingId, status, paymentStatus) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/bookings?id=eq.${bookingId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'apikey': SUPABASE_SERVICE_ROLE_KEY
    },
    body: JSON.stringify({
      status: status,
      payment_status: paymentStatus
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erreur mise à jour: ${errorText}`);
  }

  return await response.json();
}

// Route webhook
app.post('/webhook', async (req, res) => {
  try {
    const body = req.body;
    const authorization = req.headers.authorization;
    const waveSignature = req.headers['wave-signature'];

    console.log('🔔 Webhook Wave reçu:', {
      body: body,
      authorization: authorization ? 'Présent' : 'Absent',
      waveSignature: waveSignature ? 'Présent' : 'Absent'
    });

    // Vérification de sécurité (optionnelle pour le moment)
    const waveSecret = process.env.WAVE_WEBHOOK_SECRET;
    if (waveSecret && authorization !== `Bearer ${waveSecret}`) {
      console.log('❌ Secret Wave invalide');
      return res.status(401).json({ error: 'Invalid authorization' });
    }

    const eventType = body.event_type;
    
    // Extraire le booking_id depuis l'URL de redirection
    let bookingId = null;
    
    // Essayer d'abord les métadonnées
    const metadata = body.data?.metadata || {};
    bookingId = metadata?.booking_id;
    
    // Si pas dans les métadonnées, essayer depuis l'URL de redirection
    if (!bookingId && body.data?.success_url) {
      const urlMatch = body.data.success_url.match(/paiement-reussi\/([^\/]+)/);
      if (urlMatch) {
        bookingId = urlMatch[1];
      }
    }
    
    // Si toujours pas trouvé, essayer depuis l'URL d'erreur
    if (!bookingId && body.data?.error_url) {
      const urlMatch = body.data.error_url.match(/paiement-echoue\/([^\/]+)/);
      if (urlMatch) {
        bookingId = urlMatch[1];
      }
    }

    console.log('📋 Détails du webhook:', {
      event: eventType,
      bookingId: bookingId,
      metadata: metadata,
      success_url: body.data?.success_url,
      error_url: body.data?.error_url
    });

    if (!bookingId) {
      console.log('❌ Booking ID manquant');
      return res.status(400).json({ error: 'Missing booking ID' });
    }

    // Traitement des événements
    if (eventType === 'checkout.session.completed') {
      console.log('✅ Paiement réussi pour la commande:', bookingId);
      
      try {
        await updateBooking(bookingId, 'confirmed', 'paid');
        console.log('✅ Booking mis à jour avec succès');
        return res.status(200).json({ success: true });
      } catch (error) {
        console.log('❌ Erreur mise à jour booking:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    if (eventType === 'checkout.session.payment_failed') {
      console.log('❌ Paiement échoué pour la commande:', bookingId);
      
      try {
        await updateBooking(bookingId, 'failed', 'failed');
        console.log('✅ Booking mis à jour avec succès');
        return res.status(200).json({ success: true });
      } catch (error) {
        console.log('❌ Erreur mise à jour booking:', error);
        return res.status(500).json({ error: error.message });
      }
    }

    console.log('✅ Webhook traité avec succès');
    return res.status(200).json({ success: true });
  } catch (error) {
    console.log('❌ Erreur générale:', error);
    return res.status(500).json({ error: 'Erreur serveur' });
  }
});

// Route de test
app.get('/', (req, res) => {
  res.json({ message: 'Webhook Wave actif' });
});

app.listen(port, () => {
  console.log(`🚀 Webhook démarré sur le port ${port}`);
}); 