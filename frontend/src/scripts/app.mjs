import {
  ENDPOINT,
  LABELS,
  parsePresence,
  trackPosition,
  formatTime,
} from "./presence.mjs";

const byId = (id) => document.getElementById(id);
const setText = (id, value) => {
  byId(id).textContent = value;
};
let current = null;
let lastSuccess = 0;
let pending = null;
let pollTimer;

function renderMusic(song, unavailable = false) {
  setText(
    "music-state",
    song ? "LISTENING" : unavailable ? "UNAVAILABLE" : "NOT PLAYING",
  );
  setText(
    "track-name",
    song?.name ??
      (unavailable ? "Listening status unavailable" : "Nothing playing"),
  );
  setText(
    "track-artist",
    song?.artist ??
      (unavailable
        ? "The presence feed is unavailable."
        : "A little quiet for now."),
  );
  setText("track-album", song?.album ?? "");
  byId("timeline").hidden = !song;
  const art = byId("album-art");
  art.hidden = !song?.art;
  byId("album-placeholder").hidden = Boolean(song?.art);
  if (song?.art) {
    if (art.getAttribute("src") !== song.art) art.src = song.art;
  } else art.removeAttribute("src");
  const link = byId("track-link");
  link.hidden = !song;
  if (song) link.href = song.url;
  else link.removeAttribute("href");
  tick();
}

function unavailable(message = "Status unavailable · retrying") {
  current = null;
  document.querySelectorAll(".presence").forEach((element) => {
    element.dataset.state = "unknown";
  });
  document.querySelectorAll("[data-presence]").forEach((element) => {
    element.textContent = "Status unavailable";
  });
  setText("activity-name", "Activity unavailable");
  setText("activity-detail", "The presence feed is unavailable.");
  byId("custom-status").hidden = true;
  setText("custom-status", "");
  setText("feed-state", message);
  byId("retry").hidden = false;
  renderMusic(null, true);
}

function render(data) {
  current = data;
  document.querySelectorAll(".presence").forEach((element) => {
    element.dataset.state = data.state;
  });
  document.querySelectorAll("[data-presence]").forEach((element) => {
    element.textContent = `${LABELS[data.state]} on Discord`;
  });
  setText("activity-name", data.activity?.name ?? "No activity shared");
  setText(
    "activity-detail",
    data.activity?.detail ||
      (data.state === "offline" ? "See you around." : "Just hanging out."),
  );
  byId("custom-status").hidden = !data.custom;
  setText("custom-status", data.custom ? `Status: ${data.custom}` : "");
  setText("feed-state", "Live presence · refreshes every 20s");
  byId("retry").hidden = true;
  renderMusic(data.spotify);
}

async function refresh() {
  clearTimeout(pollTimer);
  if (document.hidden || pending) return;
  if (!navigator.onLine) {
    unavailable("You’re offline · waiting for connection");
    return;
  }
  const controller = new AbortController();
  pending = controller;
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(ENDPOINT, {
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok) throw new Error("Presence request failed");
    const data = parsePresence(await response.json());
    if (!controller.signal.aborted && !document.hidden) {
      lastSuccess = Date.now();
      render(data);
    }
  } catch {
    if (!document.hidden) unavailable();
  } finally {
    clearTimeout(timeout);
    pending = null;
    if (!document.hidden) pollTimer = setTimeout(refresh, 20000);
  }
}

function tick() {
  if (document.hidden || !current) return;
  if (Date.now() - lastSuccess > 60000) {
    unavailable();
    return;
  }
  const song = current.spotify;
  if (!song) return;
  const position = trackPosition(song, Date.now());
  if (position.expired) {
    current = { ...current, spotify: null };
    renderMusic(null, true);
    setText("track-artist", "Waiting for a fresh listening update.");
    return;
  }
  setText("elapsed", formatTime(position.elapsed));
  setText("duration", formatTime(position.duration));
  byId("track-progress").max = Math.max(1, position.duration);
  byId("track-progress").value = position.elapsed;
}

byId("album-art").addEventListener("error", () => {
  byId("album-art").hidden = true;
  byId("album-placeholder").hidden = false;
});
byId("retry").addEventListener("click", refresh);
document.addEventListener("visibilitychange", () => {
  clearTimeout(pollTimer);
  if (document.hidden) {
    pending?.abort();
    unavailable("Status paused while this page is hidden");
  } else {
    unavailable("Connecting to presence…");
    refresh();
  }
});
window.addEventListener("offline", () => {
  pending?.abort();
  unavailable("You’re offline · waiting for connection");
});
window.addEventListener("online", refresh);
window.addEventListener("pagehide", () => {
  clearTimeout(pollTimer);
  pending?.abort();
});
window.addEventListener("pageshow", (event) => {
  if (event.persisted) refresh();
});

function setWindow(id, expanded) {
  const section = byId(id);
  const button = section.querySelector("[data-toggle]");
  byId(`${id}-body`).hidden = !expanded;
  button.setAttribute("aria-expanded", String(expanded));
  const names = {
    intro: "introduction",
    activity: "activity monitor",
    projects: "projects",
    neighbours: "bookmarks",
  };
  button.setAttribute(
    "aria-label",
    `${expanded ? "Minimise" : "Restore"} ${names[id]}`,
  );
  button.textContent = expanded ? "_" : "□";
}
document.querySelectorAll("[data-toggle]").forEach((button) => {
  button.hidden = false;
  button.addEventListener("click", () =>
    setWindow(
      button.dataset.toggle,
      button.getAttribute("aria-expanded") !== "true",
    ),
  );
});
document.querySelectorAll("[data-open]").forEach((link) => {
  link.addEventListener("click", () => setWindow(link.dataset.open, true));
});
function revealHash() {
  const id = location.hash.slice(1);
  if (["intro", "activity", "projects", "neighbours"].includes(id))
    setWindow(id, true);
}
window.addEventListener("hashchange", revealHash);
revealHash();
if (navigator.clipboard?.writeText) {
  byId("copy-button").hidden = false;
  byId("copy-button").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(byId("embed-code").textContent);
      setText("copy-result", "Copied!");
    } catch {
      setText("copy-result", "Select and copy the HTML above.");
    }
  });
}
setText("feed-state", "Connecting to presence…");
refresh();
setInterval(tick, 1000);
