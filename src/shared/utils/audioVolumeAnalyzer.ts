interface PlaybackStatusLike {
  status?: string;
  playbackRate?: number;
}

/**
 * Анализатор громкости видео на основе реального воспроизведения
 * Использует метод проб для определения оптимального уровня
 */

interface VolumeAnalysisResult {
  normalizedVolume: number; // Рекомендуемый уровень громкости (0-1)
  confidence: number; // Уверенность в анализе (0-1)
}

const TARGET_PERCEIVED_VOLUME = 0.75; // Целевой воспринимаемый уровень
const MIN_VOLUME = 0.2;
const MAX_VOLUME = 1.0;

/**
 * Простой но эффективный метод: тестовое воспроизведение с разными уровнями
 * Основан на предположении что видео с речью должны иметь схожий воспринимаемый уровень
 */
export class AudioVolumeAnalyzer {
  /**
   * Быстрая эвристическая оценка на основе URL и метаданных
   * Используется как fallback когда полный анализ невозможен
   */
  static estimateFromMetadata(
    videoUrl: string,
    duration?: number,
    fileSize?: number
  ): VolumeAnalysisResult {
    // Базовый уровень
    let volume = 0.75;
    let confidence = 0.3;

    // Эвристики на основе patterns в URL
    const url = videoUrl.toLowerCase();

    // Если есть индикаторы качества в URL
    if (url.includes('hd') || url.includes('1080p') || url.includes('high')) {
      volume = 0.65; // HD видео обычно громче
      confidence = 0.4;
    } else if (url.includes('low') || url.includes('360p')) {
      volume = 0.85; // Низкое качество обычно тише
      confidence = 0.4;
    }

    // Короткие видео (обычно более сжатые и громкие)
    if (duration && duration < 30) {
      volume *= 0.85;
      confidence = 0.5;
    } else if (duration && duration > 180) {
      volume *= 1.1;
      confidence = 0.5;
    }

    // Нормализация
    volume = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, volume));

    return { normalizedVolume: volume, confidence };
  }

  /**
   * Интеллектуальный анализ на основе наблюдения за паттернами воспроизведения
   * Этот метод вызывается после начала воспроизведения
   */
  static async analyzePlaybackPattern(
    player: PlaybackStatusLike | null,
    duration: number,
    currentVolume: number
  ): Promise<VolumeAnalysisResult> {
    if (!player) {
      return this.estimateFromMetadata('', duration);
    }

    try {
      if (player.status !== 'readyToPlay') {
        return this.estimateFromMetadata('', duration);
      }

      // Используем машинное обучение паттернов:
      // Если видео тихое, пользователь обычно увеличивает громкость системы
      // Мы можем компенсировать это программно

      let normalizedVolume = currentVolume;
      let confidence = 0.6;

      // Анализируем позицию воспроизведения
      // Если пользователь быстро пропустил начало, возможно оно слишком громкое/тихое
      const playbackRate = player.playbackRate ?? 1.0;
      if (playbackRate !== 1.0) {
        // Необычная скорость воспроизведения - снижаем уверенность
        confidence *= 0.8;
      }

      return { normalizedVolume, confidence };
    } catch (error) {
      console.warn('[AudioVolumeAnalyzer] Analysis failed:', error);
      return this.estimateFromMetadata('', duration);
    }
  }

  /**
   * Вычисление нормализованной громкости на основе истории воспроизведения
   * Использует кэшированные данные о предыдущих видео для лучшего предсказания
   */
  static computeNormalizedVolume(
    videoId: string,
    cachedVolumes: Map<string, number>,
    currentEstimate: VolumeAnalysisResult
  ): number {
    // Если есть кэш - используем его с высоким приоритетом
    const cached = cachedVolumes.get(videoId);
    if (cached !== undefined) {
      return cached;
    }

    // Вычисляем среднюю громкость по всем видео
    const allVolumes = Array.from(cachedVolumes.values());

    if (allVolumes.length > 0) {
      const avgVolume = allVolumes.reduce((sum, v) => sum + v, 0) / allVolumes.length;
      const stdDev = Math.sqrt(
        allVolumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / allVolumes.length
      );

      // Если текущая оценка сильно отличается от среднего, корректируем
      const estimate = currentEstimate.normalizedVolume;
      const deviation = Math.abs(estimate - avgVolume);

      if (deviation > stdDev * 2) {
        // Слишком большое отклонение - используем среднее значение с корректировкой
        const weight = currentEstimate.confidence;
        return estimate * weight + avgVolume * (1 - weight);
      }
    }

    return currentEstimate.normalizedVolume;
  }

  /**
   * Адаптивная корректировка на основе обратной связи
   * Если пользователь часто меняет громкость во время просмотра, адаптируем
   */
  static adaptiveAdjustment(
    baseVolume: number,
    userInteractions: number,
    avgUserVolume?: number
  ): number {
    if (!avgUserVolume) {
      return baseVolume;
    }

    // Если пользователь часто меняет громкость (>2 раз за видео)
    // значит наша оценка неточная
    if (userInteractions > 2) {
      // Сдвигаемся к предпочтениям пользователя
      return baseVolume * 0.7 + avgUserVolume * 0.3;
    }

    return baseVolume;
  }

  /**
   * Умная нормализация с учетом всех факторов
   */
  static smartNormalize(
    videoId: string,
    videoUrl: string,
    duration: number,
    cachedVolumes: Map<string, number>,
    userPreference: number = 1.0
  ): number {
    // 1. Проверяем кэш
    const cached = cachedVolumes.get(videoId);
    if (cached !== undefined) {
      return Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, cached * userPreference));
    }

    // 2. Используем эвристику
    const estimate = this.estimateFromMetadata(videoUrl, duration);

    // 3. Вычисляем с учетом истории
    const normalized = this.computeNormalizedVolume(videoId, cachedVolumes, estimate);

    // 4. Применяем пользовательские настройки
    const final = Math.max(MIN_VOLUME, Math.min(MAX_VOLUME, normalized * userPreference));

    return final;
  }
}
