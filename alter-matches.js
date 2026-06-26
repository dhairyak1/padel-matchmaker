const pool = require("./db");

async function run() {

  await pool.query(`
    ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS start_time TIME;
  `);

  await pool.query(`
    ALTER TABLE matches
    ADD COLUMN IF NOT EXISTS end_time TIME;
  `);

  await pool.query(`
    ALTER TABLE matches
    DROP COLUMN IF EXISTS match_time;
  `);

  console.log("Matches table updated");

  process.exit();
}

run();