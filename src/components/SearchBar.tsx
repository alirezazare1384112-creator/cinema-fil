'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Search, X, Loader2, Film, Tv, Clock, Trash2, Library } from 'lucide-react'
import { getPosterURL } from '@/lib/tmdb'
import type { Media, TMDBMovie, TMDBTVShow } from '@/types'

interface SearchBarProps {
  onSelect: (item: TMDBMovie | TMDBTVShow) => void
  onSelectLocalMedia?: (m: Media) => void
  placeholder?: string
}

type SearchEntry =
  | { kind: 'local'; item: Media }
  | { kind: 'tmdb'; item: TMDBMovie | TMDBTVShow }

export default function SearchBar({ onSelect, onSelectLocalMedia, placeholder = 'جستجوی فیلم و سریال...' }: SearchBarProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<(TMDBMovie | TMDBTVShow)[]>([])
  const [localResults, setLocalResults] = useState<Media[]>([])
  const [libraryMedia, setLibraryMedia] = useState<Media[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    fetch('/api/media')
      .then((r) => r.json())
      .then((data) => setLibraryMedia(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const saved = localStorage.getItem('search_history')
    if (saved) {
      try { setSearchHistory(JSON.parse(saved)) } catch { /* ignore */ }
    }
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const localMatches = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return libraryMedia
      .filter((m) => m.title.toLowerCase().includes(q) || m.notes?.toLowerCase().includes(q))
      .slice(0, 5)
  }, [query, libraryMedia])

  useEffect(() => {
    setLocalResults(localMatches)
  }, [localMatches])

  const combinedEntries = useMemo<SearchEntry[]>(() => {
    const entries: SearchEntry[] = []
    for (const m of localResults) entries.push({ kind: 'local', item: m })
    for (const r of results) entries.push({ kind: 'tmdb', item: r })
    return entries
  }, [localResults, results])

  useEffect(() => {
    setActiveIndex(-1)
  }, [combinedEntries.length, query])

  const saveToHistory = (term: string) => {
    if (!term.trim()) return
    const updated = [term, ...searchHistory.filter(h => h !== term)].slice(0, 10)
    setSearchHistory(updated)
    localStorage.setItem('search_history', JSON.stringify(updated))
  }

  const removeFromHistory = (term: string) => {
    const updated = searchHistory.filter(h => h !== term)
    setSearchHistory(updated)
    localStorage.setItem('search_history', JSON.stringify(updated))
  }

  const clearHistory = () => {
    setSearchHistory([])
    localStorage.removeItem('search_history')
  }

  const searchOnline = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    setSearchError('')
    try {
      const url = `/api/f2m?action=list&type=all&page=1&q=${encodeURIComponent(searchQuery)}`
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data?.error || 'جستجو با خطا مواجه شد')
      }

      setResults(data.results?.slice(0, 8) || [])
      setIsOpen(true)
    } catch (error) {
      console.error('Search error:', error)
      setResults([])
      setSearchError(error instanceof Error ? error.message : 'جستجو با خطا مواجه شد')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (value: string) => {
    setQuery(value)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (value.trim()) {
      setIsOpen(true)
      debounceRef.current = setTimeout(() => {
        searchOnline(value)
      }, 400)
    } else {
      setResults([])
      setIsOpen(true)
      setSearchError('')
    }
  }

  const closeSearch = () => {
    setQuery('')
    setResults([])
    setLocalResults([])
    setSearchError('')
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handlePick = (entry: SearchEntry) => {
    if (entry.kind === 'local') {
      const m = entry.item
      if (onSelectLocalMedia) {
        onSelectLocalMedia(m)
      } else {
        setQuery(m.title)
        searchOnline(m.title)
        return
      }
    } else {
      const title = 'title' in entry.item ? entry.item.title : entry.item.name
      saveToHistory(title)
      onSelect(entry.item)
    }
    setQuery('')
    setResults([])
    setLocalResults([])
    setSearchError('')
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false)
      return
    }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      if (!isOpen) {
        setIsOpen(true)
        return
      }
      if (combinedEntries.length === 0) return
      e.preventDefault()
      const dir = e.key === 'ArrowDown' ? 1 : -1
      setActiveIndex((prev) => {
        const next = prev + dir
        if (next < 0) return combinedEntries.length - 1
        if (next >= combinedEntries.length) return 0
        return next
      })
      return
    }
    if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < combinedEntries.length) {
        e.preventDefault()
        handlePick(combinedEntries[activeIndex])
      }
      return
    }
  }

  const handleHistorySelect = (term: string) => {
    setQuery(term)
    searchOnline(term)
  }

  const getTitle = (item: TMDBMovie | TMDBTVShow) => {
    return 'title' in item ? item.title : item.name
  }

  const getYear = (item: TMDBMovie | TMDBTVShow) => {
    const date = 'release_date' in item ? item.release_date : item.first_air_date
    return date?.split('-')[0] || ''
  }

  const getMediaType = (item: TMDBMovie | TMDBTVShow | Media) => {
    if ('mediaType' in item) return item.mediaType || 'movie'
    return item.media_type || ('title' in item ? 'movie' : 'tv')
  }

  const tmdbOffline = searchError && results.length === 0 && localResults.length === 0

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            setIsOpen(true)
            if (query.trim() && results.length === 0 && !isLoading) searchOnline(query)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-12 pr-12 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all text-right"
        />
        {query && (
          <button
            onClick={closeSearch}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
        {isLoading && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            <Loader2 className="w-5 h-5 text-violet-400 animate-spin" />
          </div>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 glass-card max-h-96 overflow-y-auto z-50 animate-fade-in">
          {!query && searchHistory.length > 0 && (
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  تاریخچه جستجو
                </span>
                <button
                  onClick={clearHistory}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  پاک کردن
                </button>
              </div>
              {searchHistory.map((term, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 hover:bg-white/10 rounded-lg cursor-pointer group"
                >
                  <button
                    onClick={() => handleHistorySelect(term)}
                    className="flex items-center gap-2 text-gray-300 text-sm flex-1"
                  >
                    <Clock className="w-4 h-4 text-gray-500" />
                    {term}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromHistory(term)
                    }}
                    className="p-1 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {query && localResults.length > 0 && (
            <div className="p-3">
              <div className="flex items-center gap-2 mb-2 text-sm text-gray-400">
                <Library className="w-4 h-4 text-violet-400" />
                کتابخانه من
              </div>
              {localResults.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handlePick({ kind: 'local', item: m })}
                  className="w-full flex items-center gap-4 p-3 hover:bg-white/10 transition-colors rounded-lg"
                >
                  <img
                    src={getPosterURL(m.posterPath ?? null, 'w200')}
                    alt={m.title}
                    className="w-10 h-14 rounded-lg object-cover"
                  />
                  <div className="flex-1 text-right">
                    <h4 className="font-medium text-white">{m.title}</h4>
                    <div className="flex items-center gap-2 mt-1 justify-end">
                      <span className="text-sm text-gray-500">{m.releaseDate?.split('-')[0]}</span>
                      <span className="text-sm text-gray-400">{getMediaType(m) === 'movie' ? 'فیلم' : 'سریال'}</span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs shrink-0">
                    در کتابخانه است
                  </span>
                </button>
              ))}
            </div>
          )}

          {query && results.length > 0 && (
            <div>
              <div className="flex items-center gap-2 px-4 pt-3 pb-1 text-sm text-gray-400">
                <Search className="w-4 h-4 text-gray-500" />
                نتایج اینترنتی
              </div>
              {results.map((item, index) => (
                <button
                  key={item.id}
                  onMouseEnter={() => setActiveIndex(localResults.length + index)}
                  onClick={() => handlePick({ kind: 'tmdb', item })}
                  className={`w-full flex items-center gap-4 p-4 transition-colors border-b border-white/5 last:border-0 ${
                    activeIndex === localResults.length + index ? 'bg-white/10' : 'hover:bg-white/10'
                  }`}
                >
                  <img
                    src={getPosterURL(item.poster_path, 'w200')}
                    alt={getTitle(item)}
                    className="w-12 h-16 rounded-lg object-cover"
                  />
                  <div className="flex-1 text-right">
                    <h4 className="font-medium text-white">{getTitle(item)}</h4>
                    <div className="flex items-center gap-2 mt-1 justify-end">
                      <span className="text-sm text-gray-500">{getYear(item)}</span>
                      <span className="text-sm text-gray-400 capitalize">
                        {getMediaType(item) === 'movie' ? 'فیلم' : 'سریال'}
                      </span>
                      {getMediaType(item) === 'movie' ? (
                        <Film className="w-3 h-3 text-violet-400" />
                      ) : (
                        <Tv className="w-3 h-3 text-pink-400" />
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium text-yellow-400">★ {item.vote_average.toFixed(1)}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query && combinedEntries.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              {searchError ? (
                <>
                  <p className="text-red-400 text-sm">{searchError}</p>
                  <p className="text-gray-500 text-xs mt-2">ممکن است سایت فیلم در دسترس نباشد؛ کمی بعد دوباره تلاش کن</p>
                </>
              ) : (
                <p className="text-gray-400">نتیجه‌ای برای &quot;{query}&quot; یافت نشد</p>
              )}
            </div>
          )}

          {tmdbOffline && (
            <div className="px-4 pb-3 -mt-2">
              <p className="text-xs text-amber-400/80">
                جستجوی اینترنتی در دسترس نیست؛ ولی می‌توانی به کتابخانه خودت اضافه کنی.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}