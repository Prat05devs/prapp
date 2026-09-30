import { env } from './env.ts';

// Expo push service (LLD §12): batches of ≤ 100, tickets per message.

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default';
}

export interface PushTicket {
  status: 'ok' | 'error';
  id?: string;
  message?: string;
  details?: { error?: string };
}

export async function sendExpoPush(messages: PushMessage[]): Promise<PushTicket[]> {
  const tickets: PushTicket[] = [];
  const token = env('EXPO_ACCESS_TOKEN');
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) throw new Error(`push_failed_${res.status}`);
    const json = (await res.json()) as { data?: PushTicket[] };
    tickets.push(
      ...(json.data ?? batch.map(() => ({ status: 'error' as const, message: 'no ticket' }))),
    );
  }
  return tickets;
}
