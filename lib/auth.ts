import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import bcrypt from 'bcryptjs';
import {
  SESSION_MAX_AGE,
  authSecret,
  sessionCookieName,
  sessionCookieOptions,
} from '@/lib/auth-cookie';

/**
 * Cookie *name* stays the Auth.js default (it is the JWT salt).
 * Options are persistent + SameSite=None so iOS home-screen launches send it.
 */
const secret = authSecret();

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
  cookies: {
    sessionToken: {
      name: sessionCookieName(),
      options: sessionCookieOptions(),
    },
  },
});
