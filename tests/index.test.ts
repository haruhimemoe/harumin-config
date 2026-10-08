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
  CARD_LAYOUT,
  DEFAULT_AUTO_EMBEDS,
  defaultGuildSettings,
  guildIconUrl,
  guildSettingsPatchSchema,
  MAX_CARD_ROWS,
  manageableGuildsSchema,
  profileCardSchema,
  readGuildSettings,
  revalidateBodySchema,
  scoreCardSchema,
  scoreListCardSchema,
  trackEntrySchema,
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
        "CARD_LAYOUT",
        "CARD_ROUTES",
        "DEFAULT_AUTO_EMBEDS",
        "GRADES",
        "HARUMIN_COLLECTIONS",
        "MAX_CARD_ROWS",
        "MAX_TRACKED_PER_GUILD",
        "RULESETS",
        "SERVICE_ROUTES",
        "applyGuildSettingsPatch",
        "cardMapSchema",
        "cardPlayerSchema",
        "cardScoreSchema",
        "defaultGuildSettings",
        "guildChannelsSchema",
        "guildIconUrl",
        "guildSettingsPatchSchema",
        "guildSettingsSchema",
        "manageableGuildSchema",
        "manageableGuildsSchema",
        "profileCardSchema",
        "readGuildSettings",
        "revalidateBodySchema",
        "rulesetSchema",
        "scoreCardSchema",
        "scoreListCardSchema",
        "snowflakeSchema",
        "trackEntrySchema",
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
});
