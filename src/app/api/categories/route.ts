import { getCatalog } from "@/lib/catalog";
import { withApi, ok } from "@/lib/apiError";

export const GET = withApi(async () => ok((await getCatalog()).categories));
