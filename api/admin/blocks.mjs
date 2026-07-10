import { getHeader, handleApi, parseJsonBody } from "../../server/http.mjs";
import { verifyAdminToken } from "../../server/supabase.mjs";
import { createAdminBlock, deleteAdminBlock, listAdminBlocks } from "../../server/admin.mjs";

export default async function handler(req, res) {
  await handleApi(
    {
      GET: async (request) => {
        await verifyAdminToken(getHeader(request.headers, "authorization"));
        return listAdminBlocks();
      },
      POST: async (request) => {
        await verifyAdminToken(getHeader(request.headers, "authorization"));
        const payload = await parseJsonBody(request.body);
        return createAdminBlock(payload);
      },
      DELETE: async (request) => {
        await verifyAdminToken(getHeader(request.headers, "authorization"));
        const payload = await parseJsonBody(request.body);
        return deleteAdminBlock(payload);
      },
    },
    req,
    res,
  );
}
