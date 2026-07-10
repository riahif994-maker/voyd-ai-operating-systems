import { handleApi, parseJsonBody } from "../server/http.mjs";
import { submitBooking } from "../server/booking.mjs";

export default async function handler(req, res) {
  await handleApi(
    {
      POST: async (request) => {
        const payload = await parseJsonBody(request.body);
        return submitBooking(payload);
      },
    },
    req,
    res,
  );
}
