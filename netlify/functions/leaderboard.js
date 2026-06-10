const BASE_URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN    = process.env.UPSTASH_REDIS_REST_TOKEN;
const KEY      = "meshuggle:leaderboard";
const MAX_ENTRIES = 100;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const BLOCKED = [
  "fuck","shit","bitch","cunt","dick","cock","pussy","nigger","nigga",
  "faggot","fag","whore","slut","bastard","piss","cum","twat","wanker",
  "asshole","arsehole","bollocks","kike","spic","chink","gook","wetback",
  "cracker","tranny","retard","rape","pedo","nazi","hitler",
];

function isClean(name) {
  const low = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return !BLOCKED.some(w => low.includes(w));
}

function isValidName(name) {
  if (!name || typeof name !== "string") return false;
  const t = name.trim();
  if (t.length < 1 || t.length > 8) return false;
  if (!/^[a-zA-Z0-9 _\-\.!]+$/.test(t)) return false;
  return isClean(t);
}

// Use query param auth - this database requires ?_token= instead of Bearer header
async function redis(...args) {
  const path = args.map(a => encodeURIComponent(String(a))).join("/");
  const url = `${BASE_URL}/${path}?_token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (!BASE_URL || !TOKEN) {
    return {
      statusCode: 500,
      headers: CORS,
      body: JSON.stringify({ error: "Upstash credentials not configured" }),
    };
  }

  // GET — return top 20
  if (event.httpMethod === "GET") {
    try {
      const raw = await redis("ZREVRANGE", KEY, 0, 49, "WITHSCORES");
      const entries = [];
      for (let i = 0; i < raw.length; i += 2) {
        try {
          const entry = JSON.parse(raw[i]);
          // raw[i+1] is the sort key, not the real score — use entry.score from the stored JSON
          entries.push(entry);
        } catch { /* skip malformed */ }
      }
      return {
        statusCode: 200,
        headers: { ...CORS, "Content-Type": "application/json" },
        body: JSON.stringify(entries),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to fetch leaderboard", detail: err.message }),
      };
    }
  }

  // POST — submit score
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { name, score } = body;

      if (!isValidName(name)) {
        return {
          statusCode: 400,
          headers: CORS,
          body: JSON.stringify({ error: "Invalid or inappropriate name" }),
        };
      }

      const scoreNum = parseInt(score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 9999) {
        return {
          statusCode: 400,
          headers: CORS,
          body: JSON.stringify({ error: "Invalid score" }),
        };
      }

      const trimmedName = name.trim();
      // Generate a short deterministic hash tag from name+date so duplicates are distinguishable
      const hashInput = trimmedName.toLowerCase() + new Date().toISOString().slice(0, 10);
      let h = 0;
      for (let i = 0; i < hashInput.length; i++) { h = (Math.imul(31, h) + hashInput.charCodeAt(i)) | 0; }
      h = Math.abs(h);
      const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I
      const tag = CHARS[h % CHARS.length] + CHARS[Math.floor(h / CHARS.length) % CHARS.length] + String(h % 10);

      const entry = JSON.stringify({
        name: trimmedName,
        tag,
        score: scoreNum,
        date: new Date().toISOString().slice(0, 10),
      });

      const sortKey = scoreNum * 1e9 + (1e9 - (Date.now() % 1e9));

      await redis("ZADD", KEY, sortKey, entry);
      await redis("ZREMRANGEBYRANK", KEY, 0, -(MAX_ENTRIES + 1));

      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: true }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: "Internal error", detail: err.message }),
      };
    }
  }

  return { statusCode: 405, headers: CORS, body: "Method not allowed" };
};
