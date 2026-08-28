// The 5 core markets shown first, then all remaining African states.
export const CORE_COUNTRIES = [
  "Kenya",
  "Nigeria",
  "South Africa",
  "Ghana",
  "Egypt",
];

export const ALL_AFRICAN_COUNTRIES = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros",
  "Republic of the Congo", "Democratic Republic of the Congo", "Cote d'Ivoire",
  "Djibouti", "Egypt", "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia",
  "Gabon", "Gambia", "Ghana", "Guinea", "Guinea-Bissau", "Kenya", "Lesotho",
  "Liberia", "Libya", "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius",
  "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria", "Rwanda",
  "Sao Tome and Principe", "Senegal", "Seychelles", "Sierra Leone", "Somalia",
  "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia",
  "Uganda", "Zambia", "Zimbabwe",
];

// Ordered so the 5 core markets sit first, the rest follow alphabetically.
export const COUNTRIES = [
  ...CORE_COUNTRIES,
  ...ALL_AFRICAN_COUNTRIES.filter((c) => !CORE_COUNTRIES.includes(c)).sort(),
];

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
