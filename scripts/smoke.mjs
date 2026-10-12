/**
 * @file scripts/smoke.mjs
 * @desc Imports the built package through its exports map, the way the bot, the site and tourney
 *       will, and checks a few results. Run by `bun run test:dist`.
 * @author David @dvhsh (https://dvh.sh)
 * @created Tue Oct 6, 2026
 * @modified Mon Oct 12, 2026
 */

import assert from "node:assert/strict";

const { CARD_ROUTES, defaultGuildSettings, HARUMIN_COLLECTIONS, TOURNEY_ROUTES } = await import(
  "@haruhimemoe/harumin-config"
);

assert.equal(defaultGuildSettings("123456789012345678").autoEmbeds.map, true);
assert.equal(HARUMIN_COLLECTIONS.guildSettings, "guild_settings");
assert.equal(CARD_ROUTES.profile, "/api/cards/profile");
assert.equal(TOURNEY_ROUTES.claimRoleSync, "/api/harumin/role-sync/claim");
console.log("smoke: ok");
