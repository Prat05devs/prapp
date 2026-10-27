import 'server-only';

export class RequestBodyTooLarge extends Error {
  constructor() {
    super('request_body_too_large');
  }
}

/** Bound actual bytes, including chunked bodies without a trustworthy Content-Length. */
export async function readLimitedText(req: Request, maxBytes: number): Promise<string> {
  const declared = Number(req.headers.get('content-length'));
  if (declared > maxBytes) throw new RequestBodyTooLarge();
  const reader = req.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel();
        throw new RequestBodyTooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}
