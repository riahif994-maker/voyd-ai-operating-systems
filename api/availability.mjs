import { handleApi } from "../server/http.mjs";
import { getAvailability } from "../server/availability.mjs";

export default async function handler(req, res) {
  await handleApi(
    {
      GET: async (request) => {
        const url = new URL(request.url || "/", "http://127.0.0.1");
        const clientTimeZone = url.searchParams.get("clientTimeZone") || "UTC";
        return getAvailability(clientTimeZone);
      },
    },
    req,
    res,
  );
}
