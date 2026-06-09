const UPSTASH_URL   = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const LEADERBOARD_KEY = "meshuggle:leaderboard";
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
  if (t.length < 1 || t.length > 20) return false;
  if (!/^[a-zA-Z0-9 _\-\.!]+$/.test(t)) return false;
  return isClean(t);
}

async function redis(command) {
  const res = await fetch(UPSTASH_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${UPSTASH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.result;
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  // GET — return top 20
  if (event.httpMethod === "GET") {
    try {
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

      // Score is number of correct songs — any non-negative integer is valid
      const scoreNum = parseInt(score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 9999) {
        return {
          statusCode: 400,
          headers: CORS,
          body: JSON.stringify({ error: "Invalid score" }),
        };
      }

      const entry = JSON.stringify({
        name: name.trim(),
        score: scoreNum,
        date: new Date().toISOString().slice(0, 10),
      });

      // Sort key: score * 1e9 + (1e9 - ms_since_epoch % 1e9) so ties go to earliest submission
      const sortKey = scoreNum * 1e9 + (1e9 - (Date.now() % 1e9));

      await redis(["ZADD", LEADERBOARD_KEY, sortKey, entry]);
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
        body: JSON.stringify({ error: "Internal error", detail: err.message }),
      };
    }
  }

  return { statusCode: 405, headers: CORS, body: "Method not allowed" };
};
