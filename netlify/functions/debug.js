const BASE_URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN    = process.env.UPSTASH_REDIS_REST_TOKEN;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

async function redisGet(path) {
  const url = `${BASE_URL}/${path}?_token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url);
  return { status: res.status, body: await res.text() };
}

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const report = {
    has_url: !!BASE_URL,
    has_token: !!TOKEN,
    url_prefix: BASE_URL ? BASE_URL.slice(0, 40) + "..." : null,
  };

  if (!BASE_URL || !TOKEN) {
    return { statusCode: 200, headers: { ...CORS, "Content-Type": "application/json" }, body: JSON.stringify({ ...report, error: "Missing env vars" }) };
  }

  try { const r = await redisGet("ping"); report.ping_status = r.status; report.ping_body = r.body; } catch(e) { report.ping_error = e.message; }
  try { const r = await redisGet("set/meshuggle_test/hello"); report.set_status = r.status; report.set_body = r.body; } catch(e) { report.set_error = e.message; }
  try { const r = await redisGet("get/meshuggle_test"); report.get_status = r.status; report.get_body = r.body; } catch(e) { report.get_error = e.message; }

  return {
    statusCode: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify(report, null, 2),
  };
};
