const pool = require("./db");

async function check() {

  const result =
    await pool.query(
      "SELECT * FROM venues"
    );

  console.log(result.rows);

  process.exit();
}

check();