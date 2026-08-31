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
