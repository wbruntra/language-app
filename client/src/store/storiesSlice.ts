import { createAsyncThunk, createSlice, createEntityAdapter, PayloadAction } from '@reduxjs/toolkit'
import type { RootState } from '../types'

type StoryPanel = {
  panelNumber: number
  description: string
  fullPrompt: string
  imageUrl: string
  thumbnailUrl?: string | null
}

type StoryPrompt = {
  storyDescription: string
  sceneDescriptions: string[]
  theme: string
  characterType: string
  generatedAt: string
}

type StoryImages = {
  panels: StoryPanel[]
  totalPanels: number
  imageType: string
}

export type Story = {
  id: number
  prompt: StoryPrompt
  language: string
  images: StoryImages
  category: string
  difficulty: string
  description: string
  metadata?: any
  is_active: boolean
  usage_count: number
  upvotes: number
  downvotes: number
  created_at: string
  updated_at: string
}

type Pagination = {
  total: number
  page: number
  totalPages: number
  limit: number
  offset: number
  hasMore: boolean
}

type StoriesResponse = {
  success: boolean
  stories: Story[]
  pagination: Pagination
}

type StoryDetailResponse = {
  success: boolean
  story: Story
}

const storiesAdapter = createEntityAdapter<Story>({
  selectId: (story) => story.id,
  sortComparer: (a, b) => b.created_at.localeCompare(a.created_at),
})

type StoriesExtraState = {
  listLoading: boolean
  listError: string | null
  pagination: Pagination | null
  detailLoading: boolean
  detailError: string | null
  currentId: number | null
}

const initialState = storiesAdapter.getInitialState<StoriesExtraState>({
  listLoading: false,
  listError: null,
  pagination: null,
  detailLoading: false,
  detailError: null,
  currentId: null,
})

export const fetchStories = createAsyncThunk(
  'stories/fetchStories',
  async (params: { limit?: number; is_active?: boolean } | undefined = { limit: 20, is_active: true }) => {
    const qs = new URLSearchParams()
    if (params?.limit != null) qs.set('limit', String(params.limit))
    if (params?.is_active != null) qs.set('is_active', String(params.is_active))
    const response = await fetch(`/api/stories?${qs.toString()}`)
    if (!response.ok) throw new Error('Failed to fetch stories')
    const data: StoriesResponse = await response.json()
    if (!data.success) throw new Error('Failed to load stories')
    return data
  }
)

export const fetchStoryById = createAsyncThunk('stories/fetchStoryById', async (id: number) => {
  const response = await fetch(`/api/stories/${id}`)
  if (!response.ok) {
    if (response.status === 404) throw new Error('Story not found')
    throw new Error('Failed to fetch story details')
  }
  const data: StoryDetailResponse = await response.json()
  if (!data.success) throw new Error('Failed to load story details')
  return data.story
})

const storiesSlice = createSlice({
  name: 'stories',
  initialState,
  reducers: {
    setCurrentStoryId(state, action: PayloadAction<number | null>) {
      state.currentId = action.payload
    },
    clearCurrentStory(state) {
      state.currentId = null
    },
    clearDetailCache(state) {
      // no-op for adapter; we just unset currentId, data remains cached unless explicitly removed
      state.currentId = null
      state.detailError = null
    },
    removeStory(state, action: PayloadAction<number>) {
      storiesAdapter.removeOne(state, action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      // List
      .addCase(fetchStories.pending, (state) => {
        state.listLoading = true
        state.listError = null
      })
      .addCase(fetchStories.fulfilled, (state, action) => {
        state.listLoading = false
        storiesAdapter.setAll(state, action.payload.stories)
        state.pagination = action.payload.pagination
      })
      .addCase(fetchStories.rejected, (state, action) => {
        state.listLoading = false
        state.listError = action.error.message ?? 'Failed to load stories'
      })
      // Detail
      .addCase(fetchStoryById.pending, (state) => {
        state.detailLoading = true
        state.detailError = null
      })
      .addCase(fetchStoryById.fulfilled, (state, action) => {
        state.detailLoading = false
        storiesAdapter.upsertOne(state, action.payload)
      })
      .addCase(fetchStoryById.rejected, (state, action) => {
        state.detailLoading = false
        state.detailError = action.error.message ?? 'Failed to load story details'
      })
  },
})

export const { setCurrentStoryId, clearCurrentStory, clearDetailCache, removeStory } = storiesSlice.actions

// Selectors
const selectors = storiesAdapter.getSelectors<(state: RootState) => ReturnType<typeof storiesSlice.reducer>>(
  (state: RootState) => state.stories as any
)

export const selectStories = selectors.selectAll
export const selectStoriesMap = selectors.selectEntities
export const selectStoryById = selectors.selectById
export const selectStoriesListLoading = (state: RootState) => (state.stories as any).listLoading as boolean
export const selectStoriesListError = (state: RootState) => (state.stories as any).listError as string | null
export const selectStoriesPagination = (state: RootState) => (state.stories as any).pagination as Pagination | null
export const selectDetailLoading = (state: RootState) => (state.stories as any).detailLoading as boolean
export const selectDetailError = (state: RootState) => (state.stories as any).detailError as string | null
export const selectCurrentStoryId = (state: RootState) => (state.stories as any).currentId as number | null

export default storiesSlice.reducer