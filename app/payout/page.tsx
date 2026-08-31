import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savePayoutAction } from "@/app/actions/listings";
import { Flash } from "@/components/ui";
import SearchSelect from "@/components/SearchSelect";
import PayoutFields from "@/components/PayoutFields";
import { COUNTRIES } from "@/lib/data";
import { one } from "@/lib/util";

export const metadata = { title: "Payment details" };

export default async function PayoutPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const user = await requireRole("publisher");
  const first = one(searchParams.first) === "1";
  const me = await prisma.user.findUnique({ where: { id: user.id } });

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="h2 mb-1">{first ? "Add your payment details" : "Payment details"}</h1>
      <p className="muted mb-6">Tell us where to send your earnings. You can update this anytime.</p>
      <Flash searchParams={searchParams} />

      <div className="mb-5 flash flash-info">
        Payments are released within <strong>72 hours</strong> of the buyer confirming your link
        is live. If a payment has not arrived within that window, contact seo@welcometomorrow.io
        immediately and we will resolve it.
      </div>

      <form action={savePayoutAction} className="card">
        {first && <input type="hidden" name="first" value="1" />}
        <PayoutFields
          method={me?.payMethod || "mpesa"}
          mpesa={me?.payMpesa || ""}
          paypal={me?.payPaypal || ""}
        />
        <div className="field">
          <span>Country</span>
          <SearchSelect name="payCountry" options={COUNTRIES} defaultValue={me?.payCountry || ""} placeholder="Choose" title="Choose your country" />
        </div>
        <button className="btn-primary" type="submit">{first ? "Finish setup" : "Save payment details"}</button>
      </form>
    </div>
  );
}
