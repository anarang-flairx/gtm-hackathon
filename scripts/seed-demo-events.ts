import { randomUUID } from "crypto";
import { appendOutreachEvent, getLocalDb } from "../src/lib/local-db";

async function main() {
  const db = await getLocalDb();
  const sample = db.customers
    .filter((c) => c.email && (c.phone_mobile || c.phone_cslb))
    .slice(0, 18);

  for (const [i, c] of sample.entries()) {
    const day = new Date();
    day.setDate(day.getDate() - (i % 7));
    const created = day.toISOString();

    if (i % 3 === 0) {
      const token = randomUUID().replace(/-/g, "");
      await appendOutreachEvent(
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

  console.log(`Seeded outreach events for ${sample.length} customers`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
