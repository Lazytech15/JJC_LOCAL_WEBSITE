"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import wsService from "../services/websocket"

/**
 * Hook for WebSocket connection and events
 */
export function useWebSocket(url, token, enabled = true) {
  const [status, setStatus] = useState("disconnected")
  const [lastMessage, setLastMessage] = useState(null)
  const listenersRef = useRef({})

  useEffect(() => {
    if (!enabled || !url || !token) return

    // Connect to WebSocket
    wsService.connect(url, token)

    // Status listeners
    const handleConnected = () => setStatus("connected")
    const handleDisconnected = () => setStatus("disconnected")
    const handleError = () => setStatus("error")

    wsService.on("connected", handleConnected)
    wsService.on("disconnected", handleDisconnected)
    wsService.on("error", handleError)

    // Update status immediately
    setStatus(wsService.getStatus())

    return () => {
      wsService.off("connected", handleConnected)
      wsService.off("disconnected", handleDisconnected)
      wsService.off("error", handleError)
    }
  }, [url, token, enabled])

  const subscribe = useCallback((event, callback) => {
    wsService.on(event, callback)

    if (!listenersRef.current[event]) {
      listenersRef.current[event] = []
    }
    listenersRef.current[event].push(callback)

    return () => {
      wsService.off(event, callback)
      listenersRef.current[event] = listenersRef.current[event].filter((cb) => cb !== callback)
    }
  }, [])

  const send = useCallback((type, data) => {
    wsService.send(type, data)
  }, [])

  const disconnect = useCallback(() => {
    wsService.disconnect()
  }, [])

  return {
    status,
    isConnected: status === "connected",
    lastMessage,
    subscribe,
    send,
    disconnect,
  }
}
