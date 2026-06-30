const webPush = require("web-push");
const pool = require("./db");

const originalSend = webPush.sendNotification.bind(webPush);

function readTargetFromBody(body) {
  const text = String(body || "");
  const hostedText = " hosted a match at ";
  const tapText = ". Tap";
  const hostedIndex = text.indexOf(hostedText);
  const tapIndex = text.indexOf(tapText);

  if (hostedIndex < 0 || tapIndex < 0 || tapIndex <= hostedIndex) {
    return null;
  }

  return {
    hostName: text.slice(0, hostedIndex).trim(),
    venueName: text.slice(hostedIndex + hostedText.length, tapIndex).trim(),
  };
}

async function getLatestOpenMatchTarget(hostName, venueName) {
  const result = await pool.query(
    `
      SELECT
        matches.id,
        matches.venue_id,
        venues.name AS venue_name
      FROM matches
      INNER JOIN venues
        ON venues.id = matches.venue_id
      WHERE matches.host_name = $1
        AND venues.name = $2
        AND matches.is_full = FALSE
        AND (
          matches.match_date::timestamp
          + matches.end_time
          + CASE
              WHEN matches.end_time <= matches.start_time THEN INTERVAL '1 day'
              ELSE INTERVAL '0 day'
            END
        ) > (NOW() AT TIME ZONE 'Asia/Kolkata')
      ORDER BY matches.id DESC
      LIMIT 1
    `,
    [hostName, venueName],
  );

  return result.rows[0] || null;
}

async function buildTargetPayload(payload) {
  let data;

  try {
    data = JSON.parse(payload);
  } catch (err) {
    return payload;
  }

  if (data.matchId) {
    return payload;
  }

  const parsed = readTargetFromBody(data.body);

  if (!parsed) {
    return payload;
  }

  try {
    const target = await getLatestOpenMatchTarget(parsed.hostName, parsed.venueName);

    if (!target) {
      return JSON.stringify({
        ...data,
        venueName: parsed.venueName,
        url: `/find.html?venue=${encodeURIComponent(parsed.venueName)}`,
      });
    }

    return JSON.stringify({
      ...data,
      matchId: String(target.id),
      venueId: String(target.venue_id),
      venueName: target.venue_name,
      url: `/find.html?match=${encodeURIComponent(target.id)}`,
    });
  } catch (err) {
    console.error("Could not add notification target", err);
    return payload;
  }
}

webPush.sendNotification = async function sendNotificationWithTarget(subscription, payload, options) {
  const nextPayload = await buildTargetPayload(payload);
  return originalSend(subscription, nextPayload, options);
};