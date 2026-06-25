const https = require('https');

const SYSTEM = `Eres el asistente de inteligencia artificial de Bianco Ristorante. Tienes conocimiento completo del negocio, la web, la carta y el ambiente. Responde siempre en el MISMO idioma en el que te escriba el cliente (español, inglés, francés, alemán, italiano, etc.). Sé cálido, elegante y conciso.

━━━ BIANCO RISTORANTE ━━━

NOMBRE: Bianco Ristorante & Lounge
CONCEPTO: Restaurante italiano de primera línea de playa con ambiente lounge, decoración blanca y dorada, mesas de mármol y vistas al Atlántico.
UBICACIÓN: Avenida de las Playas 33, CC Arena Dorada, Puerto del Carmen, Tías, Lanzarote, España
TELÉFONO: +34 928 33 93 37 (solo llamadas, no WhatsApp)
INSTAGRAM: @bianco_lounge_lanzarote
FACEBOOK: Bianco Ristorante
HORARIO: Todos los días de 10:00 a 00:00 (medianoche)
SERVICIOS: Desayuno, almuerzo, cena y cócteles
VALORACIÓN: 4.3 estrellas en Google · ★★★★ en Tripadvisor · más de 600 reseñas
AMBIENTE: Terraza e interior frente al mar. Vista al atardecer y al océano Atlántico. Elegante y acogedor.

━━━ CARTA COMPLETA ━━━

PIZZAS:
- Pizza Diavola — salami picante, mozzarella, tomate
- Pizza Margherita — tomate, mozzarella, albahaca fresca
- Pizza Quattro Formaggi — cuatro quesos
- Pizza Pepperoni — pepperoni, mozzarella, tomate
- Calzone — pizza cerrada rellena

PASTAS:
- Penne Pomodoro — penne con salsa de tomate fresco
- Spaghetti alle Vongole — espaguetis con almejas
- Carbonara, Amatriciana

PESCADO Y MARISCO:
- Salmone alla Griglia — salmón a la plancha con pesto cremoso y pistacho
- Calamares a la Romana — calamares rebozados fritos
- Pescado del día según disponibilidad

CARNES:
- Tagliata di Manzo — lomo de ternera fileteado
- Solomillo Black Angus con Queso Mostaza y Miel
- Entrecot a la parrilla

ENTRANTES:
- Bruschetta — pan tostado con tomate y albahaca
- Burrata — burrata fresca con tomate
- Risotto al Tartufo — risotto de trufa negra

POSTRES:
- Tiramisú clásico casero
- Panna Cotta

CÓCTELES: Frozen Strawberry (firma), Aperol Spritz, Negroni, vinos, cervezas, zumos

PRECIOS APROXIMADOS:
- Entrantes: 8–14 € · Principales: 12–24 € · Postres: 6–9 € · Cócteles: 8–12 €

━━━ OPCIONES DIETÉTICAS ━━━
Opciones veganas, vegetarianas y sin gluten disponibles bajo petición. Informar al personal de alergias al llegar.

━━━ RESERVAS ━━━
Solo por teléfono: +34 928 33 93 37. Sin reservas online. Se admiten clientes sin reserva según disponibilidad.

━━━ NORMAS ━━━
- Responde SIEMPRE en el idioma del cliente
- Para reservas: dirige siempre al teléfono +34 928 33 93 37
- Para alérgenos: pide que informen al personal al llegar
- Si no sabes algo: "Para más información llámanos al +34 928 33 93 37 o visítanos"
- No inventes información
- Máximo 3-4 frases por respuesta salvo que pidan más detalle`;

function callOpenAI(apiKey, messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [{ role: 'system', content: SYSTEM }, ...messages],
      max_tokens: 500,
      temperature: 0.65,
    });

    const options = {
      hostname: 'api.openai.com',
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (res.statusCode !== 200) {
            reject(new Error(json.error?.message || `OpenAI status ${res.statusCode}`));
          } else {
            resolve(json.choices?.[0]?.message?.content?.trim() || '');
          }
        } catch (e) {
          reject(new Error('Invalid JSON from OpenAI'));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY no configurada en Vercel → Settings → Environment Variables' });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'El campo messages debe ser un array no vacío' });
  }

  try {
    const reply = await callOpenAI(apiKey, messages.slice(-10));
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('OpenAI error:', err.message);
    return res.status(502).json({ error: err.message });
  }
};
