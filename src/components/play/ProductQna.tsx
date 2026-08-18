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

  const inputCls =
    "card-hard-sm w-full rounded-full bg-surface px-3 py-1.5 text-sm outline-none transition-all focus:translate-x-0.5 focus:translate-y-0.5 focus:shadow-[4px_4px_0_0_var(--accent)]";
  const btnInk =
    "card-hard-sm press shrink-0 rounded-full bg-foreground px-3.5 py-1.5 font-display text-sm font-bold text-background transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40";
  const btnPaper =
    "card-hard-sm press shrink-0 rounded-full bg-surface px-3 py-1.5 text-sm font-display font-bold text-foreground transition-all hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-40";

  return (
    <section className="card-hard rounded-3xl bg-surface p-4 sm:p-5">
      <h2 className="flex items-center gap-2.5 font-display text-lg font-extrabold tracking-tight">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border-2 border-border bg-sun text-foreground">
          <HelpCircle className="h-3.5 w-3.5" />
        </span>
        Questions & réponses
      </h2>

      {myId && !isOwner && (
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask()}
            placeholder="Ex : Livrez-vous à Bouaké ?"
            maxLength={300}
            className={inputCls}
          />
          <button onClick={ask} disabled={busy || !draft.trim()} className={btnInk}>
            Demander
          </button>
        </div>
      )}

      {questions.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Aucune question pour le moment. Soyez le premier !
        </p>
      ) : (
        <ul className="mt-5 space-y-5">
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
                <div className="ml-6 mt-2 flex gap-2 rounded-2xl bg-surface-2 p-3">
                  <Store className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <p className="text-sm">{q.answer}</p>
                </div>
              ) : (
                isOwner && (
                  <div className="ml-6 mt-2 flex flex-wrap gap-2">
                    <input
                      value={answerDrafts[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswerDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === "Enter" && answer(q.id)}
                      placeholder="Votre réponse…"
                      className={inputCls}
                    />
                    <button
                      onClick={() => answer(q.id)}
                      disabled={busy}
                      className={btnPaper}
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
