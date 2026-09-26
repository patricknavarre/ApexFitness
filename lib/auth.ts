import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';

/**
 * Summer-proven Auth.js setup.
 * Do not customize cookie names (JWT salt = cookie name) — Auth.js defaults
 * based on HTTPS are what kept home-screen logins alive for months.
 */
const secret =
  process.env.NEXTAUTH_SECRET ??
  process.env.AUTH_SECRET ??
  (process.env.NODE_ENV === 'development' ? 'dev-secret-replace-in-production' : undefined);

/** 90 days — Auth.js applies this as cookie Expires/Max-Age on sign-in. */
const SESSION_MAX_AGE = 90 * 24 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret,
  trustHost: true,
  ...(process.env.NEXTAUTH_URL && { url: process.env.NEXTAUTH_URL }),
  ...(process.env.AUTH_URL && !process.env.NEXTAUTH_URL
    ? { url: process.env.AUTH_URL }
    : {}),
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID ?? '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const { connectDB } = await import('./mongodb');
        const User = (await import('@/models/User')).default;
        await connectDB();
        const user = await User.findOne({ email: credentials.email as string });
        if (!user || !user.passwordHash) return null;
        const valid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        );
        if (!valid) return null;
        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === 'google' && user.email) {
          const { connectDB } = await import('./mongodb');
          const User = (await import('@/models/User')).default;
          await connectDB();
          const doc = await User.findOne({ email: user.email }).select('_id');
          token.userId = doc?._id?.toString() ?? user.id;
        } else {
          token.userId = user.id;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.userId) {
        session.user.id = token.userId as string;
      }
      return session;
    },
    async signIn({ user, account }) {
      if (account?.provider === 'google' && user.email) {
        const { connectDB } = await import('./mongodb');
        const User = (await import('@/models/User')).default;
        await connectDB();
        await User.findOneAndUpdate(
          { email: user.email },
          {
            $setOnInsert: {
              name: user.name ?? undefined,
              email: user.email,
              googleId: user.id,
            },
          },
          { upsert: true, new: true }
        );
      }
      return true;
    },
  },
  pages: { signIn: '/auth/login', error: '/auth/login' },
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
});
