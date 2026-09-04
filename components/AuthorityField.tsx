"use client";

import { useState } from "react";
import { AUTHORITY_DA, AUTHORITY_DR } from "@/lib/authority";

/**
 * Lets a publisher choose which authority number their site displays.
 *
 * DR needs no typing at all - we read it from Ahrefs the moment the site is
 * added. DA does, because we are not connected to Moz and cannot look it up, so
 * the box only appears once DA is actually selected. Showing an empty DA box
 * next to a DR choice invites people to fill it in and then wonder why their
 * site still shows DR.
 */
export default function AuthorityField({
  defaultType = AUTHORITY_DR,
  defaultValue = "",
}: {
  defaultType?: string;
  defaultValue?: string | number;
}) {
  const [type, setType] = useState(
    defaultType === AUTHORITY_DA ? AUTHORITY_DA : AUTHORITY_DR
  );

  return (
    <div className="field mt-4">
      <span>Which authority score should buyers see?</span>

      <div className="mt-2 space-y-3">
        <label className="flex items-start gap-3 text-sm text-white/80">
          <input
            type="radio"
            name="authorityType"
            value={AUTHORITY_DR}
            checked={type === AUTHORITY_DR}
            onChange={() => setType(AUTHORITY_DR)}
            className="mt-1"
          />
          <span>
            <strong className="text-white">Domain Rating (DR)</strong> — we look this up from
            Ahrefs for you. Nothing to type.
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-white/80">
          <input
            type="radio"
            name="authorityType"
            value={AUTHORITY_DA}
            checked={type === AUTHORITY_DA}
            onChange={() => setType(AUTHORITY_DA)}
            className="mt-1"
          />
          <span>
            <strong className="text-white">Domain Authority (DA)</strong> — enter it yourself.
            Choose this if your site scores better on DA than on DR.
          </span>
        </label>

        {type === AUTHORITY_DA && (
          <div>
            <input
              className="input max-w-[200px]"
              name="domainAuthority"
              type="number"
              min="1"
              max="100"
              step="1"
              defaultValue={defaultValue}
              placeholder="e.g. 45"
              required
            />
            <p className="muted mt-2 text-xs">
              A number between 1 and 100. Buyers will see this instead of DR, so please make
              sure it is accurate — our team checks it against the site.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
