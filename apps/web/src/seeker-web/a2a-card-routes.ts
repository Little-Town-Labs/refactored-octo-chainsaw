import { buildA2aCardIndex, getA2aCard } from "./a2a-cards";

export const A2A_DISCOVERY_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "public, max-age=300, stale-while-revalidate=86400",
} as const;

export function cardIdFromRouteParam(raw: string): string {
  return raw.endsWith(".json") ? raw.slice(0, -".json".length) : raw;
}

function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  if (typeof Response !== "undefined") {
    return Response.json(body, init);
  }

  const headers = new Map<string, string>();
  for (const [key, value] of Object.entries(init.headers ?? {})) {
    headers.set(key.toLowerCase(), value);
  }

  return {
    status: init.status ?? 200,
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
    json: async () => body,
  } as Response;
}

export function createA2aIndexResponse(): Response {
  return jsonResponse(buildA2aCardIndex(), { headers: A2A_DISCOVERY_HEADERS });
}

export function createA2aCardResponse(rawCardId: string): Response {
  const card = getA2aCard(cardIdFromRouteParam(rawCardId));
  if (card === null) {
    return jsonResponse(
      { error: "unknown_a2a_card" },
      {
        status: 404,
        headers: A2A_DISCOVERY_HEADERS,
      },
    );
  }

  return jsonResponse(card, { headers: A2A_DISCOVERY_HEADERS });
}
