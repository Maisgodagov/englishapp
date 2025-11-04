# Фильтрация видео по модерации

## Проблема, которую мы решили

**Симптом:** На телефоне показывается "Нет доступных видео", а в веб-версии видео есть.

**Причина:** Разные фильтры модерации для админов и обычных пользователей.

## Как работает модерация

### Три режима фильтрации:

1. **`'moderated'`** - только промодерированные видео (`isModerated: true`)
2. **`'unmoderated'`** - только непромодерированные видео (`isModerated: false`)
3. **`'all'`** - все видео, независимо от статуса модерации

### Логика в коде:

```typescript
// В videoLearningSlice.ts
const isAdmin = state.user.profile?.role === 'admin';
const moderationFilter = isAdmin
  ? state.videoSettings.moderationFilter  // Админ выбирает сам
  : (__DEV__ ? 'all' : 'moderated');     // Юзер видит только модерированные (в проде)
```

### Поведение:

| Роль | Development | Production |
|------|-------------|------------|
| **Админ** | Выбирает сам в настройках | Выбирает сам в настройках |
| **Обычный пользователь** | Видит ВСЕ видео (`'all'`) | Видит только модерированные (`'moderated'`) |

## Зачем нужна модерация?

1. **Контроль качества** - админ проверяет видео перед публикацией
2. **Безопасность контента** - фильтрация неподходящего контента
3. **Постепенный релиз** - можно добавлять видео без моментальной публикации

## Как промодерировать видео

### Через админ-панель в приложении:

1. Откройте приложение как **админ** (role: 'admin')
2. Перейдите в раздел видео-обучения
3. На каждом видео есть кнопка модерации (иконка карандаша)
4. Отметьте видео как промодерированное
5. Теперь оно будет видно обычным пользователям (в production)

### Через базу данных напрямую:

```sql
-- Промодерировать все видео
UPDATE video_contents SET isModerated = true;

-- Промодерировать конкретное видео
UPDATE video_contents SET isModerated = true WHERE id = 1450;

-- Проверить статус модерации
SELECT id, videoName, isModerated FROM video_contents;
```

## Настройки фильтра для админа

Админ может выбрать фильтр в настройках приложения:

```typescript
// В videoSettingsSlice.ts
const initialState: VideoSettingsState = {
  // ...
  moderationFilter: 'moderated', // 'all' | 'moderated' | 'unmoderated'
};
```

Это позволяет админу:
- Смотреть непромодерированные видео (`'unmoderated'`)
- Смотреть все видео вперемешку (`'all'`)
- Смотреть как обычный пользователь (`'moderated'`)

## Development vs Production

### В режиме разработки (`__DEV__ === true`):
```typescript
moderationFilter: 'all' // Видны ВСЕ видео
```
**Зачем:** Удобно тестировать новые видео без необходимости их модерировать

### В production (`__DEV__ === false`):
```typescript
moderationFilter: 'moderated' // Только промодерированные
```
**Зачем:** Пользователи видят только проверенный контент

## Важно для разработки

⚠️ **Если вы тестируете на телефоне:**
- Убедитесь, что запущен **development build** (не production)
- Проверьте, что `__DEV__` определён как `true`
- Или промодерируйте тестовые видео в базе

⚠️ **Если видео не показываются:**
1. Проверьте логи бэкенда - там видно, какой фильтр используется:
   ```
   GET /api/video-learning/feed?moderationFilter=moderated
   ```
2. Проверьте статус модерации в базе:
   ```sql
   SELECT isModerated FROM video_contents;
   ```
3. Если все видео `isModerated: false` - промодерируйте их

## API параметры

```typescript
// Из videoLearningApi.ts
interface FeedOptions {
  moderationFilter?: 'all' | 'moderated' | 'unmoderated';
  // ...
}
```

**Backend обрабатывает:**
- `'all'` - не фильтрует по `isModerated`
- `'moderated'` - WHERE `isModerated = true`
- `'unmoderated'` - WHERE `isModerated = false`

## Примеры запросов

### Обычный пользователь (production):
```
GET /api/video-learning/feed?moderationFilter=moderated
```
Вернет только видео с `isModerated: true`

### Обычный пользователь (development):
```
GET /api/video-learning/feed?moderationFilter=all
```
Вернет все видео

### Админ с фильтром "unmoderated":
```
GET /api/video-learning/feed?moderationFilter=unmoderated
```
Вернет только видео с `isModerated: false` (для проверки новых)

## Что делать при деплое

### Перед деплоем в production:
1. ✅ Убедитесь, что все видео промодерированы
2. ✅ Проверьте, что `__DEV__` будет `false` в production build
3. ✅ Протестируйте, что обычные пользователи видят только модерированный контент

### После деплоя:
1. Новые видео добавляются с `isModerated: false`
2. Админ проверяет и модерирует их
3. После модерации они становятся видны всем пользователям

## Отладка

### Проверить, какой режим используется:

```typescript
// Добавить в код для дебага
console.log('DEV mode:', __DEV__);
console.log('User role:', state.user.profile?.role);
console.log('Moderation filter:', moderationFilter);
```

### Проверить, есть ли модерированные видео:

```bash
# В логах бэкенда
GET /api/video-learning/feed?moderationFilter=moderated 200  # ✅ Есть видео
GET /api/video-learning/feed?moderationFilter=moderated 304  # ⚠️ Кэш, но было пусто
```

Если возвращается пустой массив - значит нет модерированных видео в базе.
