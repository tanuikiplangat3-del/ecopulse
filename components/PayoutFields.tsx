"use client";

import { useState } from "react";

/**
 * Publisher payout details.
 *
 * PayPal is what we prefer and what goes through without anyone looking at it.
 * Any other method is a request: the publisher tells us what they want, an
 * admin checks whether we can actually pay that way from where we bank, and
 * they get an answer within 24 hours. Saying that on the form matters - a
 * publisher who fills in a bank account and hears nothing assumes it is set up.
 *
 * Only the field for the chosen method is enabled, so nothing half-filled for
 * another method can be saved by accident.
 */
const METHODS = [
  { value: "paypal", label: "PayPal (preferred)" },
  { value: "mpesa", label: "M-Pesa" },
  { value: "bank", label: "Bank transfer" },
  { value: "other", label: "Something else" },
];

export default function PayoutFields({
  method,
  mpesa,
  paypal,
  bank,
  other,
  invoiceMode,
  status,
  note,
}: {
  method: string;
  mpesa: string;
  paypal: string;
  bank: string;
  other: string;
  invoiceMode: boolean;
  status: string;
  note: string;
}) {
  const [m, setM] = useState(METHODS.some((x) => x.value === method) ? method : "paypal");
  const [inv, setInv] = useState(invoiceMode);
  const dim = "pointer-events-none select-none opacity-40 blur-[1.5px]";
  // On invoice terms nothing is held on file, so the whole method block is out
  // of the way. The details arrive with each invoice instead.
  const show = (want: string) => (!inv && m === want ? "" : dim);

  return (
    <>
      <label className="field">
        <span className="flex items-start gap-3">
          <input
            type="checkbox"
            name="payInvoiceMode"
            checked={inv}
            onChange={(e) => setInv(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm font-normal">
            I will send an invoice each time instead of saving my details here. You will be asked to
            attach one every time you submit a live link, and we will pay against it.
          </span>
        </span>
      </label>

      {status === "pending" && !inv && (
        <div className="flash flash-info mb-5">
          We are checking whether we can pay you that way. You will hear from us within 24 hours.
          Until then your earnings are held, not lost.
        </div>
      )}
      {status === "rejected" && !inv && (
        <div className="flash flash-error mb-5">
          We cannot pay to that method.{note ? ` ${note}` : ""} Please choose another one below.
        </div>
      )}

      <label className={"field transition-all " + (inv ? dim : "")} aria-hidden={inv}>
        <span>How would you like to be paid?</span>
        <select className="select" name="payMethod" value={m} onChange={(e) => setM(e.target.value)} disabled={inv}>
          {METHODS.map((x) => (
            <option key={x.value} value={x.value}>
              {x.label}
            </option>
          ))}
        </select>
        <small className="muted">
          We pay by PayPal as standard. Choose anything else and we will confirm within 24 hours
          whether we can pay that way.
        </small>
      </label>

      <label className={"field transition-all " + show("paypal")} aria-hidden={m !== "paypal"}>
        <span>PayPal email</span>
        <input
          className="input"
          type="email"
          name="payPaypal"
          defaultValue={paypal}
          placeholder="you@example.com"
          disabled={m !== "paypal"}
        />
      </label>

      <label className={"field transition-all " + show("mpesa")} aria-hidden={m !== "mpesa"}>
        <span>M-Pesa phone / Paybill / Till number</span>
        <input
          className="input"
          name="payMpesa"
          defaultValue={mpesa}
          placeholder="07XX XXX XXX (or paybill / till number)"
          disabled={m !== "mpesa"}
        />
      </label>

      <label className={"field transition-all " + show("bank")} aria-hidden={m !== "bank"}>
        <span>Bank details</span>
        <textarea
          className="input"
          name="payBank"
          rows={3}
          defaultValue={bank}
          placeholder="Account name, account number, bank name, branch, SWIFT / IBAN, country"
          disabled={m !== "bank"}
        />
      </label>

      <label className={"field transition-all " + show("other")} aria-hidden={m !== "other"}>
        <span>Tell us how you would like to be paid</span>
        <textarea
          className="input"
          name="payCard"
          rows={3}
          defaultValue={other}
          placeholder="For example Wise, Payoneer, a mobile money wallet - and the details we would need"
          disabled={m !== "other"}
        />
      </label>
    </>
  );
}
