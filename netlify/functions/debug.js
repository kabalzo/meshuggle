const BASE_URL = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN    = process.env.UPSTASH_REDIS_REST_TOKEN;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

exports.handler = async function (event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  const report = {
    has_url:   !!BASE_URL,
    has_token: !!TOKEN,
    url_prefix: BASE_URL ? BASE_URL.slice(0, 40) + "..." : null,
  };

  if (!BASE_URL || !TOKEN) {
    return {
      statusCode: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
      body: JSON.stringify({ ...report, error: "Missing env vars" }),
    };
  }

  // Try a simple PING via URL-path style
  try {
    const res = await fetch(`${BASE_URL}/ping`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const text = await res.text();
    report.ping_status = res.status;
    report.ping_body   = text;
  } catch (e) {
    report.ping_error = e.message;
  }

  // Try a simple SET via URL-path style
  try {
    const res = await fetch(`${BASE_URL}/set/meshuggle_test/hello`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const text = await res.text();
    report.set_status = res.status;
    report.set_body   = text;
  } catch (e) {
    report.set_error = e.message;
  }

  // Try a GET
  try {
    const res = await fetch(`${BASE_URL}/get/meshuggle_test`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    const text = await res.text();
    report.get_status = res.status;
    report.get_body   = text;
  } catch (e) {
    report.get_error = e.message;
  }

  return {
    statusCode: 200,
    headers: { ...CORS, "Content-Type": "application/json" },
    body: JSON.stringify(report, null, 2),
  };
};
