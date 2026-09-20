export const USER_ID = "749389300768047226";
export const ENDPOINT = `https://api.lanyard.rest/v1/users/${USER_ID}`;
export const LABELS = Object.freeze({
  online: "Online",
  idle: "Idle",
  dnd: "Do not disturb",
  offline: "Offline",
});
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const text = (value) => (typeof value === "string" ? value.trim().slice(0, 500) : "");

// Only Spotify's image CDN is accepted; activity strings are rendered as text.
function albumArt(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "i.scdn.co" &&
      !url.username &&
      !url.password
      ? url.href
      : null;
  } catch {
    return null;
  }
}

export function parsePresence(payload) {
  if (!record(payload) || payload.success !== true || !record(payload.data))
    throw new Error("Invalid presence response");
  const data = payload.data;
  if (
    !record(data.discord_user) ||
    data.discord_user.id !== USER_ID ||
    !Object.hasOwn(LABELS, data.discord_status)
  ) {
    throw new Error("Invalid presence identity or status");
  }
  if (!Array.isArray(data.activities) || typeof data.listening_to_spotify !== "boolean")
    throw new Error("Invalid activities");
  const activities = data.activities.filter(record);
  const custom = activities.find((item) => item.type === 4);
  const application = activities.find(
    (item) => [0, 1, 2, 3, 5].includes(item.type) && item.name !== "Spotify" && text(item.name),
  );
  let spotify = null;
  if (data.listening_to_spotify) {
    const song = data.spotify;
    if (
      !record(song) ||
      !record(song.timestamps) ||
      !text(song.song) ||
      !text(song.artist) ||
      typeof song.track_id !== "string" ||
      !/^[a-zA-Z0-9]{22}$/.test(song.track_id) ||
      !Number.isFinite(song.timestamps.start) ||
      !Number.isFinite(song.timestamps.end) ||
      song.timestamps.start < 0 ||
      song.timestamps.end <= song.timestamps.start
    )
      throw new Error("Invalid Spotify activity");
    spotify = {
      name: text(song.song),
      artist: text(song.artist),
      album: text(song.album),
      art: albumArt(song.album_art_url),
      url: `https://open.spotify.com/track/${song.track_id}`,
      start: song.timestamps.start,
      end: song.timestamps.end,
    };
  }
  // Discord can supply remnants of activities while invisible/offline.
  const visible = data.discord_status !== "offline";
  return {
    state: data.discord_status,
    custom: visible ? text(custom?.state) : "",
    activity:
      visible && application
        ? {
            name: text(application.name),
            detail: [text(application.details), text(application.state)]
              .filter(Boolean)
              .join(" · "),
          }
        : null,
    spotify: visible ? spotify : null,
  };
}

export function trackPosition(song, now) {
  const duration = Math.floor((song.end - song.start) / 1000);
  const elapsed = Math.max(0, Math.min(duration, Math.floor((now - song.start) / 1000)));
  return { duration, elapsed, expired: now > song.end + 10000 };
}

export function formatTime(seconds) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
