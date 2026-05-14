// Run: NOTION_TOKEN=your_token node scripts/sync.js
// Or add NOTION_TOKEN=... to a .env file

const fs = require("fs");
const path = require("path");

// Load .env if present
try {
  const env = fs.readFileSync(path.join(__dirname, "../.env"), "utf8");
  env.split("\n").forEach(line => {
    const [key, ...val] = line.split("=");
    if (key && val.length && !process.env[key.trim()]) {
      process.env[key.trim()] = val.join("=").trim();
    }
  });
} catch {}

const TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = "3039baf8-c8dc-80b8-8c00-ff423514507b";

if (!TOKEN) {
  console.error("❌  NOTION_TOKEN is not set.");
  console.error("    Add it to .env or run: NOTION_TOKEN=xxx node scripts/sync.js");
  process.exit(1);
}

function stripRole(name) {
  if (!name) return "";
  const idx = name.lastIndexOf(" - ");
  return idx >= 0 ? name.slice(idx + 3) : name;
}

async function searchNotion(cursor) {
  const body = { filter: { value: "page", property: "object" } };
  if (cursor) body.start_cursor = cursor;

  const res = await fetch("https://api.notion.com/v1/search", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(`Notion API error ${res.status}: ${data.message || JSON.stringify(data)}`);
  }

  return data;
}

async function main() {
  console.log("🔄  Fetching warehouse tasks from Notion...");

  let allPages = [];
  let cursor;

  do {
    const data = await searchNotion(cursor);
    const dbPages = data.results.filter(p => p.parent?.database_id === DATABASE_ID);
    allPages = [...allPages, ...dbPages];
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);

  // Filter to Warehouse area only
  allPages = allPages.filter(p =>
    (p.properties["Area"]?.multi_select || []).some(s => s.name === "Warehouse")
  );

  console.log(`✅  Found ${allPages.length} tasks`);

  const tasks = allPages
    .map(page => ({
      id: page.id,
      name: page.properties["Task name"]?.title?.[0]?.plain_text?.trim() || "",
      freq: page.properties["Frequency"]?.select?.name || "",
      type: page.properties["ROLE"]?.select?.name || "",
      owners: (page.properties["Role - Who"]?.multi_select || []).map(s => stripRole(s.name)).filter(Boolean),
      backups: (page.properties["Back Up"]?.multi_select || []).map(s => stripRole(s.name)).filter(Boolean),
    }))
    .filter(t => t.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const outPath = path.join(__dirname, "../src/tasks.json");
  fs.writeFileSync(outPath, JSON.stringify(tasks, null, 2));

  console.log(`📝  Written to src/tasks.json`);
  tasks.forEach(t => console.log(`    • ${t.name} [${t.freq || "—"}] — ${t.owners.join(", ") || "Unassigned"}`));
}

main().catch(err => {
  console.error("❌  Sync failed:", err.message);
  process.exit(1);
});
