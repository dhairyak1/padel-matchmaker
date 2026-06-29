const pool = require("./db");

async function seed() {
  await pool.query(`
    INSERT INTO venues
    (name, latitude, longitude, address)

    VALUES

    (
      'Smash Padel Bandra',
      19.0596,
      72.8295,
      'Bandra West'
    ),

    (
      'Mumbai Padel Club',
      19.1100,
      72.8500,
      'Andheri'
    ),

    (
      'Ace Arena',
      19.1500,
      72.9000,
      'Powai'
    )

    ON CONFLICT DO NOTHING;
  `);

  console.log("Venues inserted");

  process.exit();
}

seed();
