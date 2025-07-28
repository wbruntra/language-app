import { configureStore } from '@reduxjs/toolkit'
import languageHelperReducer from './languageHelperSlice'
import userReducer from './userSlice'

export const store = configureStore({
  reducer: {
    languageHelper: languageHelperReducer,
    user: userReducer,
  },
})

export default store
