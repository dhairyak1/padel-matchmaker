const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const pool = require("./db");

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

        const email = profile.emails?.[0]?.value;

        const name = profile.displayName;

        let user = await pool.query(
          `
            SELECT *
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
              RETURNING *
              `,
            [googleId, email, name],
          );
        }

        return done(null, user.rows[0]);
      } catch (err) {
        return done(err);
      }
    },
  ),
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
