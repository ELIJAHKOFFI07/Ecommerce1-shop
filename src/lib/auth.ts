import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { setupNewUser } from "@/lib/newUserSetup";

/// Configuration Auth.js — remplace l'auth Supabase (magic link + Google).
/// Google est conservé tel quel ; l'e-mail/mot de passe passe par un hash
/// bcrypt stocké dans User.passwordHash (plus de RPC `handle_new_user` : la
/// création du profil, du portefeuille et du code de parrainage se fait dans
/// le callback `signIn`/`createUser` de l'adaptateur, voir plus bas).
///
/// Session en JWT, pas en base : c'est une contrainte d'Auth.js quand un
/// provider Credentials est présent à côté de l'adaptateur — les sessions
/// base de données ne fonctionnent qu'avec des providers OAuth purs.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/play/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;
        if (typeof email !== "string" || typeof password !== "string") return null;

        const user = await db.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null; // compte Google-only : pas de mot de passe à comparer

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.username, image: user.avatarUrl };
      },
    }),
  ],
  callbacks: {
    // Le token JWT porte isAdmin/isSeller pour que les Route Handlers
    // n'aient pas à interroger la base à chaque requête juste pour savoir
    // qui a le droit de faire quoi — seule la mutation elle-même relit la
    // base avant d'agir (voir NEXTJS_BACKEND_MIGRATION.md §4).
    async jwt({ token, user }) {
      if (user?.id) {
        const dbUser = await db.user.findUnique({ where: { id: user.id } });
        token.sub = user.id;
        token.isAdmin = dbUser?.isAdmin ?? false;
        token.isSeller = dbUser?.isSeller ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub as string;
        session.user.isAdmin = Boolean(token.isAdmin);
        session.user.isSeller = Boolean(token.isSeller);
      }
      return session;
    },
  },
  events: {
    // Équivalent du trigger handle_new_user de Supabase : ne se déclenche
    // qu'à la toute première connexion (création du compte par
    // l'adaptateur), jamais aux connexions suivantes.
    async createUser({ user }) {
      if (!user.id) return;
      await setupNewUser(user.id);
    },
  },
});
