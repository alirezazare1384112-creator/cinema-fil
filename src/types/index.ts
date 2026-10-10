export interface Media {
  id: string
  tmdbId: number
  title: string
  overview?: string | null
  posterPath?: string | null
  backdropPath?: string | null
  mediaType: string
  releaseDate?: string | null
  rating?: number | null
  userRating?: number | null
  watchStatus: string
  personalReview?: string | null
  notes?: string | null
  watchDate?: Date | null
  genres?: string | null
  category?: string | null
  /** آدرس صفحهٔ همین اثر در سایت فیلم (برای لینک‌های دانلود) */
  detailUrl?: string | null
  createdAt: Date
  updatedAt: Date
  localFiles?: LocalFile[]
  edits?: MediaEdit[]
  quotes?: Quote[]
}

export interface LocalFile {
  id: string
  mediaId?: string | null
  filePath: string
  fileName: string
  fileSize?: string | null
  resolution?: string | null
  format?: string | null
  codec?: string | null
  driveLabel?: string | null
  folderPath?: string | null
  poster?: string | null
  subtitle?: string | null
  category?: string | null
  lastPlayed?: Date | null
  createdAt: Date
  updatedAt: Date
  media?: Media | null
}

export interface MediaEdit {
  id: string
  mediaId?: string | null
  folderId?: string | null
  title: string
  description?: string | null
  videoUrl: string
  thumbnailUrl?: string | null
  tags?: string | null
  audioInfo?: string | null
  duration?: number | null
  createdAt: Date
  updatedAt: Date
  media?: Media | null
  folder?: EditFolder | null
}

export interface EditFolder {
  id: string
  name: string
  thumbnailUrl?: string | null
  createdAt: Date
  updatedAt: Date
  editCount?: number
}

export interface Quote {
  id: string
  mediaId?: string | null
  movieTitle?: string | null
  quoteText: string
  character?: string | null
  scene?: string | null
  backdropUrl?: string | null
  gifUrl?: string | null
  createdAt: Date
  updatedAt: Date
  media?: Media | null
}

export interface TMDBMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  genre_ids: number[]
  media_type?: string
  popularity?: number
  genre_names?: string[]
  source?: 'f2m'
  detail_url?: string
}

export interface TMDBTVShow {
  id: number
  name: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  first_air_date: string
  vote_average: number
  genre_ids: number[]
  media_type?: string
  popularity?: number
  genre_names?: string[]
  source?: 'f2m'
  detail_url?: string
}

export interface TMDBSearchResult {
  results: (TMDBMovie | TMDBTVShow)[]
  total_results: number
  total_pages: number
}
