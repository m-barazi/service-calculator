import { useCallback, useEffect, useState } from 'react'
import type { PaginationMeta } from '../types'

interface UsePagedListOptions<T> {
  fetchPage: (page: number, limit: number) => Promise<{ data: T[]; pagination: PaginationMeta }>
  limit?: number
  initialPage?: number
}

interface UsePagedListResult<T> {
  data: T[]
  pagination: PaginationMeta
  isLoading: boolean
  loadPage: (page: number) => Promise<void>
  refresh: () => Promise<void>
}

export function usePagedList<T>({ fetchPage, limit = 25, initialPage = 1 }: UsePagedListOptions<T>): UsePagedListResult<T> {
  const [data, setData] = useState<T[]>([])
  const [pagination, setPagination] = useState<PaginationMeta>({
    page: initialPage,
    limit,
    total: 0,
    totalPages: 0,
  })
  const [isLoading, setIsLoading] = useState(true)

  const loadPage = useCallback(async (page: number) => {
    setIsLoading(true)
    try {
      const result = await fetchPage(page, limit)
      setData(result.data)
      setPagination(result.pagination)
    } finally {
      setIsLoading(false)
    }
  }, [fetchPage, limit])

  const refresh = useCallback(async () => {
    await loadPage(pagination.page)
  }, [loadPage, pagination.page])

  useEffect(() => {
    loadPage(initialPage)
  }, [loadPage, initialPage])

  return { data, pagination, isLoading, loadPage, refresh }
}
