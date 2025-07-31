import { configureStore } from '@reduxjs/toolkit'
import languageHelperReducer from './languageHelperSlice'
import userReducer from './userSlice'
import tabooGameReducer from './tabooGameSlice'
import storiesReducer from './storiesSlice'
import type { RootState } from '../types'

export const store = configureStore({
  reducer: {
    languageHelper: languageHelperReducer,
    user: userReducer,
    tabooGame: tabooGameReducer,
    stories: storiesReducer,
  },
})

export type AppDispatch = typeof store.dispatch
export type { RootState }

export default store
