import { useEffect } from "react"
import { useGlobalStore } from "../store"
import { useSDK } from "../context/SDKContext"
import type { Event, Session, Message, Part, FileDiff, Todo, PermissionRequest, QuestionRequest } from "@/sdk/v2/gen/types.gen"

export function useEventHandler() {
  const {
    addSession,
    updateSession,
    deleteSession,
    setSessionStatus,
    addMessage,
    updateMessage,
    removeMessage,
    addPart,
    updatePart,
    removePart,
    setDiffs,
    setTodos,
    addPermission,
    removePermission,
    addQuestion,
    removeQuestion,
  } = useGlobalStore()

  const { event } = useSDK()

  useEffect(() => {
    function handleEvent(event: Event) {
      console.log("[SDK Event]", event.type, event.properties)

      switch (event.type) {
        case "session.created":
          addSession(event.properties.info)
          break

        case "session.deleted":
          deleteSession(event.properties.info.id)
          break

        case "session.updated":
          updateSession(event.properties.info)
          break

        case "session.status":
          setSessionStatus(event.properties.sessionID, event.properties.status)
          break

        case "session.idle":
          setSessionStatus(event.properties.sessionID, { type: "idle" })
          break

        case "message.updated":
          const msgInfo = event.properties.info
          const currentMessages = useGlobalStore.getState().messages
          const sessionMessages = currentMessages.get(msgInfo.sessionID) || []
          const existingMessage = sessionMessages.find((m) => m.id === msgInfo.id)

          if (existingMessage) {
            updateMessage(msgInfo.sessionID, msgInfo)
          } else {
            addMessage(msgInfo.sessionID, msgInfo)
          }
          break

        case "message.removed":
          removeMessage(event.properties.sessionID, event.properties.messageID)
          break

        case "message.part.updated":
          const { part, delta } = event.properties
          const parts = useGlobalStore.getState().parts
          const key = `${part.sessionID}:${part.messageID}`
          const existingParts = parts.get(key) || []
          const existingPart = existingParts.find((p) => p.id === part.id)

          if (delta && existingPart && existingPart.type === "text" && part.type === "text") {
            updatePart(part.sessionID, part.messageID, {
              ...part,
              text: existingPart.text + delta,
            })
          } else if (existingPart) {
            updatePart(part.sessionID, part.messageID, part)
          } else {
            addPart(part.sessionID, part.messageID, part)
          }
          break

        case "message.part.removed":
          removePart(event.properties.sessionID, event.properties.messageID, event.properties.partID)
          break

        case "session.diff":
          setDiffs(event.properties.sessionID, event.properties.diff)
          break

        case "todo.updated":
          setTodos(event.properties.sessionID, event.properties.todos)
          break

        case "permission.asked":
          addPermission(event.properties)
          break

        case "permission.replied":
          removePermission(event.properties.requestID)
          break

        case "question.asked":
          addQuestion(event.properties)
          break

        case "question.replied":
          removeQuestion(event.properties.requestID)
          break
      }
    }

    const unsubscribe = event.on("*", handleEvent)
    return unsubscribe
  }, [
    event,
    addSession,
    updateSession,
    deleteSession,
    setSessionStatus,
    addMessage,
    updateMessage,
    removeMessage,
    addPart,
    updatePart,
    removePart,
    setDiffs,
    setTodos,
    addPermission,
    removePermission,
    addQuestion,
    removeQuestion,
  ])
}
