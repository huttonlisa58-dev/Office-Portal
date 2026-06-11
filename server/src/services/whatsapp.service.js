// WhatsApp via Meta Cloud API.
// SCAFFOLD: wire-ready. Set WHATSAPP_TOKEN + WHATSAPP_PHONE_ID and approve message
// templates in Meta Business Manager. Free-form text only works inside the 24h window;
// outside it you must send an approved template (adjust the payload below).
export async function sendWhatsApp({ to, body }) {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  if (!token || !phoneId) {
    console.log(`[whatsapp:dev] to=${to} :: ${body}`);
    return { dev: true };
  }
  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body },
    }),
  });
  if (!res.ok) throw new Error(`WhatsApp API error: ${res.status} ${await res.text()}`);
  return res.json();
}
