import { kv } from "@vercel/kv";

/**
 * POST /api/score
 * Body: { name: string, score: number, streak: number }
 * Stores run as JSON in a sorted set ordered by score
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body || {};
    let { name, score, streak } = body;

    // basic validation / sanitation
    name = String(name || "anon-moo").slice(0, 24).replace(/[<>"'`]/g, "");
    score = Number(score || 0);
    streak = Number(streak || 0);

    if (!Number.isFinite(score) || score < 0 || score > 99999) {
      return res.status(400).json({ ok: false, error: "Invalid score" });
    }
    if (!Number.isFinite(streak) || streak < 0 || streak > 999) {
      return res.status(400).json({ ok: false, error: "Invalid streak" });
    }

    const item = {
      name,
      score,
      streak,
      date: new Date().toISOString().slice(0, 10)
    };

    // Use score as the ZSET score, store the JSON as member
    await kv.zadd("lamumu:scores", {
      score: item.score,
      member: JSON.stringify(item)
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
