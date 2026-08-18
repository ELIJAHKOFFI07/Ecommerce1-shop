"use client";

import { useState } from "react";
import Link from "next/link";
import { PartyPopper } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { GoogleButton } from "@/components/play/GoogleButton";
import {
  AuthSplit,
  AUTH_IMAGES,
  authFieldPrimary,
  authSubmitPrimary,
} from "@/components/auth/AuthSplit";

export default function RegisterPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [referral, setReferral] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username,
          // Lu par le trigger handle_new_user pour renseigner profiles.
          ...(whatsapp.trim() ? { whatsapp: whatsapp.trim() } : {}),
          ...(referral.trim()
            ? { referral_code_used: referral.trim().toUpperCase() }
            : {}),
        },
      },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setDone(true);
  }

  if (done) {
    return (
      <AuthSplit
        tone="primary"
        image={AUTH_IMAGES.register}
        imageAlt="Nouveau départ sur DreamTeamShop"
        kicker="Bienvenue à bord"
        title="Compte créé"
        subtitle="Une dernière étape avant de profiter de DreamTeamShop."
        badge="100 points de bienvenue"
        featureTitle="Rejoignez la communauté"
        featureText="Achetez, vendez et brillez avec des milliers de membres en Côte d'Ivoire."
      >
        <div className="animate-rise text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-primary/10">
            <PartyPopper className="h-8 w-8 text-primary" />
          </div>
          <p className="font-display mt-4 text-lg font-bold text-foreground">
            Compte créé
          </p>
          <p className="mt-2 text-sm text-muted">
            Vérifiez votre email pour confirmer, puis connectez-vous.
          </p>
          <Link
            href="/play/login"
            className={`${authSubmitPrimary} mt-6 inline-flex items-center justify-center`}
          >
            Se connecter
          </Link>
        </div>
      </AuthSplit>
    );
  }

  return (
    <AuthSplit
      tone="primary"
      image={AUTH_IMAGES.register}
      imageAlt="Nouveau départ sur DreamTeamShop"
      kicker="Rejoignez la team"
      title="Créer un compte"
      subtitle="Gratuit, et vous gagnez 100 points avec un code de parrainage."
      badge="100 points de bienvenue"
      featureTitle="Rejoignez la communauté"
      featureText="Achetez, vendez et brillez avec des milliers de membres en Côte d'Ivoire."
    >
      <div className="stagger space-y-3">
        {/* Google en premier : le parcours en un clic évite de remplir cinq
            champs, et le compte est créé automatiquement à la première
            connexion. */}
        <GoogleButton label="S'inscrire avec Google" tone="primary" />

        <div className="my-1.5 flex items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-border" />
          ou avec un e-mail
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={submit} className="stagger space-y-3">
          <input
            required
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Nom d'utilisateur"
            className={authFieldPrimary}
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className={authFieldPrimary}
          />
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mot de passe (8 caractères min.)"
            className={authFieldPrimary}
          />
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="Numéro WhatsApp (ex : +225 07 00 00 00 00)"
            className={authFieldPrimary}
          />
          <input
            value={referral}
            onChange={(e) => setReferral(e.target.value)}
            placeholder="Code de parrainage (optionnel)"
            className={`${authFieldPrimary} uppercase`}
          />
          {error && <p className="text-sm font-medium text-red-400">{error}</p>}
          <button disabled={loading} className={authSubmitPrimary}>
            {loading ? "Création…" : "Créer mon compte"}
          </button>
        </form>
      </div>
    </AuthSplit>
  );
}
