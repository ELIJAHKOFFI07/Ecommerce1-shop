import { NextResponse } from "next/server";
import { requireUser } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";
import { placeOrder, type PlaceOrderInput } from "@/lib/placeOrder";

export async function POST(request: Request) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const body = (await request.json()) as PlaceOrderInput;
    const orderIds = await placeOrder(user.id, body);
    return NextResponse.json({ orderIds });
  });
}
