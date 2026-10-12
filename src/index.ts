/**
 * @file src/index.ts
 * @desc @haruhimemoe/harumin-config: what the harumin bot and harumin.haruhime.moe agree on. A
 *       guild's settings (which links the bot answers with a card, the default ruleset), the
 *       /track entries, the collection names both read, and the bot's service routes the site
 *       calls (which guilds a Discord user can manage, and dropping a guild's cached settings),
 *       and the cards the bot asks the site to draw as images (/osu, /recent, /top). Also what
 *       harumin and tourney.haruhime.moe agree on: a lineage's guild link and role rules, the
 *       posts tourney asks harumin to make, the role-sync jobs harumin claims and acks, the
 *       Register button, the drafts harumin mirrors and the picks captains make there, and the
 *       guilds role rules name. zod only, no I/O.
 * @author David @dvhsh (https://dvh.sh)
 * @created Tue Oct 6, 2026
 * @modified Mon Oct 12, 2026
 */

import { z } from "zod";

/** A Discord id: 17 to 20 digits. */
export const snowflakeSchema = z.string().regex(/^\d{17,20}$/, "Not a Discord id.");

/** osu!'s four rulesets, as the osu! API names them. */
export const RULESETS = ["osu", "taiko", "fruits", "mania"] as const;
/** One of RULESETS. */
export type Ruleset = (typeof RULESETS)[number];
/** Accepts exactly the RULESETS names. */
export const rulesetSchema = z.enum(RULESETS);

/** The link types the bot can answer with a card, in the order the dashboard lists them. */
export const AUTO_EMBED_KEYS = ["map", "match", "pack", "pool", "bb", "replay"] as const;
/** One of AUTO_EMBED_KEYS. */
export type AutoEmbedKey = (typeof AUTO_EMBED_KEYS)[number];

/** Each link type on or off. */
export type AutoEmbeds = Record<AutoEmbedKey, boolean>;

/** A new guild's cards: beatmaps, packs, pools and replays on; match and bb links off. */
export const DEFAULT_AUTO_EMBEDS: Readonly<AutoEmbeds> = Object.freeze({
  map: true,
  match: false,
  pack: true,
  pool: true,
  bb: false,
  replay: true,
});

/** What each auto-embed does, for the dashboard and /help. */
export const AUTO_EMBED_LABELS: Readonly<Record<AutoEmbedKey, { name: string; line: string }>> =
  Object.freeze({
    map: { name: "Beatmaps", line: "osu.ppy.sh beatmap links get a map card." },
    match: { name: "Matches", line: "Multiplayer match links get a summary with match costs." },
    pack: { name: "Packs", line: "packs.haruhime.moe links get a pack card." },
    pool: { name: "Pools", line: "pools.haruhime.moe links get a pool card." },
    bb: { name: "BBCode", line: "bb.haruhime.moe links get a small preview." },
    replay: { name: "Replays", line: ".osr files get a score card and a render button." },
  });

const autoEmbedsSchema = z.object({
  map: z.boolean().default(DEFAULT_AUTO_EMBEDS.map),
  match: z.boolean().default(DEFAULT_AUTO_EMBEDS.match),
  pack: z.boolean().default(DEFAULT_AUTO_EMBEDS.pack),
  pool: z.boolean().default(DEFAULT_AUTO_EMBEDS.pool),
  bb: z.boolean().default(DEFAULT_AUTO_EMBEDS.bb),
  replay: z.boolean().default(DEFAULT_AUTO_EMBEDS.replay),
});

/**
 * One guild's settings as stored. Missing fields take the defaults, so a guild nobody configured
 * reads as defaultGuildSettings(guildId). Unknown keys are stripped.
 */
export const guildSettingsSchema = z.object({
  guildId: snowflakeSchema,
  autoEmbeds: autoEmbedsSchema.default({ ...DEFAULT_AUTO_EMBEDS }),
  /** The ruleset commands use when nobody picks one and the player has no main mode. */
  defaultMode: rulesetSchema.nullable().default(null),
  updatedAt: z.coerce.date().optional(),
  /** Discord id of whoever saved last. */
  updatedBy: snowflakeSchema.optional(),
});

/** One guild's settings. */
export type GuildSettings = z.infer<typeof guildSettingsSchema>;

/** What the dashboard may change: any subset of the cards, and the default ruleset. */
export const guildSettingsPatchSchema = z
  .object({
    autoEmbeds: z
      .object({
        map: z.boolean(),
        match: z.boolean(),
        pack: z.boolean(),
        pool: z.boolean(),
        bb: z.boolean(),
        replay: z.boolean(),
      })
      .partial()
      .strict()
      .optional(),
    defaultMode: rulesetSchema.nullable().optional(),
  })
  .strict();

/** A change from the dashboard. */
export type GuildSettingsPatch = z.infer<typeof guildSettingsPatchSchema>;

/**
 * @function defaultGuildSettings
 * @param guildId {string} the guild's Discord id
 * @returns {GuildSettings} the settings a guild has before anyone changes them
 * @throws {z.ZodError} when guildId isn't a Discord id
 */
export const defaultGuildSettings = (guildId: string): GuildSettings =>
  guildSettingsSchema.parse({ guildId });

/**
 * @function readGuildSettings
 * @param guildId {string} the guild asked about
 * @param stored {unknown} the stored document, or null when there is none
 * @returns {GuildSettings} the stored settings with defaults filled in; the defaults when nothing
 *          is stored or the document doesn't parse (a bad document never breaks the bot)
 */
export const readGuildSettings = (guildId: string, stored: unknown): GuildSettings => {
  if (stored === null || stored === undefined) return defaultGuildSettings(guildId);
  const parsed = guildSettingsSchema.safeParse(stored);
  return parsed.success && parsed.data.guildId === guildId
    ? parsed.data
    : defaultGuildSettings(guildId);
};

const mergeAutoEmbeds = (
  current: AutoEmbeds,
  change: Partial<Record<AutoEmbedKey, boolean | undefined>> | undefined,
): AutoEmbeds => {
  const next = { ...current };
  for (const key of AUTO_EMBED_KEYS) {
    const value = change?.[key];
    if (value !== undefined) next[key] = value;
  }
  return next;
};

/**
 * @function applyGuildSettingsPatch
 * @param current {GuildSettings} the guild's settings now
 * @param patch {GuildSettingsPatch} a parsed change
 * @param by {string} Discord id of whoever saved
 * @param now {Date} when (tests pass a fixed date)
 * @returns {GuildSettings} new settings; `current` is not changed
 */
export const applyGuildSettingsPatch = (
  current: GuildSettings,
  patch: GuildSettingsPatch,
  by: string,
  now: Date = new Date(),
): GuildSettings => ({
  ...current,
  autoEmbeds: mergeAutoEmbeds(current.autoEmbeds, patch.autoEmbeds),
  defaultMode: patch.defaultMode === undefined ? current.defaultMode : patch.defaultMode,
  updatedAt: now,
  updatedBy: by,
});

/** The most osu! players one guild can track. */
export const MAX_TRACKED_PER_GUILD = 25;

/** One /track entry: post this player's new top plays in this channel. */
export const trackEntrySchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
  osuId: z.number().int().positive(),
  /** The name when it was added, for lists; osu! ids never change, names do. */
  username: z.string().min(1).max(32),
  mode: rulesetSchema,
  addedBy: snowflakeSchema,
  addedAt: z.coerce.date(),
});

/** One /track entry. */
export type TrackEntry = z.infer<typeof trackEntrySchema>;

/** The MongoDB collections in harumin's database. */
export const HARUMIN_COLLECTIONS = Object.freeze({
  guildSettings: "guild_settings",
  tracks: "tracks",
  trackState: "track_state",
  members: "guild_members",
  /** One doc per osu! account: card accent, cover and favorite map (userSettingsSchema). */
  userSettings: "user_settings",
  /** The bot's draft mirrors, one per edition: the channel it shows a tourney draft in. */
  tourneyDrafts: "tourney_drafts",
} as const);

/**
 * The bot's service routes, under its SERVICE_URL, bearer HARUMIN_SERVICE_TOKEN. The dashboard
 * calls them, and tourney.haruhime.moe calls manageableGuilds, guildChannels, guildRoles and
 * tourneyPost with the same token.
 */
export const SERVICE_ROUTES = Object.freeze({
  /** GET ?discordId= → ManageableGuilds. */
  manageableGuilds: "/guilds/manageable",
  /** GET /guilds/{id}/channels → GuildChannels (text channels the bot can post in). */
  guildChannels: "/guilds/:guildId/channels",
  /** POST { guildId } → 204. The bot drops its cached settings for that guild. */
  revalidate: "/settings/revalidate",
  /** POST { osuId } → 204. The bot drops its cached card settings and profile for that player. */
  revalidateUser: "/users/revalidate",
  /**
   * GET /guilds/{id}/roles → GuildRoles: the guild's roles and what harumin may do with them, for
   * tourney's role rules. 404 when harumin isn't in that guild.
   */
  guildRoles: "/guilds/:guildId/roles",
  /**
   * POST TourneyPostBody → 200 TourneyPostAnswer: harumin posts tourney's embed in that channel.
   * 400 for a body that doesn't parse, 403 when harumin can't post there, 404 for an unknown
   * channel, 429 with Retry-After (seconds) while Discord limits it, 5xx when Discord failed.
   */
  tourneyPost: "/tourney/post",
} as const);

/** One guild in the dashboard's picker. */
export const manageableGuildSchema = z.object({
  id: snowflakeSchema,
  name: z.string(),
  /** Discord's icon hash, or null. */
  icon: z.string().nullable(),
});

/** One guild in the dashboard's picker. */
export type ManageableGuild = z.infer<typeof manageableGuildSchema>;

/** The bot's answer to SERVICE_ROUTES.manageableGuilds. */
export const manageableGuildsSchema = z.object({ guilds: z.array(manageableGuildSchema) });

/** The guilds where a Discord user has Manage Server and the bot is a member. */
export type ManageableGuilds = z.infer<typeof manageableGuildsSchema>;

/** The bot's answer to SERVICE_ROUTES.guildChannels. */
export const guildChannelsSchema = z.object({
  channels: z.array(z.object({ id: snowflakeSchema, name: z.string() })),
});

/** Text channels in a guild, for showing /track entries by name. */
export type GuildChannels = z.infer<typeof guildChannelsSchema>;

/** The body of SERVICE_ROUTES.revalidate. */
export const revalidateBodySchema = z.object({ guildId: snowflakeSchema }).strict();

/** The body of SERVICE_ROUTES.revalidateUser. */
export const revalidateUserBodySchema = z.object({ osuId: z.number().int().positive() }).strict();

/**
 * @function guildIconUrl
 * @param guild {Pick<ManageableGuild, "id" | "icon">} a guild with its icon hash
 * @param size {number} pixels, a power of two from 16 to 4096
 * @returns {string | null} Discord's CDN URL, or null when the guild has no icon
 */
export const guildIconUrl = (
  guild: Pick<ManageableGuild, "id" | "icon">,
  size = 128,
): string | null => {
  if (!guild.icon) return null;
  const ext = guild.icon.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.${ext}?size=${size}`;
};

/** The site's card image routes, under SITE_URL, bearer HARUMIN_SERVICE_TOKEN. POST a card, get a PNG. */
export const CARD_ROUTES = Object.freeze({
  /** POST ProfileCard → image/png. /osu. */
  profile: "/api/cards/profile",
  /** POST ScoreCard → image/png. /recent, /score, /track posts. */
  score: "/api/cards/score",
  /** POST ScoreListCard → image/png. /top, /nochoke, /score's other scores. */
  scores: "/api/cards/scores",
  /** POST MapCard → image/png. /map and beatmap links. */
  map: "/api/cards/map",
  /** POST LeaderboardCard → image/png. /leaderboard. */
  leaderboard: "/api/cards/leaderboard",
  /** POST SimulateCard → image/png. /simulate. */
  simulate: "/api/cards/simulate",
  /** POST CompareCard → image/png. /compare. */
  compare: "/api/cards/compare",
  /** POST MatchCostCard → image/png. /matchcost and match links. */
  matchcost: "/api/cards/matchcost",
  /** POST PoolCard → image/png. /pack, /pool view, check and parse, pack and pool links. */
  pool: "/api/cards/pool",
  /** POST ServerCard → image/png. /server. */
  server: "/api/cards/server",
  /** POST TracksCard → image/png. /track list. */
  tracks: "/api/cards/tracks",
  /** POST BbCard → image/png. bb links. */
  bb: "/api/cards/bb",
  /** POST InfoCard → image/png. /info. */
  info: "/api/cards/info",
  /** POST LinkCard → image/png. /link. */
  link: "/api/cards/link",
  /** POST InviteCard → image/png. /invite. */
  invite: "/api/cards/invite",
  /** POST NoticeCard → image/png. Errors and confirmations. */
  notice: "/api/cards/notice",
} as const);

/** osu!'s score grades. */
export const GRADES = ["XH", "X", "SH", "S", "A", "B", "C", "D", "F"] as const;
/** One of GRADES. */
export type Grade = (typeof GRADES)[number];

const osuIdSchema = z.number().int().positive();
const countSchema = z.number().int().nonnegative();
const nonNegative = z.number().nonnegative();
const countryCodeSchema = z
  .string()
  .regex(/^[A-Z]{2}$/)
  .nullable();
/** Only osu!'s asset host: the renderer fetches it, so nothing else may be named. */
const osuAssetUrlSchema = z
  .url()
  .refine((url) => url.startsWith("https://assets.ppy.sh/"), "Not an assets.ppy.sh URL.");
const modsSchema = z.array(z.string().regex(/^[A-Z0-9]{2,3}$/)).max(16);

/** The player a card is about. The avatar is drawn from a.ppy.sh/{osuId}. */
export const cardPlayerSchema = z.object({
  osuId: osuIdSchema,
  username: z.string().min(1).max(32),
  countryCode: countryCodeSchema,
  /** The profile cover, or null for none. */
  coverUrl: osuAssetUrlSchema.nullable(),
  supporter: z.boolean(),
  pp: nonNegative,
  globalRank: z.number().int().positive().nullable(),
  countryRank: z.number().int().positive().nullable(),
});

/** The player a card is about. */
export type CardPlayer = z.infer<typeof cardPlayerSchema>;

/** The card accents a player can pick, rose first (the default). */
export const CARD_ACCENTS = [
  "rose",
  "sky",
  "mint",
  "violet",
  "amber",
  "coral",
  "teal",
  "ink",
] as const;

/** One card accent. */
export type CardAccent = (typeof CARD_ACCENTS)[number];

/** What sits behind the profile card's header: the osu! profile cover, or plain paper. */
export const CARD_COVERS = ["profile", "paper"] as const;

/** One player's card settings as stored, keyed by osu! id. Missing fields take the defaults. */
export const userSettingsSchema = z.object({
  osuId: osuIdSchema,
  accent: z.enum(CARD_ACCENTS).default("rose"),
  cover: z.enum(CARD_COVERS).default("profile"),
  /** A difficulty whose best score shows as the favorite line on /osu. */
  favoriteBeatmapId: osuIdSchema.nullable().default(null),
  updatedAt: z.coerce.date().optional(),
});

/** One player's card settings. */
export type UserSettings = z.infer<typeof userSettingsSchema>;

/**
 * @function readUserSettings
 * @param osuId {number} the player
 * @param stored {unknown} the stored doc, or null
 * @returns {UserSettings} the doc, or the defaults when it's missing, broken or someone else's
 */
export const readUserSettings = (osuId: number, stored: unknown): UserSettings => {
  const parsed = stored == null ? null : userSettingsSchema.safeParse(stored);
  return parsed?.success && parsed.data.osuId === osuId
    ? parsed.data
    : userSettingsSchema.parse({ osuId });
};

/** The player's theme on the profile card. */
export const cardThemeSchema = z.object({
  accent: z.enum(CARD_ACCENTS),
  /** The favorite line: the player's best score on their favorite map. */
  favorite: z
    .object({
      title: z.string().max(200),
      pp: z.number().nonnegative().nullable(),
      mods: modsSchema,
    })
    .nullable(),
});

/** /osu's card: a player's numbers in one ruleset. */
export const profileCardSchema = z.object({
  ruleset: rulesetSchema,
  player: cardPlayerSchema,
  /** Percent, 0 to 100. */
  accuracy: z.number().min(0).max(100),
  level: nonNegative,
  playCount: countSchema,
  /** Seconds. */
  playTime: countSchema,
  maxCombo: countSchema,
  rankedScore: countSchema,
  grades: z.object({
    ssh: countSchema,
    ss: countSchema,
    sh: countSchema,
    s: countSchema,
    a: countSchema,
  }),
  /** ISO date, or null when osu! sent none. */
  joinDate: z.iso.datetime({ offset: true }).nullable(),
  /**
   * "image" draws the cover. "hole" leaves CARD_LAYOUT.profile.cover transparent (and the paper
   * around the frame too), so the bot can lay an animated cover under the PNG with ffmpeg.
   */
  cover: z.enum(["image", "hole"]).default("image"),
  theme: cardThemeSchema.optional(),
});

/** /osu's card. */
export type ProfileCard = z.infer<typeof profileCardSchema>;

/** Where things sit on the card images, in pixels, so the bot and the site agree. */
export const CARD_LAYOUT = Object.freeze({
  profile: Object.freeze({
    width: 1000,
    height: 490,
    /** The cover's box: what `cover: "hole"` leaves transparent. */
    cover: Object.freeze({ x: 13, y: 13, width: 974, height: 170 }),
  }),
} as const);

/** The map a score was set on. The cover is drawn from the set id. */
export const cardMapSchema = z.object({
  beatmapId: osuIdSchema,
  beatmapsetId: osuIdSchema.nullable(),
  artist: z.string().max(256),
  title: z.string().max(256),
  version: z.string().max(256),
  /** With the score's mods when rosu knew; otherwise osu!'s nomod rating. */
  stars: nonNegative.nullable(),
});

/** One score as a card draws it. */
export const cardScoreSchema = z.object({
  map: cardMapSchema,
  grade: z.enum(GRADES),
  mods: modsSchema,
  /** osu!'s pp, or rosu's when osu! gave none (then `ppApprox`), or null. */
  pp: nonNegative.nullable(),
  ppApprox: z.boolean(),
  /** What a full combo would give, when the play wasn't one and rosu knew. */
  fcPp: nonNegative.nullable(),
  /** Percent, 0 to 100. */
  fcAccuracy: z.number().min(0).max(100).nullable(),
  /** Percent, 0 to 100. */
  accuracy: z.number().min(0).max(100),
  totalScore: countSchema,
  combo: countSchema,
  mapMaxCombo: countSchema.nullable(),
  /** The ruleset's judgements in order, e.g. 300 / 100 / 50 / miss. */
  hits: z.array(z.object({ label: z.string().max(8), count: countSchema })).max(8),
  passed: z.boolean(),
  /** Percent of the map played, for a fail. */
  completion: z.number().min(0).max(100).nullable(),
  endedAt: z.iso.datetime({ offset: true }),
});

/** One score as a card draws it. */
export type CardScore = z.infer<typeof cardScoreSchema>;

/** /recent's attempts on this map in the last 24 h, and the line about them. */
export const scoreSessionSchema = z.object({
  today: z.number().int().positive(),
  /** "first pass after 22 fails", "best of 23" or "best was 97.12%, 3 tries ago". */
  note: z.string().min(1).max(64).nullable(),
});

/** /recent's card: one score, big. */
export const scoreCardSchema = z.object({
  ruleset: rulesetSchema,
  player: cardPlayerSchema,
  /** The line above the map, e.g. "Most recent play". */
  heading: z.string().max(64),
  score: cardScoreSchema,
  /** Which try in a row on this map and mods, when more than one. */
  tries: z.number().int().min(2).nullable(),
  session: scoreSessionSchema.optional(),
});

/** /recent's card. */
export type ScoreCard = z.infer<typeof scoreCardSchema>;

/** The most rows a list card draws. */
export const MAX_CARD_ROWS = 5;

/** /top's card: one page of a list. */
export const scoreListCardSchema = z.object({
  ruleset: rulesetSchema,
  player: cardPlayerSchema,
  title: z.string().max(64),
  /** Sort and filter, e.g. "Sorted by accuracy · HD only". */
  note: z.string().max(128).nullable(),
  page: z.number().int().positive(),
  pages: z.number().int().positive(),
  rows: z
    .array(z.object({ place: z.number().int().positive(), score: cardScoreSchema }))
    .max(MAX_CARD_ROWS),
});

/** /top's card. */
export type ScoreListCard = z.infer<typeof scoreListCardSchema>;

const percentSchema = z.number().min(0).max(100);

/** /map's card: a difficulty's numbers with some mods, and pp at a few accuracies. */
export const mapCardSchema = z.object({
  ruleset: rulesetSchema,
  map: cardMapSchema.extend({
    creator: z.string().max(32),
    /** osu!'s status, e.g. "ranked", "loved", "graveyard". */
    status: z.string().max(16).nullable(),
  }),
  mods: modsSchema,
  cs: nonNegative,
  /** Null for rulesets without it. */
  ar: nonNegative.nullable(),
  od: nonNegative.nullable(),
  hp: nonNegative,
  /** Seconds, with the mods' speed. */
  lengthSeconds: nonNegative,
  /** With the mods' speed. */
  bpm: nonNegative,
  maxCombo: countSchema.nullable(),
  /** pp at each accuracy, e.g. 95 / 98 / 99 / 100; empty when the .osu file wasn't had. */
  pps: z.array(z.object({ accuracy: percentSchema, pp: nonNegative })).max(6),
});

/** /map's card. */
export type MapCard = z.infer<typeof mapCardSchema>;

/** The most rows a leaderboard card draws. */
export const MAX_LEADERBOARD_ROWS = 10;

/** /leaderboard's card: one page of a map's global top 100. */
export const leaderboardCardSchema = z.object({
  map: cardMapSchema,
  /** The mod filter, e.g. "HD only", or null for every score. */
  filter: z.string().max(64).nullable(),
  page: z.number().int().positive(),
  pages: z.number().int().positive(),
  rows: z
    .array(
      z.object({
        place: z.number().int().positive(),
        osuId: osuIdSchema.nullable(),
        username: z.string().min(1).max(32),
        countryCode: countryCodeSchema,
        grade: z.enum(GRADES),
        mods: modsSchema,
        pp: nonNegative.nullable(),
        accuracy: percentSchema,
        combo: countSchema,
        totalScore: countSchema,
      }),
    )
    .max(MAX_LEADERBOARD_ROWS),
});

/** /leaderboard's card. */
export type LeaderboardCard = z.infer<typeof leaderboardCardSchema>;

/** /simulate's card: a made-up play on a map and what it's worth. */
export const simulateCardSchema = z.object({
  ruleset: rulesetSchema,
  /** `stars` is with the play's mods. */
  map: cardMapSchema,
  mods: modsSchema,
  accuracy: percentSchema,
  combo: countSchema,
  mapMaxCombo: countSchema,
  misses: countSchema,
  pp: nonNegative,
});

/** /simulate's card. */
export type SimulateCard = z.infer<typeof simulateCardSchema>;

/** One side of /compare. */
export const compareSideSchema = z.object({
  player: cardPlayerSchema,
  accuracy: percentSchema,
  playCount: countSchema,
  /** Seconds. */
  playTime: countSchema,
  maxCombo: countSchema,
  /** SS and silver SS together. */
  ssCount: countSchema,
  /** The best play's pp, or null with no top plays. */
  topPp: nonNegative.nullable(),
});

/** /compare's card: two players in one ruleset. */
export const compareCardSchema = z.object({
  ruleset: rulesetSchema,
  a: compareSideSchema,
  b: compareSideSchema,
});

/** /compare's card. */
export type CompareCard = z.infer<typeof compareCardSchema>;

/** The most players on a /matchcost card. */
export const MAX_MATCH_ROWS = 16;

/** /matchcost's card: a multiplayer match's players ranked by match cost. */
export const matchCostCardSchema = z.object({
  name: z.string().min(1).max(128),
  /** The formula's name, e.g. "bathbot". */
  formula: z.string().min(1).max(32),
  /** Extra words under the title, e.g. "2 warmups skipped". */
  note: z.string().max(128).nullable(),
  /** Maps won by each team, or null when it isn't team vs. */
  teams: z.object({ red: countSchema, blue: countSchema }).nullable(),
  games: countSchema,
  rows: z
    .array(
      z.object({
        place: z.number().int().positive(),
        osuId: osuIdSchema.nullable(),
        username: z.string().min(1).max(32),
        countryCode: countryCodeSchema,
        team: z.enum(["red", "blue"]).nullable(),
        cost: nonNegative,
      }),
    )
    .max(MAX_MATCH_ROWS),
  /** Players left off the card. */
  more: countSchema,
});

/** /matchcost's card. */
export type MatchCostCard = z.infer<typeof matchCostCardSchema>;

/** The most slots on a pool card. */
export const MAX_POOL_SLOTS = 32;

/** A map's verdict against osu!'s content usage rules, on /pool check's card. */
export const POOL_CHECKS = ["ok", "potential", "disallowed", "unknown"] as const;

/** A pack, a pool, a pool's content check, a pasted pool, a /practice pick, a draft from top
 * plays, or a player's scores on a pool. */
export const poolCardSchema = z.object({
  /** Where it came from: sets the corner label, and "check" draws a verdict per slot. */
  source: z.enum(["pack", "pool", "check", "parsed", "practice", "fromtop", "me"]),
  name: z.string().max(128),
  /** Tournament, round, year and owner, or "Pack key". */
  subtitle: z.string().max(160).nullable(),
  mapCount: countSchema,
  stars: z.object({ min: nonNegative, max: nonNegative }).nullable(),
  slots: z
    .array(
      z.object({
        /** "NM1", "TB". */
        label: z.string().min(1).max(8),
        /** The bucket, for its color: "NM", "HD", "FM"..., or null. */
        mod: z.string().max(4).nullable(),
        /** "Artist - Title [Diff]", or null when osu! didn't say. */
        title: z.string().max(200).nullable(),
        beatmapId: osuIdSchema,
        stars: nonNegative.nullable(),
        lengthSeconds: countSchema.nullable(),
        check: z.enum(POOL_CHECKS).nullable(),
        /** /pool me: the player's best score on the map, null when not played. */
        mine: z
          .object({ grade: z.enum(GRADES), accuracy: percentSchema, pp: nonNegative.nullable() })
          .nullable()
          .optional(),
      }),
    )
    .max(MAX_POOL_SLOTS),
  /** A line along the bottom: the check's verdict, or skipped lines. */
  note: z.string().max(200).nullable(),
});

/** A pack or pool card. */
export type PoolCard = z.infer<typeof poolCardSchema>;

/** The most players on a /server page. */
export const MAX_SERVER_ROWS = 10;

/** /server's card: one page of a server's linked players, ranked. */
export const serverCardSchema = z.object({
  /** The icon is drawn from Discord's CDN by id and hash. */
  guild: z.object({
    id: snowflakeSchema,
    name: z.string().min(1).max(100),
    icon: z
      .string()
      .regex(/^(a_)?[0-9a-f]{32}$/)
      .nullable(),
  }),
  ruleset: rulesetSchema,
  /** What it's ranked by, e.g. "pp". */
  stat: z.string().min(1).max(16),
  total: countSchema,
  page: z.number().int().positive(),
  pages: z.number().int().positive(),
  rows: z
    .array(
      z.object({
        place: z.number().int().positive(),
        osuId: osuIdSchema,
        username: z.string().min(1).max(32),
        countryCode: countryCodeSchema,
        /** The stat as text, e.g. "12,345pp". */
        value: z.string().min(1).max(24),
      }),
    )
    .max(MAX_SERVER_ROWS),
});

/** /server's card. */
export type ServerCard = z.infer<typeof serverCardSchema>;

/** /track list's card: who a server tracks, and where. */
export const tracksCardSchema = z.object({
  max: z.number().int().positive(),
  rows: z
    .array(
      z.object({
        osuId: osuIdSchema,
        username: z.string().min(1).max(32),
        ruleset: rulesetSchema,
        /** The channel's name, without "#". */
        channel: z.string().min(1).max(100),
      }),
    )
    .max(MAX_TRACKED_PER_GUILD),
});

/** /track list's card. */
export type TracksCard = z.infer<typeof tracksCardSchema>;

/** A bb.haruhime.moe template link's card. */
export const bbCardSchema = z.object({
  templateId: z.string().regex(/^[A-Za-z0-9_-]{1,64}$/),
  /** The template's name, when bb gave one. */
  name: z.string().max(128).nullable(),
});

/** A bb link's card. */
export type BbCard = z.infer<typeof bbCardSchema>;

/** A notice's tone: what went wrong, what was done, or something to know. */
export const NOTICE_TONES = ["error", "ok", "info"] as const;

/** Most text a notice card holds, all parts together. */
export const MAX_NOTICE_LENGTH = 600;

/** One run of a notice's text: plain, bold (`**x**`) or code (`` `x` ``). */
export const noticePartSchema = z.object({
  text: z.string().min(1).max(MAX_NOTICE_LENGTH),
  style: z.enum(["plain", "bold", "code"]),
});

/** An error or confirmation as an image: its tone and its text in styled runs. */
export const noticeCardSchema = z.object({
  tone: z.enum(NOTICE_TONES),
  parts: z
    .array(noticePartSchema)
    .min(1)
    .max(60)
    .refine(
      (parts) => parts.reduce((sum, part) => sum + part.text.length, 0) <= MAX_NOTICE_LENGTH,
      `A notice holds at most ${MAX_NOTICE_LENGTH} characters.`,
    ),
});

/** A notice card. */
export type NoticeCard = z.infer<typeof noticeCardSchema>;

/** /info's card: harumin's version and live numbers. */
export const infoCardSchema = z.object({
  version: z.string().min(1).max(32),
  guilds: countSchema,
  uptimeSeconds: countSchema,
  pingMs: countSchema,
});

/** /info's card. */
export type InfoCard = z.infer<typeof infoCardSchema>;

/** /link's card: the caller's linked osu! account, or null when there's none. */
export const linkCardSchema = z.object({
  account: z
    .object({
      osuId: osuIdSchema,
      username: z.string().min(1).max(32),
    })
    .nullable(),
});

/** /link's card. */
export type LinkCard = z.infer<typeof linkCardSchema>;

/** /invite's card. */
export const inviteCardSchema = z.object({
  guilds: countSchema,
});

/** /invite's card. */
export type InviteCard = z.infer<typeof inviteCardSchema>;

// tourney.haruhime.moe and harumin: guild links, role rules, posts, role sync, the Register button.

/** A tourney document id: 24 lowercase hex digits. */
const tourneyIdSchema = z.string().regex(/^[0-9a-f]{24}$/, "Not a tourney id.");
/** A link Discord can show: https only, at most 2048 characters. */
const httpsUrlSchema = z
  .url()
  .max(2048)
  .refine((url) => url.startsWith("https://"), "Not an https URL.");
/** A lineage's or an edition's slug, as it appears in tourney's URLs. */
const tourneySlugSchema = z.string().min(1).max(64);
/** A lineage's or an edition's name. */
const tourneyNameSchema = z.string().min(1).max(256);

/**
 * What makes a member hold a role, besides `staffRole:<role>` and `onTeam:<team id>`:
 * `registered` (a pending, waitlisted or approved registration), `approved`, `captain`,
 * `eliminated` (out of the bracket), `donated` (the crowdfund module) and `attendingInPerson` (a
 * LAN seat, the LAN module).
 */
export const ROLE_TRIGGERS = [
  "registered",
  "approved",
  "captain",
  "eliminated",
  "donated",
  "attendingInPerson",
] as const;

/**
 * When harumin takes a role back. `never`: sync never does. `onWithdraw`: once its trigger stops
 * holding. `onEditionDone`: that, or once the edition is done. `onRefund`: `donated` only, once the
 * donation is refunded.
 */
export const ROLE_REVOKES = ["never", "onWithdraw", "onEditionDone", "onRefund"] as const;

/** One of ROLE_REVOKES. */
export type RoleRevoke = (typeof ROLE_REVOKES)[number];

/** The most role rules one lineage has, team rules included. */
export const MAX_ROLE_RULES = 25;

/**
 * A rule's trigger: one of ROLE_TRIGGERS, `staffRole:<role>` (a preset role's name or a custom
 * role's id) or `onTeam:<team id>`.
 */
export const roleTriggerSchema = z.union(
  [
    z.enum(ROLE_TRIGGERS),
    z.string().regex(/^staffRole:[a-z0-9-]{1,32}$/),
    z.string().regex(/^onTeam:[0-9a-f]{24}$/),
  ],
  { error: "Not a role trigger." },
);

/** A rule's trigger. */
export type RoleTrigger = z.infer<typeof roleTriggerSchema>;

/**
 * One role rule: harumin gives `roleId` in `guildId` while `trigger` holds, and takes it back as
 * `revoke` says. `editionId` null means any edition of the lineage; set, only that edition.
 * `onRefund` is only for `donated`, and an `onTeam:` rule names its edition.
 */
export const roleRuleSchema = z
  .object({
    id: tourneyIdSchema,
    guildId: snowflakeSchema,
    roleId: snowflakeSchema,
    trigger: roleTriggerSchema,
    revoke: z.enum(ROLE_REVOKES),
    editionId: tourneyIdSchema.nullable(),
  })
  .refine((rule) => rule.revoke !== "onRefund" || rule.trigger === "donated", {
    error: "onRefund is only for donated.",
    path: ["revoke"],
  })
  .refine((rule) => !rule.trigger.startsWith("onTeam:") || rule.editionId !== null, {
    error: "A team rule names its edition.",
    path: ["editionId"],
  });

/** One role rule. */
export type RoleRule = z.infer<typeof roleRuleSchema>;

/**
 * A lineage's role rules: at most MAX_ROLE_RULES, no two with one id, and every rule on a role in
 * the same guild with the same revoke. An issue about one rule has a path starting with its index.
 */
export const roleRulesSchema = z
  .array(roleRuleSchema)
  .max(MAX_ROLE_RULES, `A lineage has at most ${MAX_ROLE_RULES} role rules.`)
  .superRefine((rules, ctx) => {
    const ids = new Set<string>();
    const firstOnRole = new Map<string, RoleRule>();
    for (const [index, rule] of rules.entries()) {
      if (ids.has(rule.id)) {
        ctx.addIssue({ code: "custom", message: "Another rule has this id.", path: [index, "id"] });
      }
      ids.add(rule.id);
      const first = firstOnRole.get(rule.roleId);
      if (first === undefined) {
        firstOnRole.set(rule.roleId, rule);
        continue;
      }
      if (first.guildId !== rule.guildId) {
        ctx.addIssue({
          code: "custom",
          message: "Every rule on one role needs the same server.",
          path: [index, "guildId"],
        });
      }
      if (first.revoke !== rule.revoke) {
        ctx.addIssue({
          code: "custom",
          message: "Every rule on one role needs the same revoke.",
          path: [index, "revoke"],
        });
      }
    }
  });

/** A lineage's role rules. */
export type RoleRules = z.infer<typeof roleRulesSchema>;

/**
 * A lineage's link to Discord as tourney stores it: its main guild, an optional staff guild, the
 * switch (off: no roles, posts or pings), nickname sync (nicknames become osu! usernames), the
 * role rules, and the Discord id of whoever linked it (null once their account is deleted).
 */
export const tourneyLinkSchema = z.object({
  lineageId: tourneyIdSchema,
  guildId: snowflakeSchema,
  staffGuildId: snowflakeSchema.nullable(),
  enabled: z.boolean(),
  nicknames: z.boolean(),
  rules: roleRulesSchema,
  linkedBy: snowflakeSchema.nullable(),
  linkedAt: z.coerce.date(),
});

/** A lineage's link to Discord. */
export type TourneyLink = z.infer<typeof tourneyLinkSchema>;

/** Where a harumin post goes: a channel in a guild. */
export const notificationRouteSchema = z.object({
  guildId: snowflakeSchema,
  channelId: snowflakeSchema,
});

/** Where a harumin post goes. */
export type NotificationRoute = z.infer<typeof notificationRouteSchema>;

/**
 * harumin's answer to SERVICE_ROUTES.guildRoles: a guild's roles (at most 250, Discord's cap) and
 * whether harumin has Manage Roles and Manage Nicknames there. An `assignable` role is one harumin
 * can give: not @everyone, not managed by a bot or an integration, and below harumin's top role.
 */
export const guildRolesSchema = z.object({
  roles: z
    .array(
      z.object({
        id: snowflakeSchema,
        name: z.string().max(100),
        /** 0xRRGGBB; 0 is no color. */
        color: z.number().int().min(0).max(0xffffff),
        position: z.number().int().min(0),
        assignable: z.boolean(),
      }),
    )
    .max(250),
  manageRoles: z.boolean(),
  manageNicknames: z.boolean(),
});

/** A guild's roles, as harumin sees them. */
export type GuildRoles = z.infer<typeof guildRolesSchema>;

/**
 * The one embed in a tourney post: the edition (or lineage) linking its page as the author, a
 * title and its link, an optional description, the footer and the time. Discord's limits per
 * field, and 6000 characters in all. Strict: unknown keys fail.
 */
export const tourneyEmbedSchema = z
  .object({
    author: z.object({ name: z.string().min(1).max(256), url: httpsUrlSchema }).strict(),
    title: z.string().min(1).max(256),
    url: httpsUrlSchema,
    description: z.string().max(4096).optional(),
    footer: z.object({ text: z.string().max(2048) }).strict(),
    timestamp: z.iso.datetime({ offset: true }),
  })
  .strict()
  .refine(
    (embed) =>
      embed.author.name.length +
        embed.title.length +
        (embed.description?.length ?? 0) +
        embed.footer.text.length <=
      6000,
    "An embed holds at most 6000 characters.",
  );

/** One embed in a tourney post. */
export type TourneyEmbed = z.infer<typeof tourneyEmbedSchema>;

/**
 * The body of SERVICE_ROUTES.tourneyPost: the channel, tourney's key for this delivery (a retry
 * carries the same key), the message (one embed, no mention parsed, no content) and `register`,
 * which puts a Register button under it (custom id REGISTER_BUTTON_PREFIX + editionId), or null.
 * Strict at every level: unknown keys fail.
 */
export const tourneyPostBodySchema = notificationRouteSchema
  .extend({
    key: z.string().min(1).max(300),
    message: z
      .object({
        embeds: z.tuple([tourneyEmbedSchema]),
        allowed_mentions: z.object({ parse: z.tuple([]) }).strict(),
      })
      .strict(),
    register: z.object({ editionId: tourneyIdSchema }).strict().nullable(),
  })
  .strict();

/** The body of SERVICE_ROUTES.tourneyPost. */
export type TourneyPostBody = z.infer<typeof tourneyPostBodySchema>;

/** harumin's 200 answer to SERVICE_ROUTES.tourneyPost: the posted message's id. */
export const tourneyPostAnswerSchema = z.object({ messageId: snowflakeSchema });

/** harumin's answer to a post. */
export type TourneyPostAnswer = z.infer<typeof tourneyPostAnswerSchema>;

/** A Register button's custom id is this plus the edition's id. */
export const REGISTER_BUTTON_PREFIX = "tourney:register:";

/**
 * tourney.haruhime.moe's routes for harumin, under tourney's URL. Every call carries
 * `Authorization: Bearer <secret>`, the secret being tourney's HARUMIN_SERVICE_SECRET. A wrong
 * secret gets 401; every call gets 503 while tourney has none set.
 *
 * Role sync: harumin claims due jobs, each leased to it for ROLE_SYNC_LEASE_SECONDS. It applies a
 * job's `add`, `remove` and `nick` in that job's guild only, through its per-guild queue, and acks
 * within the lease; a job not acked by then is handed out again. `skipped` with `not-in-guild`
 * counts as applied. When harumin first sees a member in a guild roleGuilds names, or on
 * `/tourney roles`, it calls refreshRoleSync for them.
 *
 * Drafts: harumin mirrors a running draft in a channel by reading draft, and sends a captain's
 * pick to draftPick with the number of the pick its menu showed, so a stale menu or a second
 * click is refused instead of landing twice.
 *
 * Acting for a person, harumin calls tourney's `/api/v1` with the same bearer and
 * DISCORD_USER_HEADER naming the Discord user.
 */
export const TOURNEY_ROUTES = Object.freeze({
  /** GET → TourneyGuild, the lineages linked to that guild. 400 unless guildId is a Discord id. */
  guild: "/api/harumin/guilds/:guildId",
  /** POST RoleSyncClaimBody → 200 RoleSyncClaimAnswer: due jobs of links that are on, leased. */
  claimRoleSync: "/api/harumin/role-sync/claim",
  /**
   * POST RoleSyncAckBody → 200 { acked: number }, the results that matched a job (unknown ids are
   * ignored). A job that changed during its lease stays due at its new version. A failure with
   * `missing-permissions`, `role-too-high`, `unknown-role` or `unknown-guild` waits for the next
   * change; `rate-limited` and `discord-error` are tried again after a backoff, or after
   * retryAfterSeconds when that is longer.
   */
  ackRoleSync: "/api/harumin/role-sync/ack",
  /** POST RoleSyncRefreshBody → 200 { queued: number }, the jobs recomputed. 429 when too often. */
  refreshRoleSync: "/api/harumin/role-sync/refresh",
  /**
   * GET ?guildId=&discordId= → RegistrationButton: what that edition's Register button, pressed in
   * that guild, does for that Discord user. 400 unless both are Discord ids, 404 for an unknown
   * edition.
   */
  registration: "/api/harumin/editions/:editionId/registration",
  /**
   * GET ?guildId= → TourneyDraft: the edition's draft, read for that guild. DISCORD_USER_HEADER is
   * optional and fills `viewer` (null without it). 400 unless guildId (and the header, when sent)
   * is a Discord id, 404 for an unknown edition or one with no draft, 409 `discord-not-linked`
   * when its lineage isn't linked to that guild or `discord-paused` while the link is off.
   */
  draft: "/api/harumin/editions/:editionId/draft",
  /**
   * POST DraftPickBody with DISCORD_USER_HEADER → 200 DraftPickAnswer: that user picks `player`
   * for `team` as pick `overall`, as the captain on the clock or as draft staff, and gets the
   * draft after it. 400 without the header or for a body that doesn't parse; 403 `forbidden` (not
   * their pick) or `discord-user-unlinked` (no haruhime.moe account has that Discord); 404 and 409
   * as for draft; 422 `out-of-order` (`overall` or `team` isn't on the clock: a stale menu or a
   * second click), `closed` (every pick is made) or `bad-input` (the player isn't in the pool or
   * is taken); 429 past that user's write limit.
   */
  draftPick: "/api/harumin/editions/:editionId/draft/picks",
  /**
   * GET → RoleGuilds: every guild a role rule of an enabled link names. harumin refreshes the roles
   * of members it sees only in these.
   */
  roleGuilds: "/api/harumin/role-guilds",
} as const);

/**
 * The header naming the Discord user (by id) a call from harumin acts for: an `/api/v1` call or
 * TOURNEY_ROUTES.draftPick. With tourney's HARUMIN_SERVICE_SECRET as the bearer, tourney finds
 * that user's haruhime.moe account and checks their permissions as on the site; an unlinked or
 * banned account gets 403. A read may leave it out and sees what anyone sees; a write without it
 * gets 400. TOURNEY_ROUTES.draft only reads it to fill `viewer`.
 */
export const DISCORD_USER_HEADER = "x-discord-user";

/** How long a claimed job is harumin's: ack it within this, or it is handed out again. */
export const ROLE_SYNC_LEASE_SECONDS = 120;

/** The most jobs one claim hands out, and the most results one ack carries. */
export const MAX_ROLE_SYNC_CLAIM = 50;

/**
 * tourney's answer to TOURNEY_ROUTES.guild: each lineage linked to the guild, as its main guild or
 * its staff guild, whether that link is on, and the lineage's running editions (not archived, not
 * done). At most 100 links, each with at most 100 editions.
 */
export const tourneyGuildSchema = z.object({
  links: z
    .array(
      z.object({
        lineage: z.object({
          id: tourneyIdSchema,
          slug: tourneySlugSchema,
          name: tourneyNameSchema,
        }),
        slot: z.enum(["main", "staff"]),
        enabled: z.boolean(),
        editions: z
          .array(
            z.object({
              id: tourneyIdSchema,
              slug: tourneySlugSchema,
              name: tourneyNameSchema,
              /** The edition's phase, e.g. "registration". */
              phase: z.string().min(1).max(32),
            }),
          )
          .max(100),
      }),
    )
    .max(100),
});

/** The lineages linked to a guild. */
export type TourneyGuild = z.infer<typeof tourneyGuildSchema>;

/**
 * One role-sync job: a member's whole mapped-role state in one guild, at `version`. harumin gives
 * every role in `add`, takes every role in `remove` and sets the nickname to `nick` (null: leaves
 * it alone), in `guildId` only. Every role is one the lineage's rules map; harumin never creates
 * or deletes a role.
 */
export const roleSyncJobSchema = z.object({
  id: tourneyIdSchema,
  version: z.number().int().positive(),
  guildId: snowflakeSchema,
  discordId: snowflakeSchema,
  add: z.array(snowflakeSchema).max(MAX_ROLE_RULES),
  remove: z.array(snowflakeSchema).max(MAX_ROLE_RULES),
  nick: z.string().min(1).max(32).nullable(),
});

/** One role-sync job. */
export type RoleSyncJob = z.infer<typeof roleSyncJobSchema>;

/** The body of TOURNEY_ROUTES.claimRoleSync: how many jobs harumin takes, 1 to 50 (default 50). */
export const roleSyncClaimBodySchema = z
  .object({
    limit: z.number().int().min(1).max(MAX_ROLE_SYNC_CLAIM).default(MAX_ROLE_SYNC_CLAIM),
  })
  .strict();

/** The body of TOURNEY_ROUTES.claimRoleSync. */
export type RoleSyncClaimBody = z.infer<typeof roleSyncClaimBodySchema>;

/** tourney's answer to TOURNEY_ROUTES.claimRoleSync: the jobs now leased to harumin. */
export const roleSyncClaimAnswerSchema = z.object({
  jobs: z.array(roleSyncJobSchema).max(MAX_ROLE_SYNC_CLAIM),
});

/** The jobs a claim handed out. */
export type RoleSyncClaimAnswer = z.infer<typeof roleSyncClaimAnswerSchema>;

/**
 * Why harumin couldn't apply a job: `missing-permissions` (no Manage Roles or Manage Nicknames),
 * `role-too-high` (a role sits above harumin's top role), `unknown-role`, `unknown-guild`,
 * `rate-limited` (Discord said to wait) or `discord-error` (anything else from Discord).
 */
export const ROLE_SYNC_ERRORS = [
  "missing-permissions",
  "role-too-high",
  "unknown-role",
  "unknown-guild",
  "rate-limited",
  "discord-error",
] as const;

/** One of ROLE_SYNC_ERRORS. */
export type RoleSyncError = (typeof ROLE_SYNC_ERRORS)[number];

/** Which job, and the version harumin claimed. */
const ackedJob = { id: tourneyIdSchema, version: z.number().int().positive() };

/**
 * The body of TOURNEY_ROUTES.ackRoleSync: 1 to 50 results, one per claimed job, by id and the
 * version claimed. `applied`; `skipped` with `not-in-guild` (the member isn't in that guild,
 * counted as applied); or `failed` with one of ROLE_SYNC_ERRORS and how long Discord asked to
 * wait in seconds (null when it didn't). Strict at every level: unknown keys fail.
 */
export const roleSyncAckBodySchema = z
  .object({
    results: z
      .array(
        z.discriminatedUnion("outcome", [
          z.object({ ...ackedJob, outcome: z.literal("applied") }).strict(),
          z
            .object({
              ...ackedJob,
              outcome: z.literal("skipped"),
              reason: z.literal("not-in-guild"),
            })
            .strict(),
          z
            .object({
              ...ackedJob,
              outcome: z.literal("failed"),
              error: z.enum(ROLE_SYNC_ERRORS),
              retryAfterSeconds: z.number().int().min(1).max(86_400).nullable(),
            })
            .strict(),
        ]),
      )
      .min(1)
      .max(MAX_ROLE_SYNC_CLAIM),
  })
  .strict();

/** The body of TOURNEY_ROUTES.ackRoleSync. */
export type RoleSyncAckBody = z.infer<typeof roleSyncAckBodySchema>;

/** The body of TOURNEY_ROUTES.refreshRoleSync: work out that member's roles in that guild now. */
export const roleSyncRefreshBodySchema = z
  .object({ guildId: snowflakeSchema, discordId: snowflakeSchema })
  .strict();

/** The body of TOURNEY_ROUTES.refreshRoleSync. */
export type RoleSyncRefreshBody = z.infer<typeof roleSyncRefreshBodySchema>;

/**
 * tourney's answer to TOURNEY_ROUTES.registration. `one-click`: harumin registers the user itself,
 * POST /api/v1/editions/{lineage}/{edition}/registrations acting for them (the slugs). `form`: DM
 * them the registration form's link. `link-account`: DM them where to link their Discord account
 * on haruhime.moe. `refused`: tell them `message` (`code` is tourney's error code).
 */
export const registrationButtonSchema = z.discriminatedUnion("outcome", [
  z.object({
    outcome: z.literal("one-click"),
    lineage: tourneySlugSchema,
    edition: tourneySlugSchema,
  }),
  z.object({ outcome: z.literal("form"), url: httpsUrlSchema }),
  z.object({ outcome: z.literal("link-account"), url: httpsUrlSchema }),
  z.object({
    outcome: z.literal("refused"),
    code: z.string().min(1).max(64),
    message: z.string().min(1).max(500),
  }),
]);

/** What a Register button does for one Discord user. */
export type RegistrationButton = z.infer<typeof registrationButtonSchema>;

// tourney drafts on Discord, and the guilds role rules name.

/** A player in a draft: osu! id and name, global rank (null when unranked) and country. */
export const draftPlayerSchema = z.object({
  osuId: osuIdSchema,
  username: z.string().min(1).max(32),
  rank: z.number().int().positive().nullable(),
  country: countryCodeSchema,
});

/** A player in a draft. */
export type DraftPlayer = z.infer<typeof draftPlayerSchema>;

/** A team's name in a draft: tourney's longest is 32. */
const teamName = z.string().min(1).max(32);
/** A moment: ISO 8601 with Z or an offset. */
const instant = z.iso.datetime({ offset: true });

/**
 * tourney's answer to TOURNEY_ROUTES.draft: the edition and its page, how many picks the draft
 * makes in all, the pick on the clock, the teams up next, the picks made in order, the players
 * left, and what the Discord user asking may do. `overall` counts picks from 0, `round` from 1.
 * At most 1024 picks and 1024 players.
 */
export const tourneyDraftSchema = z.object({
  lineage: z.object({ slug: z.string().min(1), name: z.string().min(1) }),
  edition: z.object({ id: tourneyIdSchema, slug: z.string().min(1), name: z.string().min(1) }),
  url: httpsUrlSchema,
  total: z.number().int().min(1).max(1024),
  /**
   * The pick on the clock: its number, round, team, that team's captain and its deadline. Null
   * once every pick is made.
   */
  clock: z
    .object({
      overall: z.number().int().min(0),
      round: z.number().int().min(1),
      team: tourneyIdSchema,
      teamName,
      captain: draftPlayerSchema,
      deadline: instant,
    })
    .nullable(),
  /** The teams picking after the one on the clock, in order, at most five. */
  next: z.array(teamName).max(5),
  picks: z
    .array(
      z.object({
        overall: z.number().int().min(0),
        round: z.number().int().min(1),
        team: tourneyIdSchema,
        teamName,
        player: draftPlayerSchema,
        at: instant,
      }),
    )
    .max(1024),
  /** The players not picked yet, best rank first. */
  pool: z.array(draftPlayerSchema).max(1024),
  /**
   * The Discord user DISCORD_USER_HEADER names: whether a haruhime.moe account has that Discord,
   * whether they may manage the draft (and pick for any team), and the team they captain. Null
   * without the header.
   */
  viewer: z
    .object({ linked: z.boolean(), manage: z.boolean(), team: tourneyIdSchema.nullable() })
    .nullable(),
});

/** An edition's draft, as harumin shows it. */
export type TourneyDraft = z.infer<typeof tourneyDraftSchema>;

/**
 * The body of TOURNEY_ROUTES.draftPick: the guild it was picked in, the team picking, the
 * player's osu! id and `overall`, the pick the menu was made for (0 to 1023), so a stale menu or a
 * second click is refused. Strict: unknown keys fail.
 */
export const draftPickBodySchema = z
  .object({
    guildId: snowflakeSchema,
    team: tourneyIdSchema,
    player: osuIdSchema,
    overall: z.number().int().min(0).max(1023),
  })
  .strict();

/** The body of TOURNEY_ROUTES.draftPick. */
export type DraftPickBody = z.infer<typeof draftPickBodySchema>;

/** tourney's 200 answer to TOURNEY_ROUTES.draftPick: the draft after the pick. */
export const draftPickAnswerSchema = z.object({ draft: tourneyDraftSchema });

/** tourney's answer to a pick. */
export type DraftPickAnswer = z.infer<typeof draftPickAnswerSchema>;

/**
 * tourney's answer to TOURNEY_ROUTES.roleGuilds: every guild a role rule of an enabled link
 * names, at most 10,000.
 */
export const roleGuildsSchema = z.object({ guildIds: z.array(snowflakeSchema).max(10_000) });

/** The guilds role rules name. */
export type RoleGuilds = z.infer<typeof roleGuildsSchema>;
