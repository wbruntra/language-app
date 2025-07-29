import { configureStore } from '@reduxjs/toolkit'
import languageHelperReducer from './languageHelperSlice'
import userReducer from './userSlice'
import type { RootState } from '../types'

export const store = configureStore({
  reducer: {
    languageHelper: languageHelperReducer,
    user: userReducer,
  },
})

export type AppDispatch = typeof store.dispatch
export type { RootState }

export default store
