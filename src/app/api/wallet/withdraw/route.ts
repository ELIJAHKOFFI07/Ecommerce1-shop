import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";
import { requestWithdrawal } from "@/lib/requestWithdrawal";

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { amount, phone } = await request.json();
    await requestWithdrawal(user.id, amount, phone);
    return NextResponse.json({ ok: true });
  });
}
