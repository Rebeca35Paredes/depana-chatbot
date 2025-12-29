const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// ================== CLIENTE ==================
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

// ================== QR ==================
client.on('qr', qr => {
    console.log('📱 Escanea este QR desde el WhatsApp Business');
    qrcode.generate(qr, { small: true });
});

// ================== READY ==================
client.on('ready', () => {
    console.log('✅ WhatsApp conectado correctamente');
});

// ================== MENÚ ==================
const MENU_TEXTO = `
👋 *Bienvenido a De Pana*

Puedo ayudarte con:
• Comprar medicamentos
• Cuotas y financiamiento
• Entregas
• Resolver dudas generales

Escribe tu pregunta o escribe *menu* para ver opciones.
`;

// ================== FAQs ==================
const FAQS = [
    {
        keywords: ['cuotas', 'financiamiento'],
        reply: '💳 Puedes pagar medicamentos hasta en *4 cuotas sin intereses*.'
    },
    {
        keywords: ['envio', 'entrega'],
        reply: '🚚 Realizamos entregas en varias ciudades de Venezuela (24–72 h).'
    },
    {
        keywords: ['seguro', 'confiable'],
        reply: '🔒 Trabajamos con farmacias certificadas y protegemos tus datos.'
    }
];

function checkFAQs(text) {
    for (const faq of FAQS) {
        for (const word of faq.keywords) {
            if (text.includes(word)) return faq.reply;
        }
    }
    return null;
}

// ================== IA (GENERAL, SEGURA) ==================
async function askAI(userQuestion) {
    try {
        const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content:
                            'Eres un asistente informativo de farmacia. ' +
                            'NO das diagnósticos, NO recetas medicamentos, ' +
                            'NO das dosis. Solo información general. ' +
                            'Siempre recomienda consultar a un profesional de salud.'
                    },
                    {
                        role: 'user',
                        content: userQuestion
                    }
                ],
                temperature: 0.3
            },
            {
                headers: {
                    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        return response.data.choices[0].message.content;
    } catch (error) {
        console.error('IA error:', error.message);
        return null;
    }
}

// ================== MENSAJES ==================
client.on('message', async message => {
    if (message.from.includes('@g.us')) return;

    const msg = message.body.toLowerCase().trim();

    // SALUDO
    if (
        msg.includes('hola') ||
        msg.includes('menu') ||
        msg.includes('inicio')
    ) {
        return message.reply(MENU_TEXTO);
    }

    // OPCIONES RÁPIDAS
    if (msg === '1' || msg.includes('comprar')) {
        return message.reply(
            '🛒 Puedes explorar medicamentos directamente en nuestra app.\n\n' +
            'Si quieres, dime el nombre del medicamento o para qué lo necesitas.'
        );
    }

    // FAQs
    const faqResponse = checkFAQs(msg);
    if (faqResponse) {
        return message.reply(faqResponse);
    }

    // IA PARA PREGUNTAS ABIERTAS
    if (msg.length > 6) {
        const aiReply = await askAI(message.body);

        if (aiReply) {
            return message.reply(
                aiReply +
                '\n\n⚠️ *Esta información es solo orientativa y no sustituye la consulta médica.*'
            );
        }
    }

    // FALLBACK
    return message.reply(
        'Puedo ayudarte con compras, cuotas, entregas o dudas generales.\n' +
        'Escribe *menu* para comenzar 😊'
    );
});

client.initialize();
