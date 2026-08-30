import { QueryClient } from '@tanstack/react-query';

/**
 * A client that does not schedule the default 5-minute garbage-collection
 * timer. `new QueryClient()` in a unit test keeps Jest alive after the suite
 * ("did not exit one second after the test run has completed") and made the
 * mobile CI job sit for ~5 minutes after the last assertion.
 */
const clients: QueryClient[] = [];

export function createTestQueryClient(): QueryClient {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
      mutations: { retry: 0, gcTime: Infinity },
    },
  });
  clients.push(client);
  return client;
}

export function resetQueryClients() {
  for (const client of clients) {
    client.clear();
  }
  clients.length = 0;
}
