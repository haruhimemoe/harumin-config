/**
 * @file src/index.ts
 * @desc @haruhimemoe/harumin-config: what the harumin bot and harumin.haruhime.moe agree on. A
 *       guild's settings (which links the bot answers with a card, the default ruleset), the
 *       /track entries, the collection names both read, and the bot's service routes the site
 *       calls (which guilds a Discord user can manage, and dropping a guild's cached settings),
 *       and the cards the bot asks the site to draw as images (/osu, /recent, /top). zod only, no
 *       I/O.
 * @author David @dvhsh (https://dvh.sh)
 * @created Tue Oct 6, 2026
 * @modified Wed Oct 7, 2026
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
export const AUTO_EMBED_KEYS = ["map", "match", "pack", "pool", "bb"] as const;
/** One of AUTO_EMBED_KEYS. */
export type AutoEmbedKey = (typeof AUTO_EMBED_KEYS)[number];

/** Each link type on or off. */
export type AutoEmbeds = Record<AutoEmbedKey, boolean>;

/** A new guild's cards: beatmaps, packs and pools on; match and bb links off. */
export const DEFAULT_AUTO_EMBEDS: Readonly<AutoEmbeds> = Object.freeze({
  map: true,
  match: false,
  pack: true,
  pool: true,
  bb: false,
});

/** What each auto-embed does, for the dashboard and /help. */
export const AUTO_EMBED_LABELS: Readonly<Record<AutoEmbedKey, { name: string; line: string }>> =
  Object.freeze({
    map: { name: "Beatmaps", line: "osu.ppy.sh beatmap links get a map card." },
    match: { name: "Matches", line: "Multiplayer match links get a summary with match costs." },
    pack: { name: "Packs", line: "packs.haruhime.moe links get a pack card." },
    pool: { name: "Pools", line: "pools.haruhime.moe links get a pool card." },
    bb: { name: "BBCode", line: "bb.haruhime.moe links get a small preview." },
  });

const autoEmbedsSchema = z.object({
  map: z.boolean().default(DEFAULT_AUTO_EMBEDS.map),
  match: z.boolean().default(DEFAULT_AUTO_EMBEDS.match),
  pack: z.boolean().default(DEFAULT_AUTO_EMBEDS.pack),
  pool: z.boolean().default(DEFAULT_AUTO_EMBEDS.pool),
  bb: z.boolean().default(DEFAULT_AUTO_EMBEDS.bb),
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
} as const);

/** The bot's service routes, under its SERVICE_URL, bearer HARUMIN_SERVICE_TOKEN. */
export const SERVICE_ROUTES = Object.freeze({
  /** GET ?discordId= → ManageableGuilds. */
  manageableGuilds: "/guilds/manageable",
  /** GET /guilds/{id}/channels → GuildChannels (text channels the bot can post in). */
  guildChannels: "/guilds/:guildId/channels",
  /** POST { guildId } → 204. The bot drops its cached settings for that guild. */
  revalidate: "/settings/revalidate",
  /** POST { osuId } → 204. The bot drops its cached card settings and profile for that player. */
  revalidateUser: "/users/revalidate",
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
