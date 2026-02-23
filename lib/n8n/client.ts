export async function callN8nProxy<TReq extends object, TRes>(path: string, body: TReq): Promise<TRes> {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || "Ошибка n8n proxy");
  }

  return response.json() as Promise<TRes>;
}
