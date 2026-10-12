/**
 * @file tests/index.test.ts
 * @desc Guild settings defaults, reading stored documents (bad ones fall back), patches (strict,
 *       partial, never mutating), track entries, the service contract, guild icon URLs, the
 *       card image contract and the tourney contract (role rules, guild links, harumin posts,
 *       role sync and the Register button).
 * @author David @dvhsh (https://dvh.sh)
 * @created Tue Oct 6, 2026
 * @modified Mon Oct 12, 2026
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
  guildRolesSchema,
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
  MAX_ROLE_RULES,
  MAX_ROLE_SYNC_CLAIM,
  manageableGuildsSchema,
  mapCardSchema,
  matchCostCardSchema,
  noticeCardSchema,
  notificationRouteSchema,
  poolCardSchema,
  profileCardSchema,
  readGuildSettings,
  readUserSettings,
  registrationButtonSchema,
  revalidateBodySchema,
  revalidateUserBodySchema,
  roleRuleSchema,
  roleRulesSchema,
  roleSyncAckBodySchema,
  roleSyncClaimAnswerSchema,
  roleSyncClaimBodySchema,
  roleSyncJobSchema,
  roleSyncRefreshBodySchema,
  SERVICE_ROUTES,
  scoreCardSchema,
  scoreListCardSchema,
  serverCardSchema,
  simulateCardSchema,
  TOURNEY_ROUTES,
  tourneyGuildSchema,
  tourneyLinkSchema,
  tourneyPostAnswerSchema,
  tourneyPostBodySchema,
  trackEntrySchema,
  tracksCardSchema,
} from "../src/index.js";

const GUILD = "123456789012345678";
const USER = "876543210987654321";

describe("guild settings", () => {
  it("defaults a new guild", () => {
    expect(defaultGuildSettings(GUILD)).toEqual({
      guildId: GUILD,
      autoEmbeds: { map: true, match: false, pack: true, pool: true, bb: false, replay: true },
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
      autoEmbeds: { map: false, match: false, pack: true, pool: true, bb: false, replay: true },
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
    expect(guildSettingsPatchSchema.parse({ autoEmbeds: { replay: false } }).autoEmbeds).toEqual({
      replay: false,
    });
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
        "DISCORD_USER_HEADER",
        "GRADES",
        "HARUMIN_COLLECTIONS",
        "MAX_CARD_ROWS",
        "MAX_LEADERBOARD_ROWS",
        "MAX_MATCH_ROWS",
        "MAX_NOTICE_LENGTH",
        "MAX_POOL_SLOTS",
        "MAX_ROLE_RULES",
        "MAX_ROLE_SYNC_CLAIM",
        "MAX_SERVER_ROWS",
        "MAX_TRACKED_PER_GUILD",
        "NOTICE_TONES",
        "POOL_CHECKS",
        "REGISTER_BUTTON_PREFIX",
        "ROLE_REVOKES",
        "ROLE_SYNC_ERRORS",
        "ROLE_SYNC_LEASE_SECONDS",
        "ROLE_TRIGGERS",
        "RULESETS",
        "SERVICE_ROUTES",
        "TOURNEY_ROUTES",
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
        "guildRolesSchema",
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
        "noticeCardSchema",
        "noticePartSchema",
        "notificationRouteSchema",
        "poolCardSchema",
        "profileCardSchema",
        "readGuildSettings",
        "readUserSettings",
        "registrationButtonSchema",
        "revalidateBodySchema",
        "revalidateUserBodySchema",
        "roleRuleSchema",
        "roleRulesSchema",
        "roleSyncAckBodySchema",
        "roleSyncClaimAnswerSchema",
        "roleSyncClaimBodySchema",
        "roleSyncJobSchema",
        "roleSyncRefreshBodySchema",
        "roleTriggerSchema",
        "rulesetSchema",
        "scoreCardSchema",
        "scoreListCardSchema",
        "scoreSessionSchema",
        "serverCardSchema",
        "simulateCardSchema",
        "snowflakeSchema",
        "tourneyEmbedSchema",
        "tourneyGuildSchema",
        "tourneyLinkSchema",
        "tourneyPostAnswerSchema",
        "tourneyPostBodySchema",
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
    for (const source of ["practice", "fromtop", "me"] as const)
      expect(poolCardSchema.parse({ ...pool, source }).source).toBe(source);
    const mine = { grade: "S", accuracy: 98.5, pp: 312.4 };
    const me = {
      ...pool,
      source: "me",
      slots: [
        { ...slot, mine },
        { ...slot, mine: null },
      ],
    };
    expect(poolCardSchema.parse(me)).toEqual(me);
    expect(
      poolCardSchema.safeParse({ ...me, slots: [{ ...slot, mine: { ...mine, accuracy: 101 } }] })
        .success,
    ).toBe(false);
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

  it("accepts notice cards up to 600 characters", () => {
    const notice = {
      tone: "error",
      parts: [
        { text: "Give a ", style: "plain" },
        { text: "score", style: "code" },
      ],
    };
    expect(noticeCardSchema.parse(notice)).toEqual(notice);
    expect(noticeCardSchema.safeParse({ ...notice, tone: "loud" }).success).toBe(false);
    expect(noticeCardSchema.safeParse({ tone: "ok", parts: [] }).success).toBe(false);
    expect(
      noticeCardSchema.safeParse({
        tone: "ok",
        parts: [
          { text: "x".repeat(400), style: "plain" },
          { text: "y".repeat(201), style: "bold" },
        ],
      }).success,
    ).toBe(false);
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

describe("tourney", () => {
  const G = "123456789012345678";
  const id = "a".repeat(24);
  const rule = {
    id,
    guildId: G,
    roleId: G,
    trigger: "approved",
    revoke: "onEditionDone",
    editionId: null,
  };
  /** Where each of a rule list's issues points: [rule index, field]. */
  const rulePaths = (rules: unknown) =>
    roleRulesSchema.safeParse(rules).error?.issues.map((issue) => issue.path);

  it("takes core, staff and team triggers on a role rule", () => {
    expect(roleRuleSchema.parse(rule)).toEqual(rule);
    for (const trigger of ["staffRole:referee", `staffRole:${id}`])
      expect(roleRuleSchema.parse({ ...rule, trigger }).trigger).toBe(trigger);
    expect(
      roleRuleSchema.parse({ ...rule, trigger: `onTeam:${id}`, editionId: id }).editionId,
    ).toBe(id);
    expect(roleRuleSchema.parse({ ...rule, trigger: "donated", revoke: "onRefund" }).revoke).toBe(
      "onRefund",
    );
  });

  it("refuses bad triggers and revokes, editionless team rules and onRefund off donated", () => {
    const refused = [
      { trigger: "onTeam:x", editionId: id },
      { trigger: `onTeam:${id}` },
      { revoke: "onRefund" },
      { trigger: "staffRole:" },
      { trigger: "everyone" },
      { revoke: "later" },
    ];
    for (const change of refused)
      expect(roleRuleSchema.safeParse({ ...rule, ...change }).success).toBe(false);
    expect(
      roleRuleSchema.safeParse({ ...rule, trigger: `onTeam:${id}` }).error?.issues,
    ).toMatchObject([{ path: ["editionId"], message: "A team rule names its edition." }]);
    expect(roleRuleSchema.safeParse({ ...rule, revoke: "onRefund" }).error?.issues).toMatchObject([
      { path: ["revoke"], message: "onRefund is only for donated." },
    ]);
    expect(roleRuleSchema.safeParse({ ...rule, trigger: "everyone" }).error?.issues).toMatchObject([
      { path: ["trigger"], message: "Not a role trigger." },
    ]);
  });

  it("caps a lineage at MAX_ROLE_RULES rules, one guild and one revoke per role", () => {
    const rules = Array.from({ length: MAX_ROLE_RULES + 1 }, (_, i) => ({
      ...rule,
      id: i.toString(16).padStart(24, "0"),
    }));
    expect(roleRulesSchema.safeParse(rules.slice(0, MAX_ROLE_RULES)).success).toBe(true);
    expect(roleRulesSchema.safeParse(rules).error?.issues).toMatchObject([
      { path: [], message: "A lineage has at most 25 role rules." },
    ]);
    const other = { ...rule, id: "b".repeat(24), trigger: "registered" };
    expect(roleRulesSchema.safeParse([rule, other]).success).toBe(true);
    expect(rulePaths([rule, { ...other, id }])).toEqual([[1, "id"]]);
    expect(
      rulePaths([
        { ...rule, revoke: "never" },
        { ...other, revoke: "onWithdraw" },
      ]),
    ).toEqual([[1, "revoke"]]);
    expect(rulePaths([rule, { ...other, guildId: "876543210987654321" }])).toEqual([
      [1, "guildId"],
    ]);
  });

  it("reads a stored guild link, linkedAt as a Date", () => {
    const link = tourneyLinkSchema.parse({
      lineageId: id,
      guildId: G,
      staffGuildId: null,
      enabled: true,
      nicknames: false,
      rules: [rule],
      linkedBy: G,
      linkedAt: "2026-10-12T00:00:00.000Z",
    });
    expect(link.linkedAt).toEqual(new Date("2026-10-12T00:00:00.000Z"));
    expect(link.rules).toEqual([rule]);
  });

  it("takes tourney's one-embed post, with or without a Register button", () => {
    const embed = {
      author: { name: "EGC 2026", url: "https://tourney.haruhime.moe/egc/egc2026" },
      title: "GF: result",
      url: "https://tourney.haruhime.moe/egc/egc2026/m/GF",
      description: "peppy **7** - **5** cookiezi",
      footer: { text: "tourney.haruhime.moe" },
      timestamp: "2026-10-12T00:00:00.000Z",
    };
    const message = { embeds: [embed], allowed_mentions: { parse: [] } };
    const body = { guildId: G, channelId: G, key: `${id}|${id}`, message, register: null };
    expect(tourneyPostBodySchema.parse(body)).toEqual(body);
    expect(tourneyPostBodySchema.parse({ ...body, register: { editionId: id } }).register).toEqual({
      editionId: id,
    });
    const { description: _, ...generic } = embed;
    const bare = { ...body, message: { ...message, embeds: [generic] } };
    expect(tourneyPostBodySchema.parse(bare)).toEqual(bare);
    const long = { description: "x".repeat(4096), footer: { text: "x".repeat(2048) } };
    const refused = [
      { ...body, message: { ...message, allowed_mentions: { parse: ["users"] } } },
      { ...body, message: { ...message, embeds: [embed, embed] } },
      { ...body, message: { ...message, embeds: [{ ...embed, title: "x".repeat(257) }] } },
      {
        ...body,
        message: { ...message, embeds: [{ ...embed, url: "http://tourney.haruhime.moe" }] },
      },
      { ...body, extra: 1 },
      { ...body, message: { ...message, content: "@everyone" } },
      { ...body, message: { ...message, embeds: [{ ...embed, ...long }] } },
    ];
    for (const post of refused) expect(tourneyPostBodySchema.safeParse(post).success).toBe(false);
  });

  it("takes role-sync claims, jobs, acks and refreshes", () => {
    expect(roleSyncClaimBodySchema.parse({})).toEqual({ limit: MAX_ROLE_SYNC_CLAIM });
    expect(roleSyncClaimBodySchema.safeParse({ limit: 0 }).success).toBe(false);
    const job = { id, version: 1, guildId: G, discordId: G, add: [G], remove: [], nick: "peppy" };
    expect(roleSyncClaimAnswerSchema.parse({ jobs: [job] })).toEqual({ jobs: [job] });
    expect(
      roleSyncJobSchema.safeParse({ ...job, add: Array(MAX_ROLE_RULES + 1).fill(G) }).success,
    ).toBe(false);
    const applied = { id, version: 1, outcome: "applied" };
    const failed = {
      id,
      version: 2,
      outcome: "failed",
      error: "rate-limited",
      retryAfterSeconds: 30,
    };
    const results = [
      applied,
      { id, version: 1, outcome: "skipped", reason: "not-in-guild" },
      failed,
      { ...failed, error: "role-too-high", retryAfterSeconds: null },
    ];
    expect(roleSyncAckBodySchema.parse({ results })).toEqual({ results });
    for (const refused of [
      [{ ...failed, error: "nope" }],
      Array(MAX_ROLE_SYNC_CLAIM + 1).fill(applied),
      [{ id, version: 1, outcome: "skipped" }],
      [],
    ])
      expect(roleSyncAckBodySchema.safeParse({ results: refused }).success).toBe(false);
    const refresh = { guildId: G, discordId: G };
    expect(roleSyncRefreshBodySchema.parse(refresh)).toEqual(refresh);
    expect(roleSyncRefreshBodySchema.safeParse({ ...refresh, extra: 1 }).success).toBe(false);
  });

  it("parses guild roles, refusing a color past 0xffffff", () => {
    const role = { id: G, name: "Player", color: 0xff66aa, position: 3, assignable: true };
    const roles = { roles: [role], manageRoles: true, manageNicknames: false };
    expect(guildRolesSchema.parse(roles)).toEqual(roles);
    expect(
      guildRolesSchema.safeParse({ ...roles, roles: [{ ...role, color: 0x1000000 }] }).success,
    ).toBe(false);
  });

  it("parses linked guilds, a post's route and its answer, refusing bad ids", () => {
    const edition = { id, slug: "egc2026", name: "Evergreen Cup 2026", phase: "registration" };
    const link = {
      lineage: { id, slug: "egc", name: "Evergreen Cup" },
      slot: "main",
      enabled: true,
      editions: [edition],
    };
    expect(tourneyGuildSchema.parse({ links: [link] })).toEqual({ links: [link] });
    expect(
      tourneyGuildSchema.safeParse({ links: [{ ...link, editions: [{ ...edition, id: "A1" }] }] })
        .success,
    ).toBe(false);
    const route = { guildId: G, channelId: G };
    expect(notificationRouteSchema.parse(route)).toEqual(route);
    expect(notificationRouteSchema.safeParse({ ...route, channelId: "general" }).success).toBe(
      false,
    );
    expect(tourneyPostAnswerSchema.parse({ messageId: G })).toEqual({ messageId: G });
    expect(tourneyPostAnswerSchema.safeParse({ messageId: "42" }).success).toBe(false);
  });

  it("parses each Register button outcome", () => {
    for (const button of [
      { outcome: "one-click", lineage: "egc", edition: "egc2026" },
      { outcome: "form", url: "https://tourney.haruhime.moe/egc/egc2026/register" },
      { outcome: "link-account", url: "https://www.haruhime.moe/account" },
      {
        outcome: "refused",
        code: "discord-paused",
        message: "Discord is off for this tournament.",
      },
    ])
      expect(registrationButtonSchema.parse(button)).toEqual(button);
  });

  it("keeps tourney's routes under /api/harumin/ and adds the bot's roles route", () => {
    for (const path of Object.values(TOURNEY_ROUTES))
      expect(path.startsWith("/api/harumin/")).toBe(true);
    expect(SERVICE_ROUTES.guildRoles).toBe("/guilds/:guildId/roles");
  });
});
