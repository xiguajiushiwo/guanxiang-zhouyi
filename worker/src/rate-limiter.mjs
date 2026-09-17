const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });

function validPayload(payload) {
  return payload && typeof payload.hour === 'string' && /^\d{10}$/.test(payload.hour) && typeof payload.day === 'string' && /^\d{8}$/.test(payload.day) && typeof payload.ipHash === 'string' && /^[a-f0-9]{64}$/.test(payload.ipHash) && Number.isInteger(payload.perIpLimit) && payload.perIpLimit > 0 && Number.isInteger(payload.dailyLimit) && payload.dailyLimit > 0;
}

export class ReadingRateLimiter {
  constructor(state) { this.state = state; }

  async fetch(request) {
    let payload;
    try { payload = await request.json(); } catch { return json({ ok: false, code: 'SERVICE_ERROR' }, 400); }
    if (!validPayload(payload)) return json({ ok: false, code: 'SERVICE_ERROR' }, 400);
    try {
      const result = await this.state.storage.transaction(async storage => {
        const previous = await storage.get('limit-state');
        const state = previous && previous.hour === payload.hour ? previous : { hour: payload.hour, perIp: {}, day: payload.day, daily: 0 };
        if (state.day !== payload.day) { state.day = payload.day; state.daily = 0; }
        const ipCount = Number(state.perIp[payload.ipHash]) || 0;
        if (ipCount >= payload.perIpLimit) return { ok: false, code: 'RATE_LIMITED' };
        if (state.daily >= payload.dailyLimit) return { ok: false, code: 'DAILY_LIMIT_REACHED' };
        state.perIp[payload.ipHash] = ipCount + 1;
        state.daily += 1;
        await storage.put('limit-state', state);
        return { ok: true };
      });
      return json(result);
    } catch { return json({ ok: false, code: 'SERVICE_ERROR' }, 503); }
  }
}
