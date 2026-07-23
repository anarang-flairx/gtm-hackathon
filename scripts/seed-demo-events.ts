import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";
import { appendOutreachEvent, getLocalDb } from "../src/lib/local-db";

async function main() {
  // Reset outreach file so old customer IDs don't linger
  const eventsPath = path.join(process.cwd(), "data", "outreach-events.json");
  await fs.writeFile(
    eventsPath,
    JSON.stringify({ outreach_events: [], email_tracking: [] }, null, 2),
  );

  const db = await getLocalDb();
  const sample = db.customers
    .filter((c) => c.email && (c.phone_mobile || c.phone_cslb))
    .slice(0, 24);

  for (const [i, c] of sample.entries()) {
    const day = new Date();
    day.setDate(day.getDate() - (i % 7));
    const created = day.toISOString();

    if (i % 3 === 0) {
      const token = randomUUID().replace(/-/g, "");
      const { tracking } = await appendOutreachEvent(
        {
          customer_id: c.id,
          channel: "email",
          direction: "outbound",
          status: "sent_demo",
          subject: `Intro for ${c.business_name}`,
          body: "Demo seeded email",
          to_address: c.email,
          provider: "demo",
          metadata: { seeded: true },
          created_at: created,
        },
        { token },
      );
      // Simulate some opens/clicks for funnel metrics
      if (tracking && i % 2 === 0) {
        const raw = JSON.parse(await fs.readFile(eventsPath, "utf8")) as {
          outreach_events: unknown[];
          email_tracking: Array<{
            token: string;
            opened_at: string | null;
            clicked_at: string | null;
            click_count: number;
          }>;
        };
        const row = raw.email_tracking.find((t) => t.token === token);
        if (row) {
          row.opened_at = created;
          if (i % 4 === 0) {
            row.clicked_at = created;
            row.click_count = 1 + (i % 3);
          }
        }
        await fs.writeFile(eventsPath, JSON.stringify(raw, null, 2));
      }
    } else if (i % 3 === 1) {
      await appendOutreachEvent({
        customer_id: c.id,
        channel: "phone",
        direction: "outbound",
        status: ["connected", "no_answer", "voicemail"][i % 3],
        subject: null,
        body: "Seeded call",
        to_address: c.phone_mobile || c.phone_cslb,
        provider: "tel",
        metadata: { seeded: true },
        created_at: created,
      });
    } else {
      await appendOutreachEvent({
        customer_id: c.id,
        channel: "sms",
        direction: "outbound",
        status: "sent_demo",
        subject: null,
        body: "Seeded SMS",
        to_address: c.phone_mobile || c.phone_cslb,
        provider: "demo",
        metadata: { seeded: true },
        created_at: created,
      });
    }
  }

  console.log(`Seeded outreach events for ${sample.length} micro contractors`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
