// 09:35 in Europe/Brussels was UTC+02:00 on 9 October 1998.
// Use elapsed Unix time, like the browser clock (no leap-second adjustment).
export const BIRTH_TIME = Date.parse("1998-10-09T09:35:00+02:00");
const DAY = 86400;
const YEAR = 365.25 * DAY;

export const AGE_UNITS = [
  { label: "seconds", seconds: 1, detail: "1 second" },
  { label: "minutes", seconds: 60, detail: "60 seconds" },
  { label: "days", seconds: DAY, detail: "24 hours" },
  { label: "fortnights", seconds: 14 * DAY, detail: "14 days" },
  { label: "Julian years", seconds: YEAR, detail: "365.25 days" },
  { label: "frames at 60 fps", seconds: 1 / 60, detail: "1/60 of a second" },
  // NIST: https://www.nist.gov/pml/special-publication-330/sp-330-section-2
  { label: "caesium-133 ticks", seconds: 1 / 9192631770, detail: "1/9,192,631,770 of a second" },
  // Rounded half-lives from NRC; years converted using 365.25 days.
  // https://www.nrc.gov/licensing-applications/national-source-tracking-system/frequently-asked-questions-about-the-national-source-tracking-system
  { label: "cobalt-60 half-lives", seconds: 5.27 * YEAR, detail: "≈ 5.27 years" },
  { label: "caesium-137 half-lives", seconds: 30.1 * YEAR, detail: "≈ 30.1 years" },
  { label: "selenium-75 half-lives", seconds: 119.8 * DAY, detail: "≈ 119.8 days" },
  { label: "ytterbium-169 half-lives", seconds: 32 * DAY, detail: "≈ 32 days" },
  { label: "plutonium-239 half-lives", seconds: 24110 * YEAR, detail: "≈ 24,110 years" },
];

export function ageInUnit(now, unit) {
  return Math.max(0, (now - BIRTH_TIME) / 1000) / unit.seconds;
}

export function nextUnitIndex(current, random = Math.random()) {
  // Uniform choice among every unit except the one already displayed.
  return (current + 1 + Math.floor(random * (AGE_UNITS.length - 1))) % AGE_UNITS.length;
}

const secondsFormat = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const unitFormat = new Intl.NumberFormat("en", { maximumSignificantDigits: 7 });
const largeFormat = new Intl.NumberFormat("en", {
  notation: "scientific",
  maximumFractionDigits: 6,
});

export function formatAge(now, unit) {
  const value = ageInUnit(now, unit);
  if (unit === AGE_UNITS[0]) return secondsFormat.format(Math.floor(value));
  return (value >= 1e12 ? largeFormat : unitFormat).format(value);
}
