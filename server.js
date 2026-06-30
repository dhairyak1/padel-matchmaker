const rateLimit = require("express-rate-limit");
require("dotenv").config();

const express = require("express");
const path = require("path");
const pool = require("./db");

const session = require("express-session");
const PgSession = require("connect-pg-simple")(session);
const passport = require("./auth");
const crypto = require("crypto");

const app = express();

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    error: "Too many requests. Please try again later.",
  },
});

app.use("/api", apiLimiter);
app.use("/auth", apiLimiter);

app.set("trust proxy", 1);

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "user_sessions",
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  }),
);

app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }

  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

const activeMatchSql = `
  AND (
    matches.match_date::timestamp
    + matches.end_time
    + CASE
        WHEN matches.end_time <= matches.start_time THEN INTERVAL '1 day'
        ELSE INTERVAL '0 day'
      END
  ) > (NOW() AT TIME ZONE 'Asia/Kolkata')
`;

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/api/venues", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM venues ORDER BY name");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to load venues",
    });
  }
});

app.get("/api/csrf-token", (req, res) => {
  res.json({
    csrfToken: req.session.csrfToken,
  });
});

function requireCsrfToken(req, res, next) {
  const unsafeMethods = ["POST", "PUT", "PATCH", "DELETE"];

  if (!unsafeMethods.includes(req.method)) {
    return next();
  }

  const csrfToken = req.headers["x-csrf-token"];

  if (!csrfToken || csrfToken !== req.session.csrfToken) {
    return res.status(403).json({
      error: "Invalid CSRF token",
    });
  }

  next();
}

app.use("/api", requireCsrfToken);

app.post("/api/matches", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    if (!req.user.phone) {
      return res.status(400).json({
        error: "Please complete your profile first",
      });
    }

    const {
      venue_id,
      match_date,
      start_time,
      end_time,
      players_needed,
      skill_level,
      notes,
    } = req.body;

    if (
      !venue_id ||
      !match_date ||
      !start_time ||
      !end_time ||
      !players_needed ||
      !skill_level
    ) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    const futureCheck = await pool.query(
      `
        SELECT ($1::date + $2::time) > (NOW() AT TIME ZONE 'Asia/Kolkata') AS is_future
      `,
      [match_date, start_time],
    );

    if (!futureCheck.rows[0].is_future) {
      return res.status(400).json({
        error: "Match must be in the future",
      });
    }

    const [startHour, startMinute] = start_time.split(":").map(Number);
    const [endHour, endMinute] = end_time.split(":").map(Number);

    let start = startHour * 60 + startMinute;
    let end = endHour * 60 + endMinute;

    if (end < start) {
      end += 24 * 60;
    }

    const duration = end - start;

    if (duration < 30 || duration > 240) {
      return res.status(400).json({
        error: "Match duration must be between 30 minutes and 4 hours",
      });
    }

    const result = await pool.query(
      `INSERT INTO matches
        (
          host_user_id,
          host_name,
          host_phone,
          venue_id,
          match_date,
          start_time,
          end_time,
          players_needed,
          skill_level,
          notes
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10
        )
        RETURNING *`,
      [
        req.user.id,
        req.user.name,
        req.user.phone,
        venue_id,
        match_date,
        start_time,
        end_time,
        players_needed,
        skill_level,
        notes,
      ],
    );

    res.json({
      success: true,
      match: result.rows[0],
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Failed to save match",
    });
  }
});

app.get("/api/matches", async (req, res) => {
  try {
    const { lat, lng } = req.query;

    if (!req.user) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    const currentUserId = req.user.id;
    let result;

    if (lat && lng) {
      result = await pool.query(
        `
          SELECT
            matches.*,
            users.phone AS host_phone,
            users.name AS host_name,
            venues.name AS venue_name,
            venues.address,
            (
              6371 * acos(
                cos(radians($1))
                * cos(radians(venues.latitude))
                * cos(radians(venues.longitude) - radians($2))
                + sin(radians($1))
                * sin(radians(venues.latitude))
              )
            ) AS distance
          FROM matches
          LEFT JOIN venues
            ON matches.venue_id = venues.id
          LEFT JOIN users
            ON matches.host_user_id = users.id
          WHERE matches.is_full = FALSE
            AND matches.host_user_id <> $3
            ${activeMatchSql}
          ORDER BY distance ASC
        `,
        [lat, lng, currentUserId],
      );
    } else {
      result = await pool.query(
        `
          SELECT
            matches.*,
            users.phone AS host_phone,
            users.name AS host_name,
            venues.name AS venue_name,
            venues.address
          FROM matches
          LEFT JOIN venues
            ON matches.venue_id = venues.id
          LEFT JOIN users
            ON matches.host_user_id = users.id
          WHERE matches.is_full = FALSE
            AND matches.host_user_id <> $1
            ${activeMatchSql}
          ORDER BY
            matches.match_date ASC,
            matches.start_time ASC
        `,
        [currentUserId],
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to fetch matches",
    });
  }
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  }),
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/",
  }),
  (req, res) => {
    if (!req.user.phone) {
      return res.redirect("/profile.html");
    }

    res.redirect("/");
  },
);

app.get("/api/me", (req, res) => {
  if (!req.user) {
    return res.status(401).json({
      loggedIn: false,
    });
  }

  res.json({
    loggedIn: true,
    user: req.user,
  });
});

app.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

app.post("/api/profile", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Not logged in",
      });
    }

    let { phone } = req.body;

    phone = phone.replace(/[\s()-]/g, "");

    const phoneRegex = /^\+[1-9]\d{7,14}$/;

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        error: "Please enter a valid WhatsApp number with country code",
      });
    }

    await pool.query(
      `
        UPDATE users
        SET phone = $1
        WHERE id = $2
      `,
      [phone, req.user.id],
    );

    req.user.phone = phone;

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to save phone",
    });
  }
});

app.post("/api/matches/:id/full", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    const matchId = req.params.id;

    const result = await pool.query(
      `
        UPDATE matches
        SET is_full = TRUE
        WHERE id = $1
          AND host_user_id = $2
        RETURNING *
      `,
      [matchId, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: "Not your match",
      });
    }

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to update match",
    });
  }
});

app.get("/api/my-matches", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    const result = await pool.query(
      `
        SELECT
          matches.*,
          venues.name AS venue_name
        FROM matches
        LEFT JOIN venues
          ON matches.venue_id = venues.id
        WHERE matches.host_user_id = $1
        ORDER BY matches.id DESC
      `,
      [req.user.id],
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to load matches",
    });
  }
});

app.delete("/api/matches/:id", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    const result = await pool.query(
      `
        DELETE FROM matches
        WHERE id = $1
          AND host_user_id = $2
        RETURNING *
      `,
      [req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: "Not your match",
      });
    }

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to delete match",
    });
  }
});

app.post("/api/matches/:id/reopen", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    const result = await pool.query(
      `
        UPDATE matches
        SET is_full = FALSE
        WHERE id = $1
          AND host_user_id = $2
        RETURNING *
      `,
      [req.params.id, req.user.id],
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        error: "Not your match",
      });
    }

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to reopen match",
    });
  }
});

app.post("/api/feedback", async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        error: "Please login first",
      });
    }

    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    await pool.query(
      `
        INSERT INTO feedback
        (
          user_id,
          name,
          email,
          phone,
          message
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5
        )
      `,
      [
        req.user.id,
        req.user.name,
        req.user.email,
        req.user.phone,
        message.trim(),
      ],
    );

    res.json({
      success: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      error: "Failed to send feedback",
    });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});