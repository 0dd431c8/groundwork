import { type InspectColor, styleText } from 'node:util';

/** Where a table prints. Vite's `config.logger` satisfies it, and so does a stub in a test. */
export type Log = { info: (msg: string) => void };

// First match wins; anything unmatched falls into `other`.
const BUCKETS = [
  ['js', /\.js$/u],
  ['css', /\.css$/u],
  ['fonts', /\.(?:woff2?|ttf|otf|eot)$/u],
  ['images', /\.(?:png|jpe?g|webp|avif|gif|svg|ico)$/u],
] as const;

export const bucketOf = (name: string): string =>
  BUCKETS.find(([, test]) => test.test(name))?.[0] ?? 'other';

export const sum = <T>(rows: readonly T[], pick: (r: T) => number): number =>
  rows.reduce((a, r) => a + pick(r), 0);

const kB = (n: number): string => `${(n / 1000).toFixed(2)} kB`.padStart(9);

const files = (n: number): string => `${String(n)} file${n === 1 ? '' : 's'}`;

// `styleText` checks TTY, NO_COLOR and FORCE_COLOR itself and returns the string untouched when
// colour is unwanted, so a build piped into a log file needs no flag.
export type Paint = (s: string) => string;

const paint =
  (...format: InspectColor[]): Paint =>
  (s) =>
    styleText(format, s);

const plain: Paint = (s) => s;
const dim = paint('dim');
const bold = paint('bold');

// Green is missing on purpose: the size column uses it to mean "this shrank".
const TINTS: Record<string, Paint> = {
  js: paint('cyan'),
  css: paint('magenta'),
  fonts: paint('yellow'),
  images: paint('blue'),
};

export const tintOf = (bucket: string): Paint => TINTS[bucket] ?? plain;

/** How a row's two size columns are painted. `gain` applies only when the file got smaller. */
type Style = { size: Paint; gain: Paint };
const DATA: Style = { size: dim, gain: paint('green') };
const TOTAL: Style = { size: bold, gain: paint('bold', 'green') };

// Vite names an asset `[name]-[hash]` with an 8-character base64url hash.
const HASH = /-[\w-]{8}(?=\.[^.]*$)/u;

// Dimming the directory and the hash leaves the part of the name that identifies the file.
function decorate(name: string, tint: Paint): string {
  const cut = name.lastIndexOf('/') + 1;
  const dir = cut === 0 ? '' : dim(name.slice(0, cut));
  const base = name.slice(cut);
  const hash = HASH.exec(base);
  if (!hash) return dir + tint(base);
  const [end, text] = [hash.index + hash[0].length, hash[0]];
  return dir + tint(base.slice(0, hash.index)) + dim(text) + tint(base.slice(end));
}

const pct = (before: number, after: number): string => {
  const change = before === 0 ? 0 : Math.round(((after - before) / before) * 100);
  return `${String(change)}%`.padStart(5);
};

export type Line = { name: string; tint: Paint; before: number; after: number };

const row = (label: string, before: number, after: number, style: Style): string =>
  `  ${label} ${style.size(kB(before))} ${dim('→')} ${(after < before ? style.gain : style.size)(kB(after))} ${style.size(pct(before, after))}`;

// One renderer for all three build tables. Widths are measured on the plain name and never on the
// decorated one, since `padEnd` counts escape bytes as characters and would shift every column
// right by the width of that row's own colour codes. `count` is for a table whose lines are
// buckets rather than files, where the total label has to say how many files they stand for.
export function table(
  log: Log,
  title: string,
  note: string,
  lines: readonly Line[],
  count = lines.length,
): void {
  if (lines.length === 0) return;
  const total = files(count);
  const width = Math.max(...lines.map((l) => l.name.length), total.length);

  log.info(`\n${bold(title)}${note === '' ? '' : ` ${dim(note)}`}`);
  for (const l of lines) {
    log.info(
      row(decorate(l.name, l.tint) + ' '.repeat(width - l.name.length), l.before, l.after, DATA),
    );
  }
  const [before, after] = [sum(lines, (l) => l.before), sum(lines, (l) => l.after)];
  log.info(row(bold(total.padEnd(width)), before, after, TOTAL));
}
