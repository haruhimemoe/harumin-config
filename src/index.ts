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
} as const);

/** The bot's service routes, under its SERVICE_URL, bearer HARUMIN_SERVICE_TOKEN. */
export const SERVICE_ROUTES = Object.freeze({
  /** GET ?discordId= → ManageableGuilds. */
  manageableGuilds: "/guilds/manageable",
  /** GET /guilds/{id}/channels → GuildChannels (text channels the bot can post in). */
  guildChannels: "/guilds/:guildId/channels",
  /** POST { guildId } → 204. The bot drops its cached settings for that guild. */
  revalidate: "/settings/revalidate",
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
  /** POST ScoreCard → image/png. /recent. */
  score: "/api/cards/score",
  /** POST ScoreListCard → image/png. /top. */
  scores: "/api/cards/scores",
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

/** /recent's card: one score, big. */
export const scoreCardSchema = z.object({
  ruleset: rulesetSchema,
  player: cardPlayerSchema,
  /** The line above the map, e.g. "Most recent play". */
  heading: z.string().max(64),
  score: cardScoreSchema,
  /** Which try in a row on this map and mods, when more than one. */
  tries: z.number().int().min(2).nullable(),
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
