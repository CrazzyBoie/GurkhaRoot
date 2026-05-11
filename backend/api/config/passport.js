import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { getDb, newId, snapToArr } from '../lib/firebase.js';

passport.use(
  new GoogleStrategy(
    {
      clientID:     process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL:  process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const db    = getDb();
        const email = profile.emails[0].value;
        const name  = profile.displayName;
        const googleId = profile.id;

        // Find by email OR googleId
        const byEmail    = await db.collection('users').where('email', '==', email).limit(1).get();
        const byGoogleId = await db.collection('users').where('googleId', '==', googleId).limit(1).get();

        let userDoc = !byEmail.empty ? byEmail.docs[0] : (!byGoogleId.empty ? byGoogleId.docs[0] : null);

        if (userDoc) {
          const data = userDoc.data();
          if (!data.googleId) {
            await userDoc.ref.update({ googleId });
          }
          return done(null, { id: userDoc.id, ...data, googleId });
        }

        // Create new user
        const id  = newId();
        const now = new Date().toISOString();
        const newUser = {
          name, email, googleId,
          role: 'customer',
          phone: null,
          passwordHash: null,
          refreshToken: null,
          createdAt: now,
        };
        await db.collection('users').doc(id).set(newUser);
        return done(null, { id, ...newUser });
      } catch (error) {
        console.error('[passport] Google strategy error:', error);
        return done(error, null);
      }
    }
  )
);

export default passport;
