export const NICHES = [
  "Auto", "Business", "Culture", "Education", "Fashion and Beauty", "Games",
  "General", "Technology", "IT", "House and Homes", "Internet", "Media",
  "Medicine and Health", "Entertainment", "Shopping", "Society", "Sports",
  "Gambling", "Investment", "Banking", "Crypto", "Travel", "Real Estate",
  "Marketing", "News",
];

export const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Spain", "Italy", "Netherlands", "Kenya", "Nigeria",
  "South Africa", "Ghana", "Egypt", "India", "United Arab Emirates",
  "Global / Multi-country",
];

export const LINK_TYPES = [
  { value: "guest_post", label: "Guest Post" },
  { value: "niche_edit", label: "Niche Edit (link insertion)" },
];

export function linkTypeLabel(v: string): string {
  return LINK_TYPES.find((t) => t.value === v)?.label || v;
}
