import AsyncStorage from "@react-native-async-storage/async-storage";
import { combineReducers, configureStore } from "@reduxjs/toolkit";
import {
  FLUSH,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
  REHYDRATE,
  persistReducer,
  persistStore,
} from "redux-persist";

import { authReducer } from "@features/auth/model/authSlice";
import { coursesReducer } from "@features/courses/model/coursesSlice";
import { progressReducer } from "@features/progress/model/progressSlice";
import { dictionaryReducer } from "@features/dictionary/model/dictionarySlice";
import { roadmapReducer } from "@features/roadmap/model/roadmapSlice";
import { userReducer } from "@entities/user/model/userSlice";
import { videoLearningReducer } from "@features/video-learning/model/videoLearningSlice";
import { videoSettingsReducer } from "@features/video-learning/model/videoSettingsSlice";
import { volumeSettingsReducer } from "@features/video-learning/model/volumeSettingsSlice";

const rootReducer = combineReducers({
  auth: authReducer,
  user: userReducer,
  courses: coursesReducer,
  progress: progressReducer,
  dictionary: dictionaryReducer,
  roadmap: roadmapReducer,
  videoLearning: videoLearningReducer,
  videoSettings: videoSettingsReducer,
  volumeSettings: volumeSettingsReducer,
});

const persistConfig = {
  key: "root",
  storage: AsyncStorage,
  whitelist: ["auth", "user", "videoSettings", "volumeSettings"],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

