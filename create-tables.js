require("dotenv").config();

const pool = require("./db");

async function check() {
  const result = await pool.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema='public'
    ORDER BY table_name;
  `);

  console.log(result.rows);

  process.exit();
}

check();