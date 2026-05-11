// Run: NOTION_TOKEN=your_token node scripts/sync.js
// Or set NOTION_TOKEN in .env

const https = require("https");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env") });

const TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = "3039baf8c8dc80b88c00ff423514507b";

if (!TOKEN) {
  console.error("❌ NOTION_TOKEN is not set.\n   Add it to .env or run: NOTION_TOKEN=xxx node scripts/sync.js");
  process.exit(1);
}

function stripRole(name) {
  if (!name) return "";
  const idx = name.lastIndexOf(" - ");
  return idx >= 0 ? name.slice(idx + 3) : name;
}

function notionRequest(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: "api.notion.com",
      path,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
    }, (res) => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error("Invalid JSON: " + body)); }
      });
    });
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function fetchAllWarehouseTasks() {
  let allPages = [];
  let cursor;

  do {
    const body = {
      filter: { property: "Area", multi_select: { contains: "Warehouse" } },
    };
    if (cursor) body.start_cursor = cursor;

    const response = await notionRequest(`/v1/databases/${DATABASE_ID}/query`, body);

    if (response.status === 401) throw new Error("Notion token is invalid or the integration hasn't been added to the database.");
    if (response.object === "error") throw new Error(response.message);

    allPages = [...allPages, ...response.results];
    cursor = response.has_more ? response.next_cursor : undefined;
  } while (cursor);

  return allPages;
}

async function main() {
  console.log("🔄 Fetching warehouse tasks from Notion...");

  const pages = await fetchAllWarehouseTasks();
  console.log(`✅ Found ${pages.length} tasks`);

  const tasks = pages
    .map(page => ({
      id: page.id,
      name: page.properties["Task name"]?.title?.[0]?.plain_text?.trim() || "",
      freq: page.properties["Frequency"]?.select?.name || "",
      owners: (page.properties["Role - Who"]?.multi_select || []).map(s => stripRole(s.name)).filter(Boolean),
      backups: (page.properties["Back Up"]?.multi_select || []).map(s => stripRole(s.name)).filter(Boolean),
    }))
    .filter(t => t.name)
    .sort((a, b) => a.name.localeCompare(b.name));

  const outPath = path.join(__dirname, "../src/tasks.json");
  fs.writeFileSync(outPath, JSON.stringify(tasks, null, 2));
  console.log(`📝 Written to src/tasks.json (${tasks.length} tasks)`);
  tasks.forEach(t => console.log(`   • ${t.name} [${t.freq || "Ad-Hoc"}] — ${t.owners.join(", ") || "Unassigned"}`));
}

main().catch(err => {
  console.error("❌ Sync failed:", err.message);
  process.exit(1);
});
