"use client"

import { useState, useEffect, useCallback } from "react"
import { getItem, setItem, getAllItems, deleteItem } from "../utils/db"

/**
 * Hook for IndexedDB operations
 */
export function useIndexedDB(storeName, key = null) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const result = key ? await getItem(storeName, key) : await getAllItems(storeName)
      setData(result)
    } catch (err) {
      console.error("[IndexedDB] Error fetching data:", err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [storeName, key])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const saveData = useCallback(
    async (newData) => {
      try {
        await setItem(storeName, newData)
        await fetchData()
        return true
      } catch (err) {
        console.error("[IndexedDB] Error saving data:", err)
        setError(err)
        return false
      }
    },
    [storeName, fetchData],
  )

  const removeData = useCallback(
    async (itemKey) => {
      try {
        await deleteItem(storeName, itemKey)
        await fetchData()
        return true
      } catch (err) {
        console.error("[IndexedDB] Error deleting data:", err)
        setError(err)
        return false
      }
    },
    [storeName, fetchData],
  )

  return {
    data,
    loading,
    error,
    saveData,
    removeData,
    refresh: fetchData,
  }
}
