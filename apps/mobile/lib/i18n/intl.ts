/**
 * Intl polyfills. Imported before anything formats a number or resolves a plural.
 *
 * Hermes ships Intl, but not the same Intl on both platforms: Android is backed by
 * ICU4J while iOS is backed by Foundation, which has no plural-rules API. So
 * `Intl.PluralRules` — the one thing ICU MessageFormat cannot work without — is also
 * the piece most likely to be missing, and `notation: 'compact'` is ES2023
 * `NumberFormat`, which is missing more widely still. A `toLocaleString` that silently
 * ignores the locale is the failure mode we are buying insurance against: it looks
 * fine in English and wrong in Portuguese.
 *
 * Each `polyfill` entry below installs itself only when the runtime fails formatjs's
 * feature checks, so browsers and full-ICU engines keep their native implementation.
 * The locale data is order-independent: it registers directly when a polyfill is
 * active, and buffers (then gets dropped) when it is not.
 *
 * `en`, `pt`, `pt-BR`, and `es` data is bundled. Adding a locale means adding it here too.
 *
 * The `.js` suffixes are required, not stylistic: these packages only list the
 * suffixed paths in their `exports` map, and Metro and TypeScript both honour it.
 */
import '@formatjs/intl-getcanonicallocales/polyfill.js';
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/es.js';
import '@formatjs/intl-pluralrules/locale-data/pt.js';
import '@formatjs/intl-numberformat/polyfill.js';
import '@formatjs/intl-numberformat/locale-data/en.js';
import '@formatjs/intl-numberformat/locale-data/es.js';
import '@formatjs/intl-numberformat/locale-data/pt.js';
import '@formatjs/intl-numberformat/locale-data/pt-BR.js';
