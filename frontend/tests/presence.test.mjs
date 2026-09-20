import { test } from "node:test";
import assert from "node:assert/strict";
import { USER_ID, parsePresence, trackPosition, formatTime } from "../src/scripts/presence.mjs";
const response = (overrides) => ({
  success: true,
  data: {
    discord_user: { id: USER_ID },
    discord_status: "online",
    activities: [],
    listening_to_spotify: false,
    spotify: null,
    ...overrides,
  },
});
const song = {
  song: "A song",
  artist: "Artist",
  album: "Album",
  track_id: "0123456789abcdefghijkl",
  album_art_url: "https://i.scdn.co/image/art",
  timestamps: { start: 100000, end: 280000 },
};

test("missing, wrong-user and malformed data cannot masquerade as offline", () => {
  for (const value of [
    null,
    {},
    { success: false },
    response({ discord_user: { id: "someone-else" } }),
    response({ discord_status: "constructor" }),
    response({ activities: null }),
    response({ listening_to_spotify: "yes" }),
  ]) {
    assert.throws(() => parsePresence(value));
  }
});
test("custom status is separate from app activity and Spotify is not duplicated", () => {
  const parsed = parsePresence(
    response({
      activities: [
        { type: 4, state: "hello" },
        { type: 2, name: "Spotify" },
        { type: 0, name: "Editor", details: "Coding", state: "A project" },
      ],
    }),
  );
  assert.equal(parsed.custom, "hello");
  assert.deepEqual(parsed.activity, {
    name: "Editor",
    detail: "Coding · A project",
  });
  assert.equal(parsed.spotify, null);
});
test("offline hides stale activities", () => {
  const parsed = parsePresence(
    response({
      discord_status: "offline",
      activities: [
        { type: 0, name: "Game" },
        { type: 4, state: "Old status" },
      ],
      listening_to_spotify: true,
      spotify: song,
    }),
  );
  assert.equal(parsed.activity, null);
  assert.equal(parsed.custom, "");
  assert.equal(parsed.spotify, null);
});
test("Spotify links and artwork use constrained destinations", () => {
  const parsed = parsePresence(
    response({
      listening_to_spotify: true,
      spotify: { ...song, album_art_url: "javascript:alert(1)" },
    }),
  );
  assert.equal(parsed.spotify.art, null);
  assert.equal(parsed.spotify.url, "https://open.spotify.com/track/0123456789abcdefghijkl");
  assert.throws(() =>
    parsePresence(
      response({
        listening_to_spotify: true,
        spotify: { ...song, track_id: "../bad" },
      }),
    ),
  );
  assert.throws(() =>
    parsePresence(
      response({
        listening_to_spotify: true,
        spotify: { ...song, timestamps: { start: 2, end: 1 } },
      }),
    ),
  );
});
test("progress clamps clock drift and expires old tracks", () => {
  const parsed = parsePresence(response({ listening_to_spotify: true, spotify: song })).spotify;
  assert.equal(trackPosition(parsed, 90000).elapsed, 0);
  assert.deepEqual(trackPosition(parsed, 291000), {
    elapsed: 180,
    duration: 180,
    expired: true,
  });
  assert.equal(formatTime(84), "01:24");
});
