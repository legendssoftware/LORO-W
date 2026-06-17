/** Build mailto: URL for lead engage when SMTP is unavailable. */
export function buildLeadMailtoUrl(
  email: string,
  subject: string,
  body: string
): string {
  const params = new URLSearchParams();
  params.set('subject', subject);
  params.set('body', body);
  return `mailto:${email.trim()}?${params.toString()}`;
}

/** Build wa.me deep link for WhatsApp engage. */
export function buildLeadWhatsAppUrl(phone: string, body: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = `27${digits.slice(1)}`;
  } else if (!digits.startsWith('27') && digits.length <= 10) {
    digits = `27${digits}`;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(body)}`;
}
