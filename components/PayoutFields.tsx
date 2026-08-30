"use client";

import { useState } from "react";

/**
 * Publisher payout fields. Only two methods for now (M-Pesa, PayPal - bank is
 * removed for country reasons). The field for the method that is NOT selected
 * is blurred and disabled, so only the chosen method can be filled and saved.
 */
export default function PayoutFields({
  method,
  mpesa,
  paypal,
}: {
  method: string;
  mpesa: string;
  paypal: string;
}) {
  const [m, setM] = useState(method === "paypal" ? "paypal" : "mpesa");
  const dim = "pointer-events-none select-none opacity-40 blur-[1.5px]";

  return (
    <>
      <label className="field">
        <span>Preferred payout method</span>
        <select className="select" name="payMethod" value={m} onChange={(e) => setM(e.target.value)}>
          <option value="mpesa">M-Pesa</option>
          <option value="paypal">PayPal</option>
        </select>
      </label>

      <label className={"field transition-all " + (m === "mpesa" ? "" : dim)} aria-hidden={m !== "mpesa"}>
        <span>M-Pesa phone / Paybill / Till number</span>
        <input
          className="input"
          name="payMpesa"
          defaultValue={mpesa}
          placeholder="07XX XXX XXX (or paybill / till number)"
          disabled={m !== "mpesa"}
        />
      </label>

      <label className={"field transition-all " + (m === "paypal" ? "" : dim)} aria-hidden={m !== "paypal"}>
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
    </>
  );
}
