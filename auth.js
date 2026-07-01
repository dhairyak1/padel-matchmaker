const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("./db");

function toSessionUser(row) {
  if (!row) return null;

  return {
    id: row.id,
    google_id: row.google_id,
    email: row.email,
    name: row.name,
    phone: row.phone || "",
  };
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const googleId = profile.id;
        const email = profile.emails?.[0]?.value || "";
        const name = profile.displayName || "Padel Player";

        let user = await pool.query(
          `
            SELECT
              id,
              google_id,
              email,
              name,
              phone
            FROM users
            WHERE google_id = $1
          `,
          [googleId],
        );

        if (user.rows.length === 0) {
          user = await pool.query(
            `
              INSERT INTO users
              (
                google_id,
                email,
                name
              )
              VALUES
              (
                $1,
                $2,
                $3
              )
              RETURNING
                id,
                google_id,
                email,
                name,
                phone
            `,
            [googleId, email, name],
          );
        }

        return done(null, toSessionUser(user.rows[0]));
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const result = await pool.query(
      `
        SELECT
          id,
          google_id,
          email,
          name,
          phone
        FROM users
        WHERE id = $1
      `,
      [id],
    );

    done(null, toSessionUser(result.rows[0]));
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
