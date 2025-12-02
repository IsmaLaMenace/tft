
export default async function handler(req, res) {
  const API_KEY = process.env.RIOT_API_KEY;
  if (!API_KEY) return res.status(500).json({ error: "Missing RIOT_API_KEY" });

  const { region = "EUW", name } = req.query;
  if (!name) return res.status(400).json({ error: "Missing name" });

  const PLATFORM_MAP = {
    EUW: { platform: "euw1", region: "europe" },
    EUNE: { platform: "eun1", region: "europe" },
    NA: { platform: "na1", region: "americas" },
    KR: { platform: "kr", region: "asia" }
  };
  const { platform, region: matchRegion } =
    PLATFORM_MAP[region.toUpperCase()] || PLATFORM_MAP["EUW"];

  async function riot(url) {
    return fetch(url, { headers: { "X-Riot-Token": API_KEY } });
  }

  // Summoner
  const summR = await riot(
    `https://${platform}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(
      name
    )}`
  );
  if (!summR.ok)
    return res.status(summR.status).json({ error: "Summoner not found" });
  const summ = await summR.json();

  // Ranked TFT
  const rankR = await riot(
    `https://${platform}.api.riotgames.com/tft/league/v1/entries/by-summoner/${summ.id}`
  );
  const ranked = rankR.ok ? await rankR.json() : [];

  // Match IDs
  const matchesR = await riot(
    `https://${matchRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${summ.puuid}/ids?start=0&count=5`
  );
  const ids = matchesR.ok ? await matchesR.json() : [];

  const recent = [];
  for (const id of ids) {
    const mR = await riot(
      `https://${matchRegion}.api.riotgames.com/lol/match/v5/matches/${id}`
    );
    if (!mR.ok) continue;
    const m = await mR.json();
    const p = m.info.participants.find((x) => x.puuid === summ.puuid);
    recent.push({ matchId: id, placement: p?.placement || null });
  }

  res.status(200).json({
    summoner: { name: summ.name },
    ranked: ranked[0] || null,
    recentMatches: recent
  });
}
