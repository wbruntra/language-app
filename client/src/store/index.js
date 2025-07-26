import { configureStore } from '@reduxjs/toolkit'
import languageHelperReducer from './languageHelperSlice'

export const store = configureStore({
  reducer: {
    languageHelper: languageHelperReducer,
  },
})

export default store
