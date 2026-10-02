import cors from "cors";
import express from "express";
import mysql from "mysql2/promise";
import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

interface Product extends RowDataPacket {
  id: number;
  name: string;
  cost: number;
}

// DATABASE_URL, e.g. mysql://tda_user:strongPassword%3F@127.0.0.1:3306/product
const db = mysql.createPool(process.env.DATABASE_URL!);

// The database may still be starting up (no startup order on Tour de Cloud), so retry.
for (let attempt = 1; ; attempt++) {
  try {
    await db.query(`CREATE TABLE IF NOT EXISTS product (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      cost INT NOT NULL
    )`);
    break;
  } catch (error) {
    if (attempt === 60) throw error;
    console.log("Waiting for database...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

function parseProduct(body: unknown): { name: string; cost: number } | null {
  const { name, cost } = (body ?? {}) as Record<string, unknown>;
  if (typeof name !== "string" || !Number.isInteger(cost)) return null;
  return { name, cost: cost as number };
}

const app = express();
// Allow a frontend dev server on another port (e.g. localhost:3000) to call the API.
app.use(cors());
app.use(express.json());

app.get("/api/product", async (_req, res) => {
  const [products] = await db.query<Product[]>("SELECT id, name, cost FROM product ORDER BY id");
  res.json(products);
});

app.post("/api/product", async (req, res) => {
  const data = parseProduct(req.body);
  if (!data) {
    res.status(400).json({ message: "name and cost are required" });
    return;
  }

  const [result] = await db.execute<ResultSetHeader>(
    "INSERT INTO product (name, cost) VALUES (?, ?)",
    [data.name, data.cost],
  );
  res.json({ id: result.insertId, ...data });
});

app.put("/api/product/:id", async (req, res) => {
  const id = Number(req.params.id);
  const [[product]] = await db.execute<Product[]>("SELECT id FROM product WHERE id = ?", [id]);
  if (!product) {
    res.status(404).json({ message: "Product does not exist" });
    return;
  }

  const data = parseProduct(req.body);
  if (!data) {
    res.status(400).json({ message: "name and cost are required" });
    return;
  }

  await db.execute("UPDATE product SET name = ?, cost = ? WHERE id = ?", [data.name, data.cost, id]);
  res.json({ id, ...data });
});

app.delete("/api/product/:id", async (req, res) => {
  await db.execute("DELETE FROM product WHERE id = ?", [Number(req.params.id)]);
  res.json({ message: "Product was deleted permanently from DB." });
});

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({ status: "ok" });
});

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? "127.0.0.1";
app.listen(port, host, () => {
  console.log(`Server running on http://${host}:${port}`);
});

async function initTeamTable() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS team_members (
        id INT AUTO_INCREMENT PRIMARY KEY,
        team_name VARCHAR(100) NOT NULL,
        first_name VARCHAR(100) NOT NULL,
        last_name VARCHAR(100) NOT NULL
      )
    `);

    const [rows]: any = await db.query("SELECT COUNT(*) as count FROM team_members");
    
    if (rows[0].count === 0) {
      await db.query(`
        INSERT INTO team_members (team_name, first_name, last_name) VALUES
        ('Pink Bears', 'Jakub', 'Sroka'),
        ('Pink Bears', 'Dawid', 'Zygmunt'),
        ('Pink Bears', 'Kuba', 'Kucharczak')
      `);
      console.log("Added team members to database.");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}
initTeamTable();

app.get("/api/v1/team", async (_req, res) => {
  try {
    const [rows]: any = await db.query("SELECT team_name, first_name, last_name FROM team_members");
    
    if (!rows || rows.length === 0) {
      return res.json({ teamName: "No data", members: [] });
    }

    const teamName = rows[0].team_name;
    const members = rows.map((row: any) => ({
      firstName: row.first_name,
      lastName: row.last_name,
    }));

    res.status(200).json({ teamName, members });
  } catch (err) {
    console.error("Error reading from database:", err);
    res.status(500).json({ error: "Database error" });
  }
});