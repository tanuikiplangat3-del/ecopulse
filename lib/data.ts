// The 5 core markets shown first, then all remaining African states.
export const CORE_COUNTRIES = [
  "Kenya",
  "Nigeria",
  "South Africa",
  "Ghana",
  "Egypt",
];

// All 54 African states (UN members). Kept complete and separate on purpose.
export const ALL_AFRICAN_COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde",
  "Cameroon", "Central African Republic", "Chad", "Comoros", "Cote d'Ivoire",
  "Democratic Republic of the Congo", "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea",
  "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Kenya",
  "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius",
  "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Republic of the Congo", "Rwanda",
  "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone", "Somalia",
  "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda", "Zambia",
  "Zimbabwe",
];

// Every other country, so publishers outside Africa can list too.
export const REST_OF_WORLD_COUNTRIES = [
  "Afghanistan", "Albania", "Andorra", "Antigua and Barbuda", "Argentina", "Armenia",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Bhutan", "Bolivia", "Bosnia and Herzegovina", "Brazil",
  "Brunei", "Bulgaria", "Cambodia", "Canada", "Chile", "China", "Colombia", "Costa Rica",
  "Croatia", "Cuba", "Cyprus", "Czechia", "Denmark", "Dominica", "Dominican Republic",
  "Ecuador", "El Salvador", "Estonia", "Fiji", "Finland", "France", "Georgia", "Germany",
  "Greece", "Grenada", "Guatemala", "Guyana", "Haiti", "Honduras", "Hong Kong", "Hungary",
  "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy", "Jamaica",
  "Japan", "Jordan", "Kazakhstan", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan", "Laos",
  "Latvia", "Lebanon", "Liechtenstein", "Lithuania", "Luxembourg", "Malaysia", "Maldives",
  "Malta", "Marshall Islands", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia",
  "Montenegro", "Myanmar", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua",
  "North Korea", "North Macedonia", "Norway", "Oman", "Pakistan", "Palau", "Palestine",
  "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
  "Puerto Rico", "Qatar", "Romania", "Russia", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Saudi Arabia", "Serbia",
  "Singapore", "Slovakia", "Slovenia", "Solomon Islands", "South Korea", "Spain",
  "Sri Lanka", "Suriname", "Sweden", "Switzerland", "Syria", "Taiwan", "Tajikistan",
  "Thailand", "Timor-Leste", "Tonga", "Trinidad and Tobago", "Turkey", "Turkmenistan",
  "Tuvalu", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay",
  "Uzbekistan", "Vanuatu", "Vatican City", "Venezuela", "Vietnam", "Yemen",
];

/**
 * Order shown in every country dropdown: the 5 core markets first, then the rest
 * of Africa, then the rest of the world. The pickers are searchable, so a long
 * list stays easy to use while African publishers still surface first.
 */
export const COUNTRIES = [
  ...CORE_COUNTRIES,
  ...ALL_AFRICAN_COUNTRIES.filter((c) => !CORE_COUNTRIES.includes(c)).sort(),
  ...REST_OF_WORLD_COUNTRIES.filter((c) => !CORE_COUNTRIES.includes(c)).sort(),
];

/* ---------------------------------------------------------------------------
 * Matching country names that arrive from a spreadsheet
 *
 * Bulk uploads used to store whatever the sheet said, verbatim. A sheet saying
 * "dr congo" was saved as "dr congo", which never matched the marketplace
 * filter (it looks for "Democratic Republic of the Congo"), so those sites
 * existed but could not be found by country.
 *
 * normalizeCountry() maps a free-text cell onto one of the 199 names above:
 * case, accents, punctuation and "the" are ignored, and the alias table below
 * covers the short forms and old names people actually type.
 * ------------------------------------------------------------------------- */

/** Strip everything that is only spelling, so "Côte d'Ivoire" == "cote divoire". */
function countryKey(raw: string, dropParens = false): string {
  return String(raw)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // drop accents: Cote -> Cote
    .toLowerCase()
    // A bracket can carry the answer ("Congo (Kinshasa)") or noise
    // ("Kenya (Nairobi)"), so we read it both ways - see normalizeCountry.
    .replace(/\(.*?\)/g, dropParens ? " " : " $& ")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the /, "")
    .trim();
}

// Left side is what a sheet might say; right side is the canonical name.
// Note on "Congo" on its own: ISO 3166 uses plain "Congo" for the Republic of
// the Congo (Brazzaville), so that is what a bare "congo" maps to. Anything
// mentioning "dr", "democratic" or "kinshasa" goes to the DRC.
const COUNTRY_ALIASES: Record<string, string> = {
  // Africa
  "drc": "Democratic Republic of the Congo",
  "dr congo": "Democratic Republic of the Congo",
  "d r congo": "Democratic Republic of the Congo",
  "dr c": "Democratic Republic of the Congo",
  "congo dr": "Democratic Republic of the Congo",
  "congo drc": "Democratic Republic of the Congo",
  "congo kinshasa": "Democratic Republic of the Congo",
  "democratic republic of congo": "Democratic Republic of the Congo",
  "democratic republic congo": "Democratic Republic of the Congo",
  "dem rep congo": "Democratic Republic of the Congo",
  "congo democratic republic": "Democratic Republic of the Congo",
  "congo democratic republic of": "Democratic Republic of the Congo",
  "zaire": "Democratic Republic of the Congo",
  "congo": "Republic of the Congo",
  "congo brazzaville": "Republic of the Congo",
  "republic of congo": "Republic of the Congo",
  "congo republic": "Republic of the Congo",
  "ivory coast": "Cote d'Ivoire",
  "cote divoire": "Cote d'Ivoire",
  "cote d ivoire": "Cote d'Ivoire",
  "swaziland": "Eswatini",
  "cape verde": "Cabo Verde",
  "united republic of tanzania": "Tanzania",
  "tanzania united republic of": "Tanzania",
  "somaliland": "Somalia",
  "burkina": "Burkina Faso",
  "central african rep": "Central African Republic",
  "sao tome": "Sao Tome and Principe",
  "sao tome principe": "Sao Tome and Principe",
  "s tome and principe": "Sao Tome and Principe",
  "rsa": "South Africa",
  "republic of south africa": "South Africa",
  "arab republic of egypt": "Egypt",
  "libyan arab jamahiriya": "Libya",
  "guinea conakry": "Guinea",
  "guinea bissao": "Guinea-Bissau",
  "federal republic of nigeria": "Nigeria",
  "republic of kenya": "Kenya",
  "gambia": "Gambia",
  // Europe
  "uk": "United Kingdom",
  "u k": "United Kingdom",
  "gb": "United Kingdom",
  "great britain": "United Kingdom",
  "britain": "United Kingdom",
  "england": "United Kingdom",
  "scotland": "United Kingdom",
  "wales": "United Kingdom",
  "northern ireland": "United Kingdom",
  "united kingdom of great britain and northern ireland": "United Kingdom",
  "czech republic": "Czechia",
  "czech": "Czechia",
  "holland": "Netherlands",
  "macedonia": "North Macedonia",
  "fyrom": "North Macedonia",
  "bosnia": "Bosnia and Herzegovina",
  "bosnia herzegovina": "Bosnia and Herzegovina",
  "vatican": "Vatican City",
  "holy see": "Vatican City",
  "russian federation": "Russia",
  "republic of moldova": "Moldova",
  "moldova republic of": "Moldova",
  "turkiye": "Turkey",
  "republic of ireland": "Ireland",
  "eire": "Ireland",
  "deutschland": "Germany",
  "espana": "Spain",
  "italia": "Italy",
  // Americas
  "usa": "United States",
  "us": "United States",
  "u s": "United States",
  "u s a": "United States",
  "america": "United States",
  "united states of america": "United States",
  "dominican rep": "Dominican Republic",
  "st lucia": "Saint Lucia",
  "st kitts": "Saint Kitts and Nevis",
  "st kitts and nevis": "Saint Kitts and Nevis",
  "st vincent": "Saint Vincent and the Grenadines",
  "st vincent and grenadines": "Saint Vincent and the Grenadines",
  "trinidad": "Trinidad and Tobago",
  "antigua": "Antigua and Barbuda",
  "bolivia plurinational state of": "Bolivia",
  "venezuela bolivarian republic of": "Venezuela",
  // Asia, Middle East, Oceania
  "uae": "United Arab Emirates",
  "u a e": "United Arab Emirates",
  "emirates": "United Arab Emirates",
  "dubai": "United Arab Emirates",
  "abu dhabi": "United Arab Emirates",
  "ksa": "Saudi Arabia",
  "saudi": "Saudi Arabia",
  "kingdom of saudi arabia": "Saudi Arabia",
  "korea": "South Korea",
  "republic of korea": "South Korea",
  "korea south": "South Korea",
  "korea rep": "South Korea",
  "dprk": "North Korea",
  "korea north": "North Korea",
  "burma": "Myanmar",
  "east timor": "Timor-Leste",
  "lao pdr": "Laos",
  "lao peoples democratic republic": "Laos",
  "viet nam": "Vietnam",
  "islamic republic of iran": "Iran",
  "syrian arab republic": "Syria",
  "brunei darussalam": "Brunei",
  "hk": "Hong Kong",
  "hong kong sar": "Hong Kong",
  "palestinian territories": "Palestine",
  "west bank": "Palestine",
  "gaza": "Palestine",
  "state of palestine": "Palestine",
  "republic of china": "Taiwan",
  "chinese taipei": "Taiwan",
  "peoples republic of china": "China",
  "nz": "New Zealand",
  "aus": "Australia",
  "png": "Papua New Guinea",
  "papua": "Papua New Guinea",
  "srilanka": "Sri Lanka",
  "kyrgyz republic": "Kyrgyzstan",
  "micronesia federated states of": "Micronesia",
};

// key -> canonical name, built once from the country list plus the aliases.
const COUNTRY_BY_KEY: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const c of COUNTRIES) m[countryKey(c)] = c;
  for (const [alias, canonical] of Object.entries(COUNTRY_ALIASES)) {
    m[countryKey(alias)] = canonical;
  }
  return m;
})();

/**
 * Turn a free-text country cell into one of the names in COUNTRIES.
 * Returns null when nothing matches, so the caller can report it instead of
 * silently filing the site under the wrong country.
 */
export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Read the brackets first ("Congo (Kinshasa)" is the DRC), then ignore them
  // ("Kenya (Nairobi)" is just Kenya).
  const whole = COUNTRY_BY_KEY[countryKey(raw)] || COUNTRY_BY_KEY[countryKey(raw, true)];
  if (whole) return whole;
  // "Kenya / Uganda" or "Kenya - East Africa": take the first part we recognise.
  for (const part of String(raw).split(/[,/|;\\]|\s+-\s+/)) {
    const hit = COUNTRY_BY_KEY[countryKey(part)] || COUNTRY_BY_KEY[countryKey(part, true)];
    if (hit) return hit;
  }
  return null;
}

export const CORE_NICHES = [
  "Business", "Technology", "Finance", "Sports", "Health",
];

export const ALL_NICHES = [
  "Business", "Technology", "Finance", "Sports", "Health", "Auto",
  "Culture", "Education", "Fashion and Beauty", "Games", "General",
  "IT", "House and Homes", "Internet", "Media", "Entertainment",
  "Shopping", "Society", "Gambling", "Investment", "Banking", "Crypto",
  "Travel", "Real Estate", "Marketing", "News",
];

export const NICHES = [
  ...CORE_NICHES,
  ...ALL_NICHES.filter((n) => !CORE_NICHES.includes(n)),
];

export const CORE_LANGUAGES = ["English", "French", "Arabic", "Swahili", "Portuguese"];

export const ALL_LANGUAGES = [
  "English", "French", "Arabic", "Swahili", "Portuguese", "Amharic", "Hausa",
  "Yoruba", "Igbo", "Zulu", "Xhosa", "Afrikaans", "Somali", "Oromo", "Shona",
  "Twi", "Wolof", "Lingala", "Kinyarwanda", "Tigrinya", "Spanish", "German",
];

export const LANGUAGES = [
  ...CORE_LANGUAGES,
  ...ALL_LANGUAGES.filter((l) => !CORE_LANGUAGES.includes(l)),
];

export const LINK_TYPES = [
  { value: "guest_post", label: "Guest Post" },
  { value: "niche_edit", label: "Niche Edit (link insertion)" },
];

export function linkTypeLabel(v: string): string {
  return LINK_TYPES.find((t) => t.value === v)?.label || v;
}

/**
 * Prisma clause matching listings whose category list contains `niche` as a
 * WHOLE entry.
 *
 * Categories are stored as one comma-separated string ("Business, Finance"),
 * so the filter used to be a plain `contains`. That is wrong, and quietly so:
 * "IT" is one of our niches, and a spreadsheet category written "DIGITAL
 * MARKETING" contains the letters I-T inside "DIGITAL" - so filtering for IT
 * returned it. Same for any niche that happens to sit inside a longer word.
 *
 * Matching whole entries removes that entire class of false hit. Sheets
 * separate with "," or ", " depending on who typed them, so both are covered.
 */
export function nicheWhere(niche: string) {
  const n = niche.trim();
  return {
    OR: [
      { category: n },                              // the only niche on the site
      { category: { startsWith: `${n},` } },        // first in the list
      { category: { endsWith: `,${n}` } },          // last, no space
      { category: { endsWith: `, ${n}` } },         // last, with a space
      { category: { contains: `,${n},` } },         // in the middle, no spaces
      { category: { contains: `, ${n},` } },        // in the middle, with a space
    ],
  };
}
