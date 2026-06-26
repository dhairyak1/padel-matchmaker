require("dotenv").config();

const fs = require("fs");
const { parse } = require("csv-parse/sync");
const pool = require("./db");

function extractLatLng(mapsLink) {

  const match =
    mapsLink.match(/q=([-0-9.]+),([-0-9.]+)/);

  if (!match) {
    return [null, null];
  }

  return [
    Number(match[1]),
    Number(match[2])
  ];

}

async function importVenues() {

  const csv =
    fs.readFileSync(
      "hudle-venues.csv",
      "utf8"
    );

  const rows =
    parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

  let added = 0;
  let updated = 0;

  for (const row of rows) {

    const name =
      row["Title"];

    const hudleUrl =
      row["Venue Link"];

    const address =
      row["Address"];

    const googleMapsUrl =
      row["Maps Link"];

    const [latitude, longitude] =
      extractLatLng(googleMapsUrl);

    const result =
      await pool.query(
        `
        INSERT INTO venues
        (
          name,
          address,
          latitude,
          longitude,
          google_maps_url,
          hudle_url
        )
        VALUES
        ($1,$2,$3,$4,$5,$6)

        ON CONFLICT (hudle_url)
        DO UPDATE SET
          name = EXCLUDED.name,
          address = EXCLUDED.address,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          google_maps_url = EXCLUDED.google_maps_url

        RETURNING
          (xmax = 0) AS inserted,
          name
        `,
        [
          name,
          address,
          latitude,
          longitude,
          googleMapsUrl,
          hudleUrl
        ]
      );

    if (result.rows[0].inserted) {
      added++;
      console.log("Added:", result.rows[0].name);
    } else {
      updated++;
      console.log("Updated:", result.rows[0].name);
    }

  }

  console.log("");
  console.log("Import complete");
  console.log("Added:", added);
  console.log("Updated:", updated);

  await pool.end();

}

importVenues().catch((err) => {

  console.error(err);

  process.exit(1);

});