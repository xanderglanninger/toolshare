import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { db } from "@/lib/db/client";
import { verifyCredentials } from "@/lib/services/auth.service";

declare module "next-auth" {
  interface Session { user: { id: string; name: string; email: string; image?: string | null; role: string } }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const result = await verifyCredentials(
          credentials.email as string,
          credentials.password as string
        );

        if (!result.success || !result.user) {
          return null;
        }

        const dbUser = await db.user.findUnique({ where: { id: result.user.id }, select: { role: true } });
        return {
          id: result.user.id,
          name: `${result.user.name} ${result.user.surname}`,
          email: result.user.email,
          role: dbUser?.role ?? "USER",
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as any).role ?? "USER";
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id   = token.id as string;
        session.user.role = (token.role as string) ?? "USER";
      }
      return session;
    },
  },
});