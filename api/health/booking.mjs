import { handleApi } from "../../server/http.mjs";
import { bookingHealth } from "../../server/health.mjs";

export default async function handler(req, res) {
  await handleApi(
    {
      GET: async () => bookingHealth(),
    },
    req,
    res,
  );
}
