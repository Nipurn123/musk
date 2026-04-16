import { useState } from "react"
import { X, HelpCircle, CheckCircle, Send, XCircle, MessageSquare } from "lucide-react"
import { useGlobalStore } from "../store"
import { api, endpoints } from "../lib/api"

export function QuestionDialog() {
  const questions = useGlobalStore((s) => s.questions)
  const removeQuestion = useGlobalStore((s) => s.removeQuestion)
  const [responses, setResponses] = useState<Record<string, string[]>>({})
  const [textInputs, setTextInputs] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<"submit" | "reject" | null>(null)

  const currentQuestion = questions[0]

  if (!currentQuestion) return null

  function handleOptionSelect(questionIndex: number, optionLabel: string, multiple?: boolean) {
    const key = `${currentQuestion.id}-${questionIndex}`
    if (multiple) {
      setResponses((prev) => {
        const current = prev[key] || []
        const newValues = current.includes(optionLabel)
          ? current.filter((v) => v !== optionLabel)
          : [...current, optionLabel]
        return { ...prev, [key]: newValues }
      })
    } else {
      setResponses({ ...responses, [key]: [optionLabel] })
    }
  }

  function handleTextInput(questionIndex: number, value: string) {
    const key = `${currentQuestion.id}-${questionIndex}`
    setTextInputs({ ...textInputs, [key]: value })
  }

  async function handleSubmit() {
    setLoading("submit")
    try {
      const answers = currentQuestion.questions.map((q, i) => {
        const key = `${currentQuestion.id}-${i}`
        if (q.options.length === 0) {
          return [textInputs[key] || ""]
        }
        return responses[key] || []
      })

      await api.post(endpoints.questionReply(currentQuestion.id), {
        answers,
      })
      removeQuestion(currentQuestion.id)
      setResponses({})
      setTextInputs({})
    } catch (err) {
      console.error("Failed to reply to question:", err)
    } finally {
      setLoading(null)
    }
  }

  async function handleReject() {
    setLoading("reject")
    try {
      await api.post(endpoints.questionReject(currentQuestion.id))
      removeQuestion(currentQuestion.id)
      setResponses({})
      setTextInputs({})
    } catch (err) {
      console.error("Failed to reject question:", err)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg">Question</span>
              <span className="text-[10px] text-textMuted">
                {currentQuestion.questions.length} question{currentQuestion.questions.length > 1 ? "s" : ""}
              </span>
            </div>
          </div>
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="p-2 hover:bg-surfaceHover rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-textMuted" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {currentQuestion.questions.map((q, qi) => {
            const key = `${currentQuestion.id}-${qi}`
            const selected = responses[key] || []
            const hasOptions = q.options.length > 0

            return (
              <div key={qi} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-textPrimary">{q.question}</span>
                  {q.multiple && hasOptions && (
                    <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full">Multiple</span>
                  )}
                </div>

                {!hasOptions ? (
                  <div className="relative">
                    <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-textMuted" />
                    <textarea
                      value={textInputs[key] || ""}
                      onChange={(e) => handleTextInput(qi, e.target.value)}
                      placeholder="Type your answer..."
                      rows={3}
                      className="w-full pl-10 pr-3 py-2 bg-background border border-border rounded-xl text-sm resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    {q.options.map((opt, oi) => {
                      const isSelected = selected.includes(opt.label)
                      return (
                        <button
                          key={oi}
                          onClick={() => handleOptionSelect(qi, opt.label, q.multiple)}
                          className={`w-full p-3 text-left rounded-xl border transition-all ${
                            isSelected
                              ? "bg-primary/10 border-primary/30 text-primary"
                              : "bg-background border-border hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div
                              className={`w-5 h-5 rounded shrink-0 flex items-center justify-center mt-0.5 ${
                                isSelected ? "bg-primary text-white" : "bg-surface border border-border"
                              }`}
                            >
                              {isSelected && <CheckCircle className="w-3 h-3" />}
                            </div>
                            <div>
                              <div className="text-sm font-medium">{opt.label}</div>
                              {opt.description && (
                                <div className="text-xs text-textMuted mt-0.5">{opt.description}</div>
                              )}
                            </div>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="flex items-center gap-3 px-6 py-4 bg-background border-t border-border">
          <button
            onClick={handleReject}
            disabled={loading !== null}
            className="flex-1 py-2.5 px-4 bg-surface hover:bg-surfaceHover border border-border rounded-xl transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === "reject" ? (
              <div className="w-4 h-4 border-2 border-textMuted/30 border-t-textMuted rounded-full animate-spin" />
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                Cancel
              </>
            )}
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading !== null}
            className="flex-1 py-2.5 px-4 bg-primary hover:bg-primaryHover text-white rounded-xl transition-colors font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading === "submit" ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
