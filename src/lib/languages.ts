/**
 * Language code utilities
 * Maps ISO 639-2/3 codes to display names
 */

// Common language codes (ISO 639-2/3) to display names
const LANGUAGE_NAMES: Record<string, string> = {
  // Common languages
  eng: 'English',
  en: 'English',
  spa: 'Spanish',
  es: 'Spanish',
  fra: 'French',
  fr: 'French',
  deu: 'German',
  de: 'German',
  ger: 'German',
  ita: 'Italian',
  it: 'Italian',
  por: 'Portuguese',
  pt: 'Portuguese',
  rus: 'Russian',
  ru: 'Russian',
  jpn: 'Japanese',
  ja: 'Japanese',
  zho: 'Chinese',
  zh: 'Chinese',
  chi: 'Chinese',
  cmn: 'Mandarin',
  yue: 'Cantonese',
  kor: 'Korean',
  ko: 'Korean',
  ara: 'Arabic',
  ar: 'Arabic',
  hin: 'Hindi',
  hi: 'Hindi',
  tha: 'Thai',
  th: 'Thai',
  vie: 'Vietnamese',
  vi: 'Vietnamese',
  pol: 'Polish',
  pl: 'Polish',
  nld: 'Dutch',
  nl: 'Dutch',
  dut: 'Dutch',
  swe: 'Swedish',
  sv: 'Swedish',
  dan: 'Danish',
  da: 'Danish',
  nor: 'Norwegian',
  no: 'Norwegian',
  nob: 'Norwegian Bokmål',
  nno: 'Norwegian Nynorsk',
  fin: 'Finnish',
  fi: 'Finnish',
  tur: 'Turkish',
  tr: 'Turkish',
  heb: 'Hebrew',
  he: 'Hebrew',
  hun: 'Hungarian',
  hu: 'Hungarian',
  ces: 'Czech',
  cs: 'Czech',
  cze: 'Czech',
  ron: 'Romanian',
  ro: 'Romanian',
  rum: 'Romanian',
  ell: 'Greek',
  el: 'Greek',
  gre: 'Greek',
  ukr: 'Ukrainian',
  uk: 'Ukrainian',
  bul: 'Bulgarian',
  bg: 'Bulgarian',
  hrv: 'Croatian',
  hr: 'Croatian',
  srp: 'Serbian',
  sr: 'Serbian',
  slv: 'Slovenian',
  sl: 'Slovenian',
  slk: 'Slovak',
  sk: 'Slovak',
  slo: 'Slovak',
  ind: 'Indonesian',
  id: 'Indonesian',
  msa: 'Malay',
  ms: 'Malay',
  may: 'Malay',
  fil: 'Filipino',
  tl: 'Tagalog',
  tgl: 'Tagalog',
  ben: 'Bengali',
  bn: 'Bengali',
  tam: 'Tamil',
  ta: 'Tamil',
  tel: 'Telugu',
  te: 'Telugu',
  mar: 'Marathi',
  mr: 'Marathi',
  guj: 'Gujarati',
  gu: 'Gujarati',
  kan: 'Kannada',
  kn: 'Kannada',
  mal: 'Malayalam',
  ml: 'Malayalam',
  pan: 'Punjabi',
  pa: 'Punjabi',
  urd: 'Urdu',
  ur: 'Urdu',
  fas: 'Persian',
  fa: 'Persian',
  per: 'Persian',
  cat: 'Catalan',
  ca: 'Catalan',
  eus: 'Basque',
  eu: 'Basque',
  baq: 'Basque',
  glg: 'Galician',
  gl: 'Galician',
  lat: 'Latin',
  la: 'Latin',
  // Special codes
  und: 'Undetermined',
  zxx: 'No linguistic content',
  mul: 'Multiple languages',
  mis: 'Miscellaneous',
  qaa: 'Reserved',
};

/**
 * Get display name for a language code
 * @param code - ISO 639-2/3 language code (e.g., "eng", "en", "jpn")
 * @returns Display name (e.g., "English") or the code itself if unknown
 */
export function getLanguageName(code: string): string {
  if (!code) return 'Unknown';
  const normalized = code.toLowerCase().trim();
  return LANGUAGE_NAMES[normalized] || code.toUpperCase();
}

/**
 * Parse a JSON array of language codes and return display-ready format
 * @param jsonString - JSON array string like '["eng","jpn"]'
 * @returns Array of { code, name } objects
 */
export function parseLanguages(jsonString: string | null): Array<{ code: string; name: string }> {
  if (!jsonString) return [];

  try {
    const codes = JSON.parse(jsonString);
    if (!Array.isArray(codes)) return [];

    return codes
      .filter((code): code is string => typeof code === 'string' && code.length > 0)
      .map((code) => ({
        code: code.toLowerCase(),
        name: getLanguageName(code),
      }));
  } catch {
    // If it's not JSON, try to parse as comma-separated
    return jsonString
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((code) => ({
        code: code.toLowerCase(),
        name: getLanguageName(code),
      }));
  }
}
