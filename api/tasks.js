const { Client } = require("@notionhq/client");

const DATABASE_ID = "3039baf8c8dc80b88c00ff423514507b";

function stripRole(name) {
  if (!name) return "";
  const idx = name.lastIndexOf(" - ");
  return idx >= 0 ? name.slice(idx + 3) : name;
}

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "NOTION_TOKEN environment variable is not set" });
  }

  const notion = new Client({ auth: token });

  try {
    let allPages = [];
    let cursor;

    do {
      const response = await notion.databases.query({
        database_id: DATABASE_ID,
        filter: {
          property: "Area",
          multi_select: { contains: "Warehouse" },
        },
        start_cursor: cursor,
      });

      allPages = [...allPages, ...response.results];
      cursor = response.has_more ? response.next_cursor : undefined;
    } while (cursor);

    const tasks = allPages
      .map(page => ({
        id: page.id,
        name: page.properties["Task name"]?.title?.[0]?.plain_text?.trim() || "",
        freq: page.properties["Frequency"]?.select?.name || "",
        owners: (page.properties["Role - Who"]?.multi_select || []).map(s => stripRole(s.name)).filter(Boolean),
        backups: (page.properties["Back Up"]?.multi_select || []).map(s => stripRole(s.name)).filter(Boolean),
      }))
      .filter(t => t.name);

    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate");
    return res.json(tasks);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
};
