/**
 * @file tests/index.test.ts
 * @desc Guild settings defaults, reading stored documents (bad ones fall back), patches (strict,
 *       partial, never mutating), track entries, the service contract and guild icon URLs.
 * @author David @dvhsh (https://dvh.sh)
 * @created Tue Oct 6, 2026
 * @modified Tue Oct 6, 2026
 */

import { describe, expect, it } from "vitest";
import * as api from "../src/index.js";
import {
  AUTO_EMBED_KEYS,
  AUTO_EMBED_LABELS,
  applyGuildSettingsPatch,
  DEFAULT_AUTO_EMBEDS,
  defaultGuildSettings,
  guildIconUrl,
  guildSettingsPatchSchema,
  manageableGuildsSchema,
  readGuildSettings,
  revalidateBodySchema,
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
        "DEFAULT_AUTO_EMBEDS",
        "HARUMIN_COLLECTIONS",
        "MAX_TRACKED_PER_GUILD",
        "RULESETS",
        "SERVICE_ROUTES",
        "applyGuildSettingsPatch",
        "defaultGuildSettings",
        "guildChannelsSchema",
        "guildIconUrl",
        "guildSettingsPatchSchema",
        "guildSettingsSchema",
        "manageableGuildSchema",
        "manageableGuildsSchema",
        "readGuildSettings",
        "revalidateBodySchema",
        "rulesetSchema",
        "snowflakeSchema",
        "trackEntrySchema",
      ]
    `);
  });
});
