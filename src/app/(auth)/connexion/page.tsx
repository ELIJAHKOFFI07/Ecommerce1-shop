import { Suspense } from "react";
import { LoginForm } from "./LoginForm";

export const metadata = { title: "Connexion" };

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm googleEnabled={Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)} />
    </Suspense>
  );
}
