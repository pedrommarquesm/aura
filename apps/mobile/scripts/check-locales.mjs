/**
 * Catalog checks for `locales/*.json`. Run with `npm run locales:check`.
 *
 * There is no test runner in this app yet (roadmap `FND-05`), and these are the i18n
 * failures that reach a user without anyone noticing: a key that exists in English and
 * not in Portuguese, an ICU message with a typo in it, a plural whose categories do not
 * cover the language. All three are invisible until someone opens that screen in that
 * language with that number on it.
 *
 * The i18next configuration comes from `lib/i18n/config.ts`, so this asserts against
 * what the app actually runs. Keep that in sync: this file is plain JS because Node
 * cannot import the TypeScript module directly.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { createInstance } from 'i18next';
import ICU from 'i18next-icu';
import { IntlMessageFormat } from 'intl-messageformat';

const localesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'locales');

const read = (locale) => JSON.parse(readFileSync(join(localesDir, `${locale}.json`), 'utf8'));

const en = read('en');
const pt = read('pt');
const ptBr = read('pt-br');
const es = read('es');

const CATALOGS = { en, pt, 'pt-br': ptBr, es };
const SOURCE_LOCALE = 'en';

const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === 'object' && child !== null ? flatten(child, path) : [[path, child]];
  });
}

const flat = Object.fromEntries(
  Object.entries(CATALOGS).map(([locale, catalog]) => [locale, new Map(flatten(catalog))]),
);

// 1. Every locale carries exactly the keys the source language defines.
const sourceKeys = [...flat[SOURCE_LOCALE].keys()];

for (const [locale, messages] of Object.entries(flat)) {
  if (locale === SOURCE_LOCALE) continue;

  for (const key of sourceKeys) {
    check(messages.has(key), `${locale}: missing key "${key}"`);
  }

  for (const key of messages.keys()) {
    check(flat[SOURCE_LOCALE].has(key), `${locale}: key "${key}" does not exist in en`);
  }
}

// 2. Every message is a non-empty string and parses as ICU MessageFormat for its locale.
for (const [locale, messages] of Object.entries(flat)) {
  for (const [key, message] of messages) {
    if (typeof message !== 'string' || message.trim() === '') {
      check(false, `${locale}: "${key}" is not a non-empty string`);
      continue;
    }

    try {
      new IntlMessageFormat(message, locale);
    } catch (error) {
      check(false, `${locale}: "${key}" is not valid ICU (${error.message})`);
    }
  }
}

// 3. A representative set of keys resolves through the app's own i18next configuration.
const SAMPLES = [
  ['common.auraAmount', { amount: 12421 }],
  ['feed.post.likes', { count: 1 }],
  ['feed.post.likes', { count: 12421 }],
  ['feed.post.auraGain', { amount: 10 }],
  ['leaderboard.rank', { rank: 42 }],
  ['leaderboard.rank', { rank: 12421 }],
  ['leaderboard.place', { rank: 1 }],
  ['leaderboard.place', { rank: 2 }],
  ['leaderboard.place', { rank: 3 }],
  ['leaderboard.place', { rank: 42 }],
  ['profile.globalRank', { rank: 47 }],
  ['discover.challenges.endsIn', { hours: 1 }],
  ['discover.challenges.endsIn', { hours: 9 }],
  ['discover.challenges.entries', { count: 1 }],
  ['discover.challenges.entries', { count: 2140 }],
  ['nav.discover', {}],
  ['auth.reasons.like.title', {}],
  ['auth.username.submit', {}],
  ['errors.cannot_like_own_post', {}],
];

/** Mirrors `i18nOptions()` in `lib/i18n/config.ts`. */
function options(language, resources) {
  return {
    resources,
    lng: language,
    fallbackLng: SOURCE_LOCALE,
    supportedLngs: Object.keys(CATALOGS),
    defaultNS: 'translation',
    ns: ['translation'],
    load: 'currentOnly',
    interpolation: { escapeValue: false },
  };
}

async function instanceFor(language, catalogs = CATALOGS) {
  const resources = Object.fromEntries(
    Object.entries(catalogs).map(([locale, catalog]) => [locale, { translation: catalog }]),
  );

  const i18n = createInstance();
  await i18n.use(ICU).init(options(language, resources));
  return i18n;
}

for (const locale of Object.keys(CATALOGS)) {
  const i18n = await instanceFor(locale);
  console.log(`\n${locale}`);

  for (const [key, args] of SAMPLES) {
    const value = i18n.t(key, args);
    const shown = Object.keys(args).length ? `${key} ${JSON.stringify(args)}` : key;
    console.log(`  ${shown.padEnd(46)} ${value}`);

    check(!value.startsWith(key), `${locale}: "${key}" resolved to the key itself`);
  }

  // Numbers must be grouped by the active locale, never by a baked-in separator.
  const expectedGroup = locale === 'en' ? '12,421' : '12.421';
  check(
    i18n.t('common.auraAmount', { amount: 12_421 }).includes(expectedGroup),
    `${locale}: expected "${expectedGroup}" in common.auraAmount`,
  );
}

// 4. A key missing from a translation falls back to English rather than rendering raw.
const strippedPt = structuredClone(pt);
delete strippedPt.feed.empty.title;

const fallback = await instanceFor('pt', { en, pt: strippedPt });
const fallbackValue = fallback.t('feed.empty.title');

console.log(`\nfallback (pt without feed.empty.title) -> ${fallbackValue}`);
check(
  fallbackValue === en.feed.empty.title,
  `pt: missing key did not fall back to English (got "${fallbackValue}")`,
);

if (failures.length > 0) {
  console.error(`\n${failures.length} problem(s):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

console.log(`\nOK — ${sourceKeys.length} keys in ${Object.keys(CATALOGS).length} locales`);
