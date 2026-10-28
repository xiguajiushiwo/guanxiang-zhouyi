// Bound the entire fetch + JSON read, including a response whose body never ends.
export async function fetchLibraryJson(url, {fetchImpl = globalThis.fetch, timeoutMs = 10000} = {}) {
  const controller = new AbortController();
  let timer;
  try {
    return await Promise.race([
      (async () => {
        const response = await fetchImpl(url, {signal: controller.signal});
        if (!response.ok) throw new Error(`Library HTTP ${response.status}: ${url}`);
        return response.json();
      })(),
      new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new Error(`Library timeout: ${url}`)); }, timeoutMs); }),
    ]);
  } finally { clearTimeout(timer); }
}
