import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { bookingConfig, dateKeyIsWorkingDay, zonedTimeToUtc } from "../src/config/booking-runtime.mjs";
import { getAvailability } from "../server/availability.mjs";
import { bookingHealth } from "../server/health.mjs";
import { serviceKeyHeaders, serviceKeyKind, supabaseRest } from "../server/supabase.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const originalEnv = { ...process.env };
const originalFetch = global.fetch;
const checks = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
  checks.push(message);
}

function resetEnv() {
  process.env = { ...originalEnv };
}

function configureSupabase({ key = "sb_secret_verify", resend = false } = {}) {
  process.env.SUPABASE_URL = "https://verify.supabase.co/rest/v1";
  process.env.SUPABASE_SERVICE_ROLE_KEY = key;
  if (resend) {
    process.env.RESEND_API_KEY = "re_test";
    process.env.VOYD_FROM_EMAIL = "VOYD <onboarding@resend.dev>";
    process.env.VOYD_LEADS_EMAIL = "voyd.contact1@gmail.com";
  } else {
    delete process.env.RESEND_API_KEY;
    process.env.VOYD_FROM_EMAIL = "VOYD <onboarding@resend.dev>";
    process.env.VOYD_LEADS_EMAIL = "voyd.contact1@gmail.com";
  }
}

function jsonResponse(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() {
      return JSON.stringify(payload);
    },
    async json() {
      return payload;
    },
  };
}

function mockFetch({ bookings = [], blocks = [], conflict = false, failSupabase = false, capture = [] } = {}) {
  global.fetch = async (url, options = {}) => {
    const href = String(url);
    capture.push({ url: href, options });
    if (href.includes("api.resend.com")) return jsonResponse(200, { id: "email_verify" });
    if (failSupabase) return jsonResponse(500, { message: "simulated storage outage" });
    if (conflict && href.includes("/rest/v1/bookings") && options.method === "POST") {
      return jsonResponse(409, { code: "23505", message: "duplicate key value violates unique constraint" });
    }
    if (href.includes("/rest/v1/bookings")) return jsonResponse(200, bookings);
    if (href.includes("/rest/v1/blocked_booking_slots")) return jsonResponse(200, blocks);
    return jsonResponse(404, { message: "unexpected test URL" });
  };
}

function allFiles(dir, predicate, output = []) {
  if (!existsSync(dir)) return output;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) allFiles(full, predicate, output);
    else if (predicate(full)) output.push(full);
  }
  return output;
}

async function testHealthEndpoint() {
  resetEnv();
  configureSupabase({ resend: true });
  mockFetch();
  const health = await bookingHealth();
  assert(health.ok === true, "booking health endpoint reports ok when Supabase tables are reachable");
  assert(health.supabaseConfigured === true, "booking health reports Supabase configured");
  assert(health.bookingsTableReachable === true, "booking health reaches bookings table");
  assert(health.blockedSlotsTableReachable === true, "booking health reaches blocked slots table");
  assert(health.resendConfigured === true, "booking health reports Resend configured");
  assert(health.resendMode === "test", "booking health detects Resend test mode");
}

async function testAvailabilityRules() {
  resetEnv();
  configureSupabase({ resend: false });
  mockFetch();
  const fixedNow = new Date("2026-07-13T00:00:00.000Z");
  const availability = await getAvailability("America/New_York", fixedNow);
  assert(availability.available === true, "availability does not depend on Resend configuration");
  assert(availability.durationMinutes === 45, "availability returns 45-minute duration");
  assert(bookingConfig.dailySlots.length === 2, "booking config has exactly two daily slots");
  assert(bookingConfig.dailySlots[0] === "10:00" && bookingConfig.dailySlots[1] === "22:00", "booking config uses 10:00 and 22:00 Berlin slots");
  assert(dateKeyIsWorkingDay("2026-07-12") === false, "Sunday is unavailable");
  assert(availability.dates.length > 0, "availability returns generated dates");
  assert(availability.dates.every((date) => dateKeyIsWorkingDay(date.dateKey)), "availability includes Monday through Saturday only");
  assert(availability.dates.every((date) => date.slots.length === 2), "each returned working day has exactly two official slots in deterministic test");
  assert(availability.dates.every((date) => date.slots.every((slot) => ["10:00", "22:00"].includes(slot.slotTime))), "slots originate from official Berlin times");
  assert(availability.dates.every((date) => date.slots.every((slot) => slot.client.time && slot.berlin.time)), "availability returns client-local and Berlin display values");
}

async function testSupabaseFailure() {
  resetEnv();
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  mockFetch();
  const availability = await getAvailability("UTC", new Date("2026-07-13T00:00:00.000Z"));
  assert(availability.available === false, "availability fails safely when Supabase configuration is missing");
}

async function testKeyFormats() {
  const opaqueHeaders = serviceKeyHeaders("sb_secret_verify");
  assert(opaqueHeaders.apikey === "sb_secret_verify", "opaque Supabase key is sent in apikey header");
  assert(!("Authorization" in opaqueHeaders), "opaque Supabase key is not sent as Authorization Bearer");
  assert(serviceKeyKind("sb_secret_verify") === "opaque_secret", "opaque secret key format is detected");

  const legacyHeaders = serviceKeyHeaders("aaa.bbb.ccc");
  assert(legacyHeaders.Authorization === "Bearer aaa.bbb.ccc", "legacy JWT key uses Authorization Bearer");
  assert(serviceKeyKind("aaa.bbb.ccc") === "legacy_jwt", "legacy JWT key format is detected");

  resetEnv();
  configureSupabase({ key: "sb_secret_verify" });
  const capture = [];
  mockFetch({ capture });
  await supabaseRest("bookings?select=id&limit=1");
  assert(capture[0].url === "https://verify.supabase.co/rest/v1/bookings?select=id&limit=1", "Supabase URL normalization prevents duplicate rest/v1 paths");
  assert(!capture[0].options.headers.Authorization, "supabaseRest does not send Authorization for sb_secret keys");
}

async function testConflictAndCancelledRelease() {
  resetEnv();
  configureSupabase();
  mockFetch({ conflict: true });
  try {
    await supabaseRest("bookings?select=*", { method: "POST", body: "{}" });
    throw new Error("conflict was not thrown");
  } catch (error) {
    assert(error.statusCode === 409, "slot conflicts map to HTTP 409");
  }

  const fixedNow = new Date("2026-07-13T00:00:00.000Z");
  const startsAt = zonedTimeToUtc("2026-07-13", "10:00", bookingConfig.timezone).toISOString();
  resetEnv();
  configureSupabase();
  mockFetch({ bookings: [{ starts_at: startsAt, status: "cancelled" }] });
  const availability = await getAvailability("UTC", fixedNow);
  const slot = availability.dates.flatMap((date) => date.slots).find((item) => item.startsAt === startsAt);
  assert(slot?.status === "available", "cancelled bookings release the slot");
}

function testNoSecretsInBundle() {
  const dist = join(root, "dist");
  assert(existsSync(dist), "dist exists before bundle secret scan");
  const files = allFiles(dist, (file) => /\.(js|css|html|map)$/.test(file));
  const joined = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert(!joined.includes("SUPABASE_SERVICE_ROLE_KEY"), "client bundle does not include SUPABASE_SERVICE_ROLE_KEY name");
  assert(!joined.includes("RESEND_API_KEY"), "client bundle does not include RESEND_API_KEY name");
  assert(!joined.includes("sb_secret_"), "client bundle does not include opaque Supabase secret values");
}

function testSyntaxChecks() {
  const files = [
    ...allFiles(join(root, "api"), (file) => file.endsWith(".mjs")),
    ...allFiles(join(root, "server"), (file) => file.endsWith(".mjs")),
  ];
  for (const file of files) {
    const result = spawnSync(process.execPath, ["--check", file], { cwd: root, encoding: "utf8" });
    if (result.status !== 0) {
      throw new Error(`Syntax check failed for ${file}\n${result.stderr || result.stdout}`);
    }
  }
  assert(files.length > 0, "syntax checks ran for API/server .mjs files");
}

async function main() {
  try {
    await testHealthEndpoint();
    await testAvailabilityRules();
    await testSupabaseFailure();
    await testKeyFormats();
    await testConflictAndCancelledRelease();
    testNoSecretsInBundle();
    testSyntaxChecks();
  } finally {
    resetEnv();
    global.fetch = originalFetch;
  }

  console.log(`Booking verification passed (${checks.length} checks).`);
  for (const check of checks) console.log(`- ${check}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
