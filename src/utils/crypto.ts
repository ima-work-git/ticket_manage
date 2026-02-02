const SIGNING_KEY_NAME = 'ticket_signing_key';

async function getOrCreateSigningKey(): Promise<string> {
  let key = localStorage.getItem(SIGNING_KEY_NAME);
  if (!key) {
    const { v4: uuidv4 } = await import('uuid');
    key = uuidv4() + uuidv4();
    localStorage.setItem(SIGNING_KEY_NAME, key);
  }
  return key;
}

export async function createSignature(data: string): Promise<string> {
  const key = await getOrCreateSigningKey();
  const encoder = new TextEncoder();
  const keyData = encoder.encode(key);
  const messageData = encoder.encode(data);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

export async function verifySignature(
  data: string,
  signature: string
): Promise<boolean> {
  const expectedSignature = await createSignature(data);
  return expectedSignature === signature;
}

export function generateQRPayload(
  type: 'issue' | 'consume' | 'staff_invite',
  data: Record<string, string>
): Promise<string> {
  return createSignature(JSON.stringify({ type, data })).then((signature) => {
    const payload = {
      type,
      data,
      timestamp: Date.now(),
      signature,
    };
    return JSON.stringify(payload);
  });
}

export async function parseQRPayload(
  raw: string
): Promise<{ valid: boolean; type?: string; data?: Record<string, string> }> {
  try {
    const payload = JSON.parse(raw);
    const { type, data, timestamp, signature } = payload;

    // Check if QR is expired (5 minutes)
    const now = Date.now();
    if (now - timestamp > 5 * 60 * 1000) {
      return { valid: false };
    }

    const isValid = await verifySignature(
      JSON.stringify({ type, data }),
      signature
    );

    if (!isValid) {
      return { valid: false };
    }

    return { valid: true, type, data };
  } catch {
    return { valid: false };
  }
}
