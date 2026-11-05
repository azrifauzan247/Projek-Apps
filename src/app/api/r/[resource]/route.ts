import { route, json, ApiError } from "@/lib/api";
import { resources, ResourceName } from "@/lib/resources";

export const dynamic = "force-dynamic";
export const POST = route<{ params: Promise<{ resource: string }> }>(async (user, req, ctx) => {
  const { resource } = await ctx.params;
  const r = resources[resource as ResourceName];
  if (!r) throw new ApiError(404, "Sumber tidak dijumpai.");
  return r.create(user, await json(req));
});
