const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const LEADERBOARD_KEY = "meshuggle:leaderboard";
const MAX_ENTRIES = 100;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// Obscenity blocklist - common slurs and profanity
const BLOCKED = [
  "fuck","shit","ass","bitch","cunt","dick","cock","pussy","nigger","nigga",
  "faggot","fag","whore","slut","bastard","piss","cum","twat","wanker","asshole",
  "arsehole","bollocks","kike","spic","chink","gook","wetback","cracker","tranny",
  "retard","rape","pedo","nazi","hitler",
];

function isClean(name) {
  const low = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return !BLOCKED.some(w => low.includes(w));
}

function isValidName(name) {
  if (!name || typeof name !== "string") return false;
  const trimmed = name.trim();
  if (trimmed.length < 1 || trimmed.length > 20) return false;
  if (!/^[a-zA-Z0-9 _\-\.!]+$/.test(trimmed)) return false;
  return isClean(trimmed);
}

async function redis(command) {
  const res = await fetch(`${UPSTASH_URL}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  return data.result;
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  // GET — return top 20
  if (event.httpMethod === "GET") {
    try {
      // ZREVRANGE with scores: returns [member, score, member, score...]
      const raw = await redis(["ZREVRANGE", LEADERBOARD_KEY, 0, 19, "WITHSCORES"]);
      const entries = [];
      for (let i = 0; i < raw.length; i += 2) {
        try {
          const entry = JSON.parse(raw[i]);
          entries.push({ ...entry, score: parseInt(raw[i + 1]) });
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
        body: JSON.stringify({ error: "Failed to fetch leaderboard" }),
      };
    }
  }

  // POST — submit a score
  if (event.httpMethod === "POST") {
    try {
      const body = JSON.parse(event.body || "{}");
      const { name, score, rounds } = body;

      if (!isValidName(name)) {
        return {
          statusCode: 400,
          headers: CORS,
          body: JSON.stringify({ error: "Invalid or inappropriate name" }),
        };
      }

      if (typeof score !== "number" || score < 0 || score > 5) {
        return {
          statusCode: 400,
          headers: CORS,
          body: JSON.stringify({ error: "Invalid score" }),
        };
      }

      const entry = JSON.stringify({
        name: name.trim(),
        score,
        date: new Date().toISOString().slice(0, 10),
      });

      // Use score as sort key, timestamp as tiebreaker (higher = worse, so invert)
      // We store score*1000000 + (1000000 - secondsSinceEpoch%1000000) so same
      // scores are sorted by most recent first
      const sortKey = score * 1000000 + (1000000 - (Math.floor(Date.now() / 1000) % 1000000));

      await redis(["ZADD", LEADERBOARD_KEY, sortKey, entry]);

      // Trim to max entries
      await redis(["ZREMRANGEBYRANK", LEADERBOARD_KEY, 0, -(MAX_ENTRIES + 1)]);

      return {
        statusCode: 200,
        headers: CORS,
        body: JSON.stringify({ ok: true }),
      };
    } catch (err) {
      return {
        statusCode: 500,
        headers: CORS,
        body: JSON.stringify({ error: "Failed to submit score" }),
      };
    }
  }

  return { statusCode: 405, headers: CORS, body: "Method not allowed" };
};
