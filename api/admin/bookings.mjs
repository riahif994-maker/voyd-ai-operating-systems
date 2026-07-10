import { getHeader, handleApi, parseJsonBody } from "../../server/http.mjs";
import { verifyAdminToken } from "../../server/supabase.mjs";
import { listAdminBookings, updateAdminBooking } from "../../server/admin.mjs";

export default async function handler(req, res) {
  await handleApi(
    {
      GET: async (request) => {
        await verifyAdminToken(getHeader(request.headers, "authorization"));
        return listAdminBookings();
      },
      PATCH: async (request) => {
        await verifyAdminToken(getHeader(request.headers, "authorization"));
        const payload = await parseJsonBody(request.body);
        return updateAdminBooking(payload);
      },
    },
    req,
    res,
  );
}
