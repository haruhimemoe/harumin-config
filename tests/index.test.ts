/**
 * @file tests/index.test.ts
 * @desc Guild settings defaults, reading stored documents (bad ones fall back), patches (strict,
 *       partial, never mutating), track entries, the service contract, guild icon URLs and the
 *       card image contract.
 * @author David @dvhsh (https://dvh.sh)
 * @created Tue Oct 6, 2026
 * @modified Wed Oct 7, 2026
 */

import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";
import {
  AUTO_EMBED_KEYS,
  AUTO_EMBED_LABELS,
  applyGuildSettingsPatch,
  bbCardSchema,
  CARD_ACCENTS,
  CARD_LAYOUT,
  compareCardSchema,
  DEFAULT_AUTO_EMBEDS,
  defaultGuildSettings,
  guildIconUrl,
  guildSettingsPatchSchema,
  HARUMIN_COLLECTIONS,
  infoCardSchema,
  inviteCardSchema,
  leaderboardCardSchema,
  linkCardSchema,
  MAX_CARD_ROWS,
  MAX_LEADERBOARD_ROWS,
  MAX_MATCH_ROWS,
  MAX_POOL_SLOTS,
  manageableGuildsSchema,
  mapCardSchema,
  matchCostCardSchema,
  poolCardSchema,
  profileCardSchema,
  readGuildSettings,
  readUserSettings,
  revalidateBodySchema,
  revalidateUserBodySchema,
  SERVICE_ROUTES,
  scoreCardSchema,
  scoreListCardSchema,
  serverCardSchema,
  simulateCardSchema,
  trackEntrySchema,
  tracksCardSchema,
} from "../src/index.js";

const GUILD = "123456789012345678";
const USER = "876543210987654321";

describe("guild settings", () => {
  it("defaults a new guild", () => {
    expect(defaultGuildSettings(GUILD)).toEqual({
      guildId: GUILD,
      autoEmbeds: { map: true, match: false, pack: true, pool: true, bb: false },
      defaultMode: null,
    });
    expect(() => defaultGuildSettings("nope")).toThrow();
  });

  it("labels every auto-embed and freezes the defaults", () => {
    expect(Object.keys(AUTO_EMBED_LABELS)).toEqual([...AUTO_EMBED_KEYS]);
    expect(Object.isFrozen(DEFAULT_AUTO_EMBEDS)).toBe(true);
  });

  it("reads stored settings, filling missing fields", () => {
    const read = readGuildSettings(GUILD, {
      _id: "x",
      guildId: GUILD,
      autoEmbeds: { map: false },
      defaultMode: "mania",
    });
    expect(read).toEqual({
      guildId: GUILD,
      autoEmbeds: { map: false, match: false, pack: true, pool: true, bb: false },
      defaultMode: "mania",
    });
  });

  it("falls back to defaults for nothing, junk, or another guild's document", () => {
    const fallback = defaultGuildSettings(GUILD);
    expect(readGuildSettings(GUILD, null)).toEqual(fallback);
    expect(readGuildSettings(GUILD, undefined)).toEqual(fallback);
    expect(readGuildSettings(GUILD, { guildId: GUILD, defaultMode: "std" })).toEqual(fallback);
    expect(readGuildSettings(GUILD, { guildId: USER })).toEqual(fallback);
  });

  it("applies a patch without touching the original", () => {
    const current = defaultGuildSettings(GUILD);
    const now = new Date("2026-10-06T00:00:00Z");
    const patch = guildSettingsPatchSchema.parse({ autoEmbeds: { bb: true } });
    const next = applyGuildSettingsPatch(current, patch, USER, now);
    expect(next.autoEmbeds).toEqual({ ...DEFAULT_AUTO_EMBEDS, bb: true });
    expect(next.defaultMode).toBeNull();
    expect(next.updatedAt).toBe(now);
    expect(next.updatedBy).toBe(USER);
    expect(current.autoEmbeds.bb).toBe(false);
    const cleared = applyGuildSettingsPatch(
      { ...current, defaultMode: "osu" },
      { defaultMode: null },
      USER,
    );
    expect(cleared.defaultMode).toBeNull();
    expect(cleared.updatedAt).toBeInstanceOf(Date);
  });

  it("refuses unknown patch keys", () => {
    expect(guildSettingsPatchSchema.safeParse({ guildId: GUILD }).success).toBe(false);
    expect(guildSettingsPatchSchema.safeParse({ autoEmbeds: { spam: true } }).success).toBe(false);
    expect(guildSettingsPatchSchema.safeParse({ defaultMode: "std" }).success).toBe(false);
  });
});

describe("tracks and the service contract", () => {
  it("parses a track entry", () => {
    const entry = trackEntrySchema.parse({
      guildId: GUILD,
      channelId: GUILD,
      osuId: 2,
      username: "peppy",
      mode: "osu",
      addedBy: USER,
      addedAt: "2026-10-06T00:00:00Z",
    });
    expect(entry.addedAt).toBeInstanceOf(Date);
    expect(trackEntrySchema.safeParse({ ...entry, osuId: 0 }).success).toBe(false);
  });

  it("parses the bot's answers and the revalidate body", () => {
    expect(
      manageableGuildsSchema.parse({ guilds: [{ id: GUILD, name: "osu!", icon: null }] }).guilds,
    ).toHaveLength(1);
    expect(revalidateBodySchema.safeParse({ guildId: GUILD, extra: 1 }).success).toBe(false);
  });

  it("builds guild icon URLs", () => {
    expect(guildIconUrl({ id: GUILD, icon: null })).toBeNull();
    expect(guildIconUrl({ id: GUILD, icon: "abc" })).toBe(
      `https://cdn.discordapp.com/icons/${GUILD}/abc.png?size=128`,
    );
    expect(guildIconUrl({ id: GUILD, icon: "a_abc" }, 64)).toBe(
      `https://cdn.discordapp.com/icons/${GUILD}/a_abc.gif?size=64`,
    );
  });

  it("exports the documented API", () => {
    expect(Object.keys(api).sort()).toMatchInlineSnapshot(`
      [
        "AUTO_EMBED_KEYS",
        "AUTO_EMBED_LABELS",
        "CARD_ACCENTS",
        "CARD_COVERS",
        "CARD_LAYOUT",
        "CARD_ROUTES",
        "DEFAULT_AUTO_EMBEDS",
        "GRADES",
        "HARUMIN_COLLECTIONS",
        "MAX_CARD_ROWS",
        "MAX_LEADERBOARD_ROWS",
        "MAX_MATCH_ROWS",
        "MAX_POOL_SLOTS",
        "MAX_SERVER_ROWS",
        "MAX_TRACKED_PER_GUILD",
        "POOL_CHECKS",
        "RULESETS",
        "SERVICE_ROUTES",
        "applyGuildSettingsPatch",
        "bbCardSchema",
        "cardMapSchema",
        "cardPlayerSchema",
        "cardScoreSchema",
        "cardThemeSchema",
        "compareCardSchema",
        "compareSideSchema",
        "defaultGuildSettings",
        "guildChannelsSchema",
        "guildIconUrl",
        "guildSettingsPatchSchema",
        "guildSettingsSchema",
        "infoCardSchema",
        "inviteCardSchema",
        "leaderboardCardSchema",
        "linkCardSchema",
        "manageableGuildSchema",
        "manageableGuildsSchema",
        "mapCardSchema",
        "matchCostCardSchema",
        "poolCardSchema",
        "profileCardSchema",
        "readGuildSettings",
        "readUserSettings",
        "revalidateBodySchema",
        "revalidateUserBodySchema",
        "rulesetSchema",
        "scoreCardSchema",
        "scoreListCardSchema",
        "scoreSessionSchema",
        "serverCardSchema",
        "simulateCardSchema",
        "snowflakeSchema",
        "trackEntrySchema",
        "tracksCardSchema",
        "userSettingsSchema",
      ]
    `);
  });
});

const PLAYER = {
  osuId: 2,
  username: "peppy",
  countryCode: "AU",
  coverUrl: "https://assets.ppy.sh/user-profile-covers/2/abc.jpeg",
  supporter: true,
  pp: 1234.5,
  globalRank: 5678,
  countryRank: 90,
};

const SCORE = {
  map: {
    beatmapId: 75,
    beatmapsetId: 1,
    artist: "Kenji Ninuma",
    title: "DISCO PRINCE",
    version: "Normal",
    stars: 2.55,
  },
  grade: "S",
  mods: ["HD", "DT"],
  pp: 120.4,
  ppApprox: false,
  fcPp: null,
  fcAccuracy: null,
  accuracy: 98.5,
  totalScore: 1_000_000,
  combo: 314,
  mapMaxCombo: 314,
  hits: [
    { label: "300", count: 200 },
    { label: "miss", count: 0 },
  ],
  passed: true,
  completion: null,
  endedAt: "2026-10-07T12:00:00Z",
};

describe("user settings", () => {
  it("reads defaults for a missing or bad doc", () => {
    const fallback = { osuId: 2, accent: "rose", cover: "profile", favoriteBeatmapId: null };
    expect(readUserSettings(2, null)).toEqual(fallback);
    expect(readUserSettings(2, { osuId: 2, accent: "lime" })).toEqual(fallback);
    expect(readUserSettings(2, { osuId: 3, accent: "sky" })).toEqual(fallback);
    expect(readUserSettings(2, { osuId: 2, accent: "sky", favoriteBeatmapId: 129891 })).toEqual({
      ...fallback,
      accent: "sky",
      favoriteBeatmapId: 129891,
    });
    expect(CARD_ACCENTS).toHaveLength(8);
    expect(CARD_ACCENTS[0]).toBe("rose");
    expect(HARUMIN_COLLECTIONS.userSettings).toBe("user_settings");
    expect(SERVICE_ROUTES.revalidateUser).toBe("/users/revalidate");
    expect(revalidateUserBodySchema.safeParse({ osuId: 2 }).success).toBe(true);
    expect(revalidateUserBodySchema.safeParse({ osuId: "2" }).success).toBe(false);
  });
});

describe("card images", () => {
  it("accepts a profile card", () => {
    const card = {
      ruleset: "osu",
      player: PLAYER,
      accuracy: 98.12,
      level: 100.5,
      playCount: 10,
      playTime: 3600,
      maxCombo: 1000,
      rankedScore: 1,
      grades: { ssh: 1, ss: 2, sh: 3, s: 4, a: 5 },
      joinDate: "2007-08-28T03:09:12+00:00",
    };
    expect(profileCardSchema.parse(card)).toEqual({ ...card, cover: "image" });
    expect(profileCardSchema.parse({ ...card, cover: "hole" }).cover).toBe("hole");
    expect(profileCardSchema.safeParse({ ...card, cover: "gif" }).success).toBe(false);
    expect(profileCardSchema.parse(card).theme).toBeUndefined();
    const theme = {
      accent: "sky",
      favorite: { title: "xi - FREEDOM DiVE", pp: 727, mods: ["HD"] },
    };
    expect(profileCardSchema.parse({ ...card, theme }).theme).toEqual(theme);
    expect(
      profileCardSchema.parse({ ...card, theme: { accent: "mint", favorite: null } }).theme
        ?.favorite,
    ).toBeNull();
    expect(
      profileCardSchema.safeParse({ ...card, theme: { accent: "lime", favorite: null } }).success,
    ).toBe(false);
  });

  it("puts the profile cover inside the card", () => {
    const { width, height, cover } = CARD_LAYOUT.profile;
    expect(cover.x + cover.width).toBeLessThanOrEqual(width);
    expect(cover.y + cover.height).toBeLessThanOrEqual(height);
  });

  it("only lets the renderer fetch assets.ppy.sh", () => {
    const card = { ruleset: "osu", player: { ...PLAYER, coverUrl: "http://169.254.169.254/" } };
    expect(profileCardSchema.safeParse(card).success).toBe(false);
    expect(
      scoreCardSchema.safeParse({
        ruleset: "osu",
        player: { ...PLAYER, coverUrl: "https://assets.ppy.sh.evil.example/x.png" },
        heading: "Most recent play",
        score: SCORE,
        tries: null,
      }).success,
    ).toBe(false);
  });

  it("accepts a score card and rejects a made-up grade or mod", () => {
    const card = {
      ruleset: "osu",
      player: PLAYER,
      heading: "Most recent play",
      score: SCORE,
      tries: 3,
    };
    expect(scoreCardSchema.parse(card)).toEqual(card);
    expect(scoreCardSchema.safeParse({ ...card, score: { ...SCORE, grade: "Z" } }).success).toBe(
      false,
    );
    expect(scoreCardSchema.safeParse({ ...card, score: { ...SCORE, mods: ["<b>"] } }).success).toBe(
      false,
    );
  });

  it("takes an optional session on the score card", () => {
    const card = {
      ruleset: "osu",
      player: PLAYER,
      heading: "Most recent play",
      score: SCORE,
      tries: null,
    };
    expect(scoreCardSchema.parse(card).session).toBeUndefined();
    const withSession = scoreCardSchema.parse({
      ...card,
      session: { today: 23, note: "best of 23" },
    });
    expect(withSession.session).toEqual({ today: 23, note: "best of 23" });
    expect(scoreCardSchema.safeParse({ ...card, session: { today: 0, note: null } }).success).toBe(
      false,
    );
  });

  it("caps a list card at MAX_CARD_ROWS rows", () => {
    const rows = Array.from({ length: MAX_CARD_ROWS + 1 }, (_, i) => ({
      place: i + 1,
      score: SCORE,
    }));
    const card = {
      ruleset: "osu",
      player: PLAYER,
      title: "Top plays",
      note: null,
      page: 1,
      pages: 2,
    };
    expect(
      scoreListCardSchema.safeParse({ ...card, rows: rows.slice(0, MAX_CARD_ROWS) }).success,
    ).toBe(true);
    expect(scoreListCardSchema.safeParse({ ...card, rows }).success).toBe(false);
  });

  it("accepts a map card, with null AR and OD for mania", () => {
    const card = {
      ruleset: "mania",
      map: { ...SCORE.map, creator: "peppy", status: "ranked" },
      mods: [],
      cs: 4,
      ar: null,
      od: null,
      hp: 8,
      lengthSeconds: 90,
      bpm: 180,
      maxCombo: null,
      pps: [{ accuracy: 95, pp: 100 }],
    };
    expect(mapCardSchema.parse(card)).toEqual(card);
    expect(mapCardSchema.safeParse({ ...card, pps: [{ accuracy: 101, pp: 1 }] }).success).toBe(
      false,
    );
  });

  it("caps a leaderboard card at MAX_LEADERBOARD_ROWS rows", () => {
    const rows = Array.from({ length: MAX_LEADERBOARD_ROWS + 1 }, (_, i) => ({
      place: i + 1,
      osuId: 2,
      username: "peppy",
      countryCode: "AU",
      grade: "S",
      mods: ["HD"],
      pp: 100,
      accuracy: 99,
      combo: 300,
      totalScore: 1,
    }));
    const card = { map: SCORE.map, filter: null, page: 1, pages: 10 };
    expect(
      leaderboardCardSchema.safeParse({ ...card, rows: rows.slice(0, MAX_LEADERBOARD_ROWS) })
        .success,
    ).toBe(true);
    expect(leaderboardCardSchema.safeParse({ ...card, rows }).success).toBe(false);
  });

  it("accepts simulate and compare cards", () => {
    const simulate = {
      ruleset: "osu",
      map: SCORE.map,
      mods: ["HD"],
      accuracy: 98,
      combo: 300,
      mapMaxCombo: 314,
      misses: 1,
      pp: 150,
    };
    expect(simulateCardSchema.parse(simulate)).toEqual(simulate);
    const side = {
      player: PLAYER,
      accuracy: 98,
      playCount: 1,
      playTime: 60,
      maxCombo: 100,
      ssCount: 2,
      topPp: null,
    };
    const compare = { ruleset: "osu", a: side, b: side };
    expect(compareCardSchema.parse(compare)).toEqual(compare);
    expect(compareCardSchema.safeParse({ ...compare, b: { ...side, accuracy: -1 } }).success).toBe(
      false,
    );
  });

  it("accepts match, pool, server, tracks and bb cards", () => {
    const row = { place: 1, osuId: 2, username: "a", countryCode: "JP", team: "red", cost: 1.2 };
    const match = {
      name: "OWC: (JP) vs (US)",
      formula: "bathbot",
      note: null,
      teams: { red: 5, blue: 3 },
      games: 8,
      rows: [row],
      more: 0,
    };
    expect(matchCostCardSchema.parse(match)).toEqual(match);
    expect(
      matchCostCardSchema.safeParse({ ...match, rows: Array(MAX_MATCH_ROWS + 1).fill(row) })
        .success,
    ).toBe(false);

    const slot = {
      label: "NM1",
      mod: "NM",
      title: "a - b [c]",
      beatmapId: 1,
      stars: 5.2,
      lengthSeconds: 120,
      check: null,
    };
    const pool = {
      source: "check",
      name: "x",
      subtitle: null,
      mapCount: 1,
      stars: { min: 5.2, max: 5.2 },
      slots: [{ ...slot, check: "potential" }],
      note: null,
    };
    expect(poolCardSchema.parse(pool)).toEqual(pool);
    expect(
      poolCardSchema.safeParse({ ...pool, slots: Array(MAX_POOL_SLOTS + 1).fill(slot) }).success,
    ).toBe(false);

    const server = {
      guild: { id: GUILD, name: "osu!", icon: "a_0123456789abcdef0123456789abcdef" },
      ruleset: "osu",
      stat: "pp",
      total: 1,
      page: 1,
      pages: 1,
      rows: [{ place: 1, osuId: 2, username: "a", countryCode: null, value: "1pp" }],
    };
    expect(serverCardSchema.parse(server)).toEqual(server);
    expect(
      serverCardSchema.safeParse({ ...server, guild: { ...server.guild, icon: "../x" } }).success,
    ).toBe(false);

    const tracks = { max: 25, rows: [{ osuId: 2, username: "a", ruleset: "mania", channel: "x" }] };
    expect(tracksCardSchema.parse(tracks)).toEqual(tracks);
    expect(bbCardSchema.parse({ templateId: "abc_1", name: null }).templateId).toBe("abc_1");
    expect(bbCardSchema.safeParse({ templateId: "../x", name: null }).success).toBe(false);
  });

  it("accepts info, link and invite cards", () => {
    const info = { version: "1.0.0", guilds: 12, uptimeSeconds: 3600, pingMs: 40 };
    expect(infoCardSchema.parse(info)).toEqual(info);
    expect(infoCardSchema.safeParse({ ...info, pingMs: -1 }).success).toBe(false);
    expect(linkCardSchema.parse({ account: null })).toEqual({ account: null });
    expect(linkCardSchema.parse({ account: { osuId: 2, username: "peppy" } }).account?.osuId).toBe(
      2,
    );
    expect(inviteCardSchema.parse({ guilds: 3 })).toEqual({ guilds: 3 });
  });
});
