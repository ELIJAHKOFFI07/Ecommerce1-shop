import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";
import { linkReferral } from "@/lib/referral";

/// redeemReferral — rattacher un parrain après l'inscription.
export async function POST(request: Request) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { code } = await request.json();
    await linkReferral(user.id, code);
    return NextResponse.json({ ok: true });
  });
}
