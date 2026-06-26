require("dotenv").config();

const pool = require("./db");

async function fix() {

  try {

    await pool.query(`
      ALTER TABLE users
      ALTER COLUMN phone
      DROP NOT NULL;
    `);

    console.log(
      "phone column now allows NULL"
    );

  } catch (err) {

    console.error(err);

  } finally {

    process.exit();

  }

}

fix();