import { LegalShell, LegalSection, LegalP, LegalList, LegalItem, LegalCallout } from "@/components/Legal";

export const metadata = {
  title: "Refund & Wallet Credit Policy",
  description:
    "How funds are deposited, managed, credited and refunded on the Link Tomorrow marketplace.",
};

export default function RefundPolicyPage() {
  return (
    <LegalShell
      title="Refund & Wallet Credit Policy"
      meta="LinkTomorrow Financial Guidelines · Effective Date: September 1, 2026"
      footnote={
        <>
          <p>LinkTomorrow Marketplace</p>
          <p>
            For financial inquiries, contact:{" "}
            <a href="mailto:billing@welcometomorrow.io" className="text-wt-green hover:underline">
              billing@welcometomorrow.io
            </a>
          </p>
        </>
      }
    >
      <LegalP>
        This Refund &amp; Wallet Credit Policy governs how funds are deposited, managed, credited, and
        refunded on the LinkTomorrow Platform. By adding funds to your account, you agree to these
        financial terms.
      </LegalP>

      <LegalSection n={1} title="The Wallet Ecosystem">
        <LegalP>
          To reduce cross-border payment friction and ensure rapid execution of orders, LinkTomorrow
          utilizes a pre-funded <strong className="font-bold">Wallet Balance</strong> system. Buyers
          deposit fiat currency (via credit card, Stripe, or wire transfer) which is converted into
          platform credits (denominated in USD).
        </LegalP>
        <LegalCallout>
          <strong className="font-bold">Important: Wallet Deposits are Final.</strong> Once fiat
          currency is deposited into the LinkTomorrow Wallet, it is considered a finalized B2B
          software transaction. Wallet Balances are generally non-refundable to the original payment
          method. They must be utilized to purchase Placements within the Platform.
        </LegalCallout>
      </LegalSection>

      <LegalSection n={2} title="Order Failures & Cancellations">
        <LegalP>
          We operate an escrow system to protect Buyers. Funds are only released to a Publisher after
          successful verification of the Placement. In the event of a failure, funds are credited back
          to the Buyer.
        </LegalP>
        <LegalList>
          <LegalItem term="Rejection or Timeout:">
            If a Publisher declines an order or fails to accept it within 72 hours, 100% of the order
            cost is instantly returned to your Wallet Balance.
          </LegalItem>
          <LegalItem term="Failed Delivery:">
            If a Publisher accepts but fails to deliver the live URL within the maximum Service Level
            Agreement (SLA) timeline, the order is cancelled by the system, and 100% of the funds are
            credited back to your Wallet.
          </LegalItem>
          <LegalItem term="Quality Rejection:">
            If the delivered Placement materially violates the initial order instructions (e.g.,
            incorrect anchor text, wrong target URL, &quot;no-follow&quot; instead of
            &quot;do-follow&quot;), the Buyer may dispute the order within 48 hours. If the Publisher
            cannot rectify the error, the funds will be returned to the Wallet.
          </LegalItem>
        </LegalList>
      </LegalSection>

      <LegalSection n={3} title="The 12-Month Guarantee & Pro-Rated Credits">
        <LegalP>
          We hold Publishers accountable for the longevity of the placements they sell. All approved
          Placements carry a <strong className="font-bold">12-Month (365 day) live guarantee</strong>.
        </LegalP>
        <LegalP>
          If our automated verification systems (or a Buyer report) detect that a Placement has been
          deleted, altered, or de-indexed by the Publisher within 365 days of delivery, LinkTomorrow
          will enforce the following protocol:
        </LegalP>
        <LegalList>
          <LegalItem term="Publisher Rectification:">
            The Publisher will be granted seven (7) days to restore the Placement to its original,
            agreed-upon state.
          </LegalItem>
          <LegalItem term="Wallet Compensation:">
            If the Publisher fails to restore the Placement, LinkTomorrow will issue a credit to the
            Buyer&apos;s Wallet Balance. Due to the upfront costs of content creation and platform
            processing, this credit may be pro-rated based on the duration the link remained live, up
            to a maximum of 100% of the original purchase price.
          </LegalItem>
        </LegalList>
      </LegalSection>

      <LegalSection n={4} title="Chargebacks & Payment Disputes">
        <LegalP>
          Because LinkTomorrow utilizes a Wallet system backed by extensive internal SLAs and
          guarantees, external credit card chargebacks are strictly prohibited.
        </LegalP>
        <LegalCallout>
          <strong className="font-bold">Zero Tolerance for Chargebacks:</strong> Any attempt to
          initiate a bank-level chargeback or payment dispute via Stripe, PayPal, or a credit card
          issuer will result in the immediate and permanent suspension of the User&apos;s LinkTomorrow
          account, confiscation of any remaining Wallet Balance to cover dispute fees, and the
          automated removal of all previously acquired Placements.
        </LegalCallout>
      </LegalSection>

      <LegalSection n={5} title="Account Inactivity & Abandonment">
        <LegalP>
          If a Buyer account remains entirely inactive (no logins, no deposits, no order activity) for
          a continuous period of twenty-four (24) months, LinkTomorrow reserves the right to classify
          the account as abandoned. Any remaining Wallet Balance may be absorbed by the Platform as an
          administrative maintenance fee.
        </LegalP>
      </LegalSection>

      <LegalSection n={6} title="Exceptional Manual Refunds">
        <LegalP>
          In highly exceptional circumstances (e.g., corporate liquidation of the Buyer), LinkTomorrow
          management may, at its sole discretion, approve a manual wire transfer refund of an unspent
          Wallet Balance. Such exceptional refunds will be subject to a{" "}
          <strong className="font-bold">15% administrative and processing fee</strong> to cover the
          initial gateway charges, FX fees, and accounting labor.
        </LegalP>
      </LegalSection>
    </LegalShell>
  );
}
