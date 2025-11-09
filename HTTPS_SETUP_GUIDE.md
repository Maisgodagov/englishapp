# Настройка HTTPS для API сервера

## Быстрый старт

После того как у тебя будет домен (например `api.myapp.com`), выполни на сервере:

```bash
# 1. Установка необходимых пакетов
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# 2. Создание конфига Nginx
sudo nano /etc/nginx/sites-available/english-api
```

## Конфиг Nginx (вставь в файл выше)

Замени `api.myapp.com` на свой домен:

```nginx
server {
    listen 80;
    server_name api.myapp.com;

    location /.well-known/acme-challenge/ {
        root /var/www/html;
    }

    location / {
        proxy_pass http://localhost:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Увеличиваем таймауты для больших запросов
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

## Активация конфига и SSL

```bash
# 3. Активируем конфиг
sudo ln -s /etc/nginx/sites-available/english-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# 4. Получаем SSL сертификат (замени на свои данные)
sudo certbot --nginx -d api.myapp.com --email your@email.com --agree-tos --no-eff-email

# 5. Проверяем автопродление
sudo certbot renew --dry-run
```

## Проверка работы

После настройки проверь:

```bash
# Должен вернуть health check
curl https://api.myapp.com/health

# Должен вернуть 401 или ответ API
curl https://api.myapp.com/api/dictionary
```

## Обновление конфига приложения

После настройки HTTPS измени в файлах:

### eas.json
```json
"env": {
  "EXPO_PUBLIC_API_URL": "https://api.myapp.com/api"
}
```

### app.json
```json
"extra": {
  "EXPO_PUBLIC_API_URL": "https://api.myapp.com/api"
}
```

### app.config.js
```javascript
EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.myapp.com/api'
```

Затем пересобери APK:
```bash
eas build --profile preview --platform android
```

## Troubleshooting

### Nginx не запускается
```bash
# Проверь логи
sudo nginx -t
sudo journalctl -u nginx -n 50
```

### SSL сертификат не получается
```bash
# Убедись что домен указывает на IP сервера
nslookup api.myapp.com

# Проверь что порт 80 открыт
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

### API не отвечает через Nginx
```bash
# Проверь что Node.js сервер запущен
pm2 status

# Проверь логи Nginx
sudo tail -f /var/log/nginx/error.log
```

## Автоматическое продление SSL

Let's Encrypt сертификаты действуют 90 дней. Certbot автоматически настраивает cron для продления:

```bash
# Проверка автопродления
sudo certbot renew --dry-run

# Просмотр задачи cron/systemd
sudo systemctl list-timers | grep certbot
```

## Дополнительная безопасность

После настройки можно добавить дополнительные заголовки безопасности в Nginx:

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
```

## Если у тебя нет домена

Варианты:
1. **Купить дешёвый домен** (.xyz, .site от $1/год)
2. **Использовать бесплатный** от freenom.com
3. **Использовать поддомен Beget** (если предоставляют)
4. **Использовать ngrok** (временное решение для тестов)

### Вариант с ngrok (только для тестов):

```bash
# На сервере
ngrok http 3002

# Ngrok даст URL типа: https://abc123.ngrok.io
# Используй его в конфиге приложения
```

**Минусы ngrok:**
- URL меняется при каждом запуске (платная версия даёт постоянный)
- Ограничения по трафику
- Только для разработки, не для прода
