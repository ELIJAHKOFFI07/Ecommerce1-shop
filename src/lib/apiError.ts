import { NextResponse } from "next/server";

/// Erreur métier avec un code HTTP explicite — utilisée par toutes les
/// routes API pour renvoyer un message clair au client plutôt qu'un 500
/// générique. `withApiErrors` centralise la conversion en réponse JSON pour
/// ne pas répéter le même try/catch dans chaque route.
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export function withApiErrors(handler: () => Promise<NextResponse>): Promise<NextResponse> {
  return handler().catch((err) => {
    if (err instanceof ApiError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  });
}
