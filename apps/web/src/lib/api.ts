import { createApiClient } from '@prapp/api-client';

/** Same-origin API client; the session cookie authenticates the request. */
export const api = createApiClient({ baseUrl: '' });
