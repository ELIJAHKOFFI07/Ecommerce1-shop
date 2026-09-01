import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/requireAuth";
import { withApiErrors } from "@/lib/apiError";

/// markStoryViewed — équivalent de la RPC mark_story_viewed.
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  return withApiErrors(async () => {
    const user = await requireUser();
    const { id: storyId } = await ctx.params;

    await db.shopStoryView.upsert({
      where: { storyId_viewerId: { storyId, viewerId: user.id } },
      update: {},
      create: { storyId, viewerId: user.id },
    });

    return NextResponse.json({ ok: true });
  });
}
