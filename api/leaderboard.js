import { kv } from "@vercel/kv";

/**
 * GET /api/leaderboard?limit=10&start=0
 * Returns a global Top-N, highest score first.
 * Works with the current score.js which stores:
 *   ZADD "lamumu:leaderboard" { score, member: <player name> }
 */
export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  try {
    const limit = Math.min(Number(req.query.limit ?? 10), 50); // cap for sanity
    const start = Math.max(Number(req.query.start ?? 0), 0);

    // Members only (highest first)
    const members = await kv.zrange("lamumu:leaderboard", start, start + limit - 1, {
      rev: true,
    });

    // Get scores for each member (small N; fine to zscore one-by-one)
    const scores = await Promise.all(
      members.map((m) => kv.zscore("lamumu:leaderboard", m))
    );

    const data = members.map((player, i) => ({
      player,
      score: Number(scores[i] ?? 0),
    }));

    return res.status(200).json({ ok: true, data });
  } catch (e) {
    console.error("Leaderboard error:", e);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
}
