import { LegalShell, LegalSection, LegalP, LegalList, LegalItem } from "@/components/Legal";

export const metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for the Link Tomorrow marketplace, operated by Welcome Tomorrow.",
};

export default function TermsPage() {
  return (
    <LegalShell
      title="Terms of Service"
      meta="LinkTomorrow Marketplace (by Welcome Tomorrow) · Effective Date: September 1, 2026 · Governing Jurisdiction: Dubai, UAE"
      footnote={
        <>
          <p>LinkTomorrow is a registered trademark of Welcome Tomorrow.</p>
          <p>Registered Address: Dubai, United Arab Emirates.</p>
          <p>
            Contact:{" "}
            <a href="mailto:legal@welcometomorrow.io" className="text-wt-green hover:underline">
              legal@welcometomorrow.io
            </a>
          </p>
        </>
      }
    >
      <LegalP>
        Welcome to LinkTomorrow (the &quot;Platform&quot;), a digital marketplace operated by Welcome
        Tomorrow, a company registered in Dubai, United Arab Emirates (hereinafter &quot;Company&quot;,
        &quot;we&quot;, &quot;us&quot;, or &quot;our&quot;).
      </LegalP>
      <LegalP>
        By registering an account, placing an order, or fulfilling a service on the Platform, you
        (&quot;User&quot;, &quot;Buyer&quot;, or &quot;Publisher&quot;) agree to be bound by these Terms of
        Service. If you do not agree to these terms, you must not use the Platform.
      </LegalP>

      <LegalSection n={1} title="Platform Role & Intermediary Agent Status">
        <LegalP lead="1.1 Intermediary Agent:">
          LinkTomorrow operates exclusively as a technology platform and Intermediary Agent. We
          facilitate connections, manage order flow, and provide escrow payment services between
          independent Buyers and Publishers.
        </LegalP>
        <LegalP lead="1.2 No Direct Provision of Service:">
          The Company does not own, control, or operate the Publisher websites listed on the
          Platform. The legal contract for the publication of any content or backlink is formed
          directly between the Buyer and the Publisher. We are not responsible for the editorial
          decisions of Publishers or the long-term operational status of their websites.
        </LegalP>
      </LegalSection>

      <LegalSection n={2} title="User Accounts & Definitions">
        <LegalList>
          <LegalItem term="Buyer:">
            An individual or corporate entity purchasing sponsored content, digital PR, or backlink
            placements.
          </LegalItem>
          <LegalItem term="Publisher:">
            An individual or entity that owns, or holds authorized representation rights for, a
            website listed on the Platform for the purpose of selling sponsored placements.
          </LegalItem>
          <LegalItem term="Placement:">
            A published article, guest post, or text link provided by a Publisher on their respective
            domain.
          </LegalItem>
        </LegalList>
      </LegalSection>

      <LegalSection n={3} title="Platform Mechanics & SLAs">
        <LegalP lead="3.1 Order Placement:">
          Buyers submit content or content requirements alongside the target URL and anchor text.
          Order fees are deducted from the Buyer&apos;s pre-funded Wallet Balance.
        </LegalP>
        <LegalP lead="3.2 Publisher Acceptance:">
          Publishers have seventy-two (72) hours to accept or decline an order. If declined or
          ignored, the order is cancelled, and the funds are returned to the Buyer&apos;s Wallet
          Balance.
        </LegalP>
        <LegalP lead="3.3 Delivery Window:">
          Upon acceptance, Publishers have seven to ten (7&ndash;10) business days to publish the
          Placement and submit the live URL for verification.
        </LegalP>
        <LegalP lead="3.4 The 12-Month Guarantee:">
          Publishers warrant that Placements will remain live, indexed, and structurally sound (e.g.,
          retaining &quot;do-follow&quot; status, if requested) for a minimum of 365 days from the date
          of publication. If a Placement is removed or altered before this period, it is subject to
          our Refund &amp; Wallet Credit Policy.
        </LegalP>
      </LegalSection>

      <LegalSection n={4} title="Non-Circumvention (Anti-Bypassing) Policy">
        <LegalP lead="Strict Prohibition:">
          The value of LinkTomorrow lies in its vetted marketplace and secure escrow system. Users
          are strictly prohibited from attempting to circumvent the Platform to transact directly.
        </LegalP>
        <LegalP>
          For twenty-four (24) months following the initial discovery of a Publisher or Buyer through
          LinkTomorrow, Users agree not to:
        </LegalP>
        <LegalList ordered>
          <LegalItem>
            Contact the counterparty directly via email, social media, or other channels to solicit
            direct business outside the Platform.
          </LegalItem>
          <LegalItem>
            Share direct contact information (emails, phone numbers, Skype/Telegram handles) within
            Platform messaging.
          </LegalItem>
          <LegalItem>
            Cancel an order on the Platform only to fulfill the exact same Placement directly.
          </LegalItem>
        </LegalList>
        <LegalP lead="Penalty for Breach:">
          Violation of this clause will result in immediate and permanent account termination,
          forfeiture of any pending Wallet Balances, and potential legal action for lost commissions.
        </LegalP>
      </LegalSection>

      <LegalSection n={5} title="SEO, Search Engine Algorithms & Risk Disclaimer">
        <LegalP lead="5.1 No Ranking Guarantees:">
          LinkTomorrow provides no guarantees regarding search engine rankings, domain authority
          increases, organic traffic, or indexation speeds. Placements are sold as digital PR and
          marketing real estate.
        </LegalP>
        <LegalP lead="5.2 Algorithm Volatility:">
          Search engines (including Google, Bing) frequently update their algorithms and spam
          policies. Placements may be devalued, or websites penalized, entirely at the discretion of
          the search engine. The Buyer accepts full liability for the SEO strategy they employ.
        </LegalP>
        <LegalP lead="5.3 Link Attributes:">
          Unless otherwise specified, Placements are assumed to be standard navigational links. The
          Platform does not guarantee immunity from manual penalties applied by search engines
          regarding &quot;link selling&quot; schemes.
        </LegalP>
      </LegalSection>

      <LegalSection n={6} title="Prohibited Content">
        <LegalP>
          Publishers and Buyers may not use the Platform to order or publish content related to:
        </LegalP>
        <LegalList>
          <LegalItem>Illegal activities, malware, or phishing schemes.</LegalItem>
          <LegalItem>Hate speech, harassment, or defamatory material.</LegalItem>
          <LegalItem>
            Unless explicitly permitted in a restricted category: Adult content, unregulated
            gambling, unauthorized pharmaceuticals, or illicit substances.
          </LegalItem>
        </LegalList>
      </LegalSection>

      <LegalSection n={7} title="Limitation of Liability">
        <LegalP>
          To the maximum extent permitted by applicable UAE law, Welcome Tomorrow shall not be liable
          for any indirect, incidental, special, consequential, or punitive damages, including loss of
          profits, data, or digital assets resulting from the use or inability to use the Platform.
          Our total aggregate liability to any User shall not exceed the Platform fees collected from
          that User in the three (3) months preceding the claim.
        </LegalP>
      </LegalSection>

      <LegalSection n={8} title="Governing Law & Jurisdiction">
        <LegalP>
          These Terms shall be governed by and construed in accordance with the laws of the Emirate of
          Dubai and the federal laws of the United Arab Emirates. Any dispute arising out of or in
          connection with these Terms shall be subject to the exclusive jurisdiction of the courts of
          Dubai.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
