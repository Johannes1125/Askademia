export const fetcher = async (input: RequestInfo | URL) => {
  const res = await fetch(input.toString());
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json();
};


