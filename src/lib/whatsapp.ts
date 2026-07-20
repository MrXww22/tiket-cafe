const whatsappApiUrl = process.env.WHATSAPP_API_URL;
const whatsappToken = process.env.WHATSAPP_TOKEN;

export function normalizePhoneForWhatsapp(phone: string) {
  return phone.replace(/[^\d]/g, "");
}

export function getWhatsappTextUrl(phone: string, text: string) {
  const normalized = normalizePhoneForWhatsapp(phone);
  if (!normalized) return "";

  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

export async function sendWhatsappText(phone: string, text: string) {
  const normalized = normalizePhoneForWhatsapp(phone);
  if (!normalized) {
    console.log("[whatsapp skipped: empty phone]", text);
    return { sent: false, reason: "empty-phone" };
  }

  if (!whatsappApiUrl || !whatsappToken) {
    console.log("[whatsapp skipped: no api credentials]", getWhatsappTextUrl(normalized, text));
    return { sent: false, reason: "missing-credentials" };
  }

  const response = await fetch(whatsappApiUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${whatsappToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: normalized,
      type: "text",
      text: { preview_url: true, body: text },
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.error("[whatsapp failed]", response.status, body);
    return { sent: false, reason: "api-error" };
  }

  return { sent: true };
}
