import { kv } from "@vercel/kv";

/**
 * GET /api/leaderboard
 * Returns top 10 runs (sorted by score desc; tie-breaker: streak)
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // We store runs as JSON strings in a sorted set keyed by score.
    // zrange with rev:true returns highest scores first.
    const members = await kv.zrange("lamumu:scores", 0, 9, {
      byScore: true,
      rev: true
    });

    // members may be strings or objects depending on SDK version.
    // We’ll JSON.parse when needed and normalize output.
    const top = members.map(m => {
      try { return typeof m === "string" ? JSON.parse(m) : m; }
      catch { return m; }
    });

    return res.status(200).json({ ok: true, data: top });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
