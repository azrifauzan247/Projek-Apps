import { route, json, ApiError } from "@/lib/api";
import { resources, ResourceName } from "@/lib/resources";

export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ resource: string; id: string }> };
async function get(ctx: Ctx) {
  const { resource, id } = await ctx.params;
  const r = resources[resource as ResourceName];
  const n = Number(id);
  if (!r || !Number.isInteger(n)) throw new ApiError(404, "Sumber tidak dijumpai.");
  return { r, n };
}
export const PATCH = route<Ctx>(async (user, req, ctx) => { const { r, n } = await get(ctx); return r.update(user, n, await json(req)); });
export const DELETE = route<Ctx>(async (user, _req, ctx) => { const { r, n } = await get(ctx); return r.remove(user, n); });
