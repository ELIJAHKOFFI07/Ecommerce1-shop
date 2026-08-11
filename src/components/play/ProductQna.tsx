"use client";

import { useCallback, useEffect, useState } from "react";
import { HelpCircle, Store, User } from "lucide-react";
import { createClient } from "@/lib/backend/client";
import { relativeTime, type ProductQuestion } from "@/lib/types";

export function ProductQna({
  productId,
  sellerId,
}: {
  productId: string;
  sellerId: string;
}) {
  const [questions, setQuestions] = useState<ProductQuestion[]>([]);
  const [myId, setMyId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    setMyId(userData.user?.id ?? null);
    const { data } = await supabase
      .from("product_questions")
      .select("*, profiles!product_questions_author_id_fkey(username)")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    setQuestions((data as ProductQuestion[]) ?? []);
  }, [productId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const ask = async () => {
    if (!draft.trim()) return;
    setBusy(true);
    await createClient()
      .from("product_questions")
      .insert({ product_id: productId, question: draft.trim() });
    setDraft("");
    setBusy(false);
    load();
  };

  const answer = async (questionId: string) => {
    const text = answerDrafts[questionId]?.trim();
    if (!text) return;
    setBusy(true);
    await createClient().rpc("answer_question", {
      p_question_id: questionId,
      p_answer: text,
    });
    setAnswerDrafts((d) => ({ ...d, [questionId]: "" }));
    setBusy(false);
    load();
  };

  const isOwner = myId != null && myId === sellerId;

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 text-lg font-semibold">
        <HelpCircle className="h-5 w-5 text-accent" /> Questions & réponses
      </h2>

      {myId && !isOwner && (
        <div className="mt-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ex : Livrez-vous à Bouaké ?"
            maxLength={300}
            className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={ask}
            disabled={busy || !draft.trim()}
            className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background disabled:opacity-40"
          >
            Demander
          </button>
        </div>
      )}

      {questions.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Aucune question pour le moment. Soyez le premier !
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {questions.map((q) => (
            <li key={q.id}>
              <div className="flex gap-2">
                <User className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                <div className="flex-1">
                  <p className="text-xs text-muted">
                    {q.profiles?.username ?? "Utilisateur"} ·{" "}
                    {relativeTime(q.created_at)}
                  </p>
                  <p className="text-sm">{q.question}</p>
                </div>
              </div>

              {q.answer ? (
                <div className="ml-6 mt-2 flex gap-2 rounded-lg bg-accent/[0.08] p-3">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p className="text-sm">{q.answer}</p>
                </div>
              ) : (
                isOwner && (
                  <div className="ml-6 mt-2 flex gap-2">
                    <input
                      value={answerDrafts[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswerDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && answer(q.id)}
                      placeholder="Votre réponse…"
                      className="flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm outline-none focus:border-accent"
                    />
                    <button
                      onClick={() => answer(q.id)}
                      disabled={busy}
                      className="rounded-lg border border-border px-3 py-1.5 text-sm hover:border-accent disabled:opacity-40"
                    >
                      Répondre
                    </button>
                  </div>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
