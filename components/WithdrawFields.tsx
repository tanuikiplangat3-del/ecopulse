"use client";

import { useState } from "react";

/**
 * Where to send this withdrawal. Prefilled from the publisher's saved payment
 * details for whichever method they pick, so most people just press the
 * button, but anything typed here is used for this withdrawal only.
 */
const METHODS = [
  { value: "paypal", label: "PayPal", field: "PayPal email", placeholder: "you@example.com" },
  { value: "mpesa", label: "M-Pesa", field: "M-Pesa phone / Paybill / Till number", placeholder: "07XX XXX XXX" },
  { value: "bank", label: "Bank transfer", field: "Bank details", placeholder: "Account name, account number, bank name, branch, SWIFT / IBAN, country" },
  { value: "other", label: "Something else", field: "How should we pay you?", placeholder: "For example Wise or Payoneer, and the details we need" },
];

export default function WithdrawFields({
  method,
  saved,
}: {
  method: string;
  saved: Record<string, string>;
}) {
  const start = METHODS.some((m) => m.value === method) ? method : "paypal";
  const [m, setM] = useState(start);
  const [values, setValues] = useState<Record<string, string>>(saved);
  const cur = METHODS.find((x) => x.value === m)!;

  return (
    <>
      <label className="field">
        <span>Pay me by</span>
        <select className="select" name="method" value={m} onChange={(e) => setM(e.target.value)}>
          {METHODS.map((x) => (
            <option key={x.value} value={x.value}>{x.label}</option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>{cur.field}</span>
        {m === "bank" || m === "other" ? (
          <textarea
            className="input"
            name="details"
            rows={3}
            required
            value={values[m] || ""}
            onChange={(e) => setValues({ ...values, [m]: e.target.value })}
            placeholder={cur.placeholder}
          />
        ) : (
          <input
            className="input"
            name="details"
            type={m === "paypal" ? "email" : "text"}
            required
            value={values[m] || ""}
            onChange={(e) => setValues({ ...values, [m]: e.target.value })}
            placeholder={cur.placeholder}
          />
        )}
      </label>
    </>
  );
}
