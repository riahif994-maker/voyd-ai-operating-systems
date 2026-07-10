import { getHeader, handleApi, parseJsonBody } from "../../../server/http.mjs";
import { verifyAdminToken } from "../../../server/supabase.mjs";
import { retryOwnerNotification } from "../../../server/admin.mjs";

export default async function handler(req, res) {
  await handleApi(
    {
      POST: async (request) => {
        await verifyAdminToken(getHeader(request.headers, "authorization"));
        const payload = await parseJsonBody(request.body);
        return retryOwnerNotification(payload);
      },
    },
    req,
    res,
  );
}
