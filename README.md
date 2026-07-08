# Silence — backend

Node.js + Express + SQLite backend для мессенджера Silence. Заменяет `localStorage`
на настоящий сервер с базой данных, чтобы разные пользователи с разных устройств
видели общих юзеров, сообщения и чаты.

## Запуск локально

```bash
npm install
cp .env.example .env   # и поменяй JWT_SECRET
npm start
```

Сервер поднимется на `http://localhost:3000`. База — файл `data.sqlite`, создаётся
автоматически при первом запуске.

## API (кратко)

Все защищённые роуты требуют заголовок `Authorization: Bearer <token>`.

- `POST /api/auth/register` `{email, password, name}` → `{token, user}`
- `POST /api/auth/login` `{email, password}` → `{token, user}`
- `GET  /api/auth/me` → `{user}`
- `GET  /api/users/search?q=...` → `{users:[...]}`
- `GET  /api/users/:email` → `{user}`
- `PATCH /api/users/me` `{name?, avatar?}` → `{user}`
- `PATCH /api/users/me/username` `{username}` → `{user}`
- `DELETE /api/users/me/avatar` → `{ok:true}`
- `GET  /api/chats` → `{chats:[{user, favorite, lastMessage, unread}]}`
- `POST /api/chats/open` `{email}` → добавляет собеседника в списки чатов обеих сторон
- `POST /api/chats/:email/favorite` `{on:true|false}`
- `GET  /api/messages/:peerEmail` → `{messages:[...]}`
- `POST /api/messages/:peerEmail` `{type, text?, media?, duration?, callStatus?}`
- `POST /api/messages/:peerEmail/read` → отмечает входящие как прочитанные
- `GET  /api/settings/me` / `PATCH /api/settings/me` `{notifications?, privacyContactsOnly?}`

Аватарки и медиафайлы (фото/видео/войсы) хранятся как base64 data URL прямо
в базе — так же, как раньше в localStorage. Это самый простой вариант; если база
разрастётся, можно позже перейти на отдельное файловое хранилище (S3-совместимое,
например Cloudflare R2 free tier).

## Бесплатный деплой на Render.com

1. Залей эту папку в GitHub-репозиторий (публичный или приватный).
2. На https://render.com → New → Web Service → подключи репозиторий.
3. Настройки:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free
4. В разделе Environment добавь переменную `JWT_SECRET` (любая длинная случайная строка).
5. **Важно про диск:** на бесплатном тарифе Render файловая система эфемерна —
   при каждом деплое/перезапуске `data.sqlite` обнулится. Чтобы данные сохранялись
   между деплоями, добавь Render Disk (Settings → Disks, есть бесплатный лимит 1GB)
   и примонтируй его, например, на `/var/data`, затем выстави переменную окружения
   `DB_PATH=/var/data/data.sqlite`.
6. После деплоя Render даст публичный URL вида `https://silence-backend.onrender.com`.
   Его нужно подставить в `API_BASE` на фронтенде.

Бесплатный инстанс Render засыпает после ~15 минут без запросов и просыпается
~30–50 секунд на первый запрос — это нормально для pet-проекта.

## Дальше

Следующий шаг — переписать фронтенд (`silence.html`): заменить все вызовы
`DB.get/set/del` на `fetch` к этому API и хранить `token` вместо прямого доступа
к localStorage-объектам пользователей. Могу сделать это следующим шагом.
