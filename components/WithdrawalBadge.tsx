/** Status of a publisher withdrawal, in the same badge family as order statuses. */
export default function WithdrawalBadge({ status }: { status: string }) {
  if (status === "paid") return <span className="badge badge-green">Paid</span>;
  if (status === "rejected") return <span className="badge badge-red">Declined</span>;
  return <span className="badge badge-yellow">In review</span>;
}
