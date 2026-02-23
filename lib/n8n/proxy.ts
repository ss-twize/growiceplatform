export async function proxyToN8n<TRequest extends object, TResponse>(params: {
  url: string;
  body: TRequest;
}) {
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("N8N_WEBHOOK_SECRET не настроен");
  }

  const response = await fetch(params.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-wisery-secret": webhookSecret
    },
    body: JSON.stringify(params.body),
    cache: "no-store"
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`n8n webhook error: ${response.status} ${text}`);
  }

  return (await response.json()) as TResponse;
}
