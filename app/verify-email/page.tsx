import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { one } from "@/lib/util";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const token = one(searchParams.token);
  let ok = false;
  if (token) {
    const rec = await prisma.emailVerification.findUnique({ where: { token } });
    if (rec && rec.expiresAt > new Date()) {
      await prisma.user.update({ where: { id: rec.userId }, data: { verified: true } });
      await prisma.emailVerification.delete({ where: { token } });
      ok = true;
    }
  }
  return (
    <div className="mx-auto max-w-md">
      <div className="card text-center">
        <h1 className="h2 mb-2">{ok ? "Email verified" : "Verification failed"}</h1>
        <p className="muted mb-5">
          {ok ? "Your account is active. You can sign in now." : "This link is invalid or has expired."}
        </p>
        <Link href="/login" className="btn-primary">Go to sign in</Link>
      </div>
    </div>
  );
}
