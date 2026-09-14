// The demo sandbox.
//
// A demo account sees ONLY demo inventory, and a real account never sees any of
// it. That separation is a single boolean on User and on Listing, and it has to
// be applied at every buyer-facing listing query - miss one and a prospect
// being shown the platform is looking at real publishers' sites and prices, or
// a real buyer finds five invented websites in the marketplace.
//
// Everything the demo needs is created by resetDemoDataAction in
// app/actions/demo.ts, which an admin runs from Admin -> Users.

export const DEMO_BUYER_EMAIL = "demo.buyer@welcometomorrow.io";
export const DEMO_PUBLISHER_EMAIL = "demo.publisher@welcometomorrow.io";

/** Wallet balance the demo buyer starts with, so an order can be placed. */
export const DEMO_BALANCE_CENTS = 50000; // $500

/**
 * The listing filter for a given viewer. Pass it into every buyer-facing query.
 * A signed-out visitor is treated as real, so the public marketplace never
 * shows demo inventory.
 */
export function demoScope(viewer: { isDemo?: boolean | null } | null | undefined) {
  return { isDemo: !!viewer?.isDemo };
}

/**
 * The five demo websites.
 *
 * Two of them are attributed to the demo buyer, so they price at the reduced
 * rate for that buyer only. One of those two costs exactly the same as one of
 * the three that are not, which is the whole point: the demo buyer can see the
 * two side by side in the marketplace and the difference is obvious without
 * anybody explaining it.
 *
 *   nairobidailyreview.co.ke  $150  invited by the demo buyer
 *   capetownledger.co.za      $150  not invited   <- the comparison pair
 */
export type DemoSite = {
  domain: string;
  country: string;
  category: string;
  priceUsd: number;
  traffic: number;
  dr: number;
  da?: number;
  tatDays: number;
  invited: boolean;
  description: string;
};

export const DEMO_SITES: DemoSite[] = [
  {
    domain: "nairobidailyreview.co.ke",
    country: "Kenya",
    category: "Business,Finance",
    priceUsd: 150,
    traffic: 48000,
    dr: 42,
    tatDays: 7,
    invited: true,
    description: "Daily business and markets coverage for a Kenyan readership.",
  },
  {
    domain: "capetownledger.co.za",
    country: "South Africa",
    category: "Business,Technology",
    priceUsd: 150,
    traffic: 51000,
    dr: 44,
    tatDays: 7,
    invited: false,
    description: "Business and technology reporting out of Cape Town.",
  },
  {
    domain: "lagosbusinesspulse.ng",
    country: "Nigeria",
    category: "Business,General",
    priceUsd: 90,
    traffic: 22000,
    dr: 31,
    tatDays: 5,
    invited: true,
    description: "Small business and startup news for Lagos and the south west.",
  },
  {
    domain: "accratechweekly.com.gh",
    country: "Ghana",
    category: "Technology",
    priceUsd: 220,
    traffic: 76000,
    dr: 0,
    da: 51,
    tatDays: 10,
    invited: false,
    description: "Weekly technology and telecoms coverage across Ghana.",
  },
  {
    domain: "kampalaherald.ug",
    country: "Uganda",
    category: "General,Travel",
    priceUsd: 400,
    traffic: 134000,
    dr: 56,
    tatDays: 7,
    invited: false,
    description: "General news and travel features with national reach in Uganda.",
  },
];
