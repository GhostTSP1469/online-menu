# Онлайн-меню «Набережная»

Меню ресторана с корзиной и оформлением заказа. Заказы приходят в Telegram-бот и сохраняются в журнал. Блюда, категории, фото и наличие меняются в админ-панели.

Nuxt 4, Vue 3, axios, sharp.

## Возможности

- Меню по категориям, поиск, фото, несколько размеров у блюда
- Корзина и заказ: в зале, самовывоз, доставка
- Telegram-бот с белым списком номеров: заказы получают только подтвердившие номер
- Очередь недоставленных заказов: бот досылает их, когда появляется связь
- Админ-панель `/admin`: блюда, категории, фото, наличие, заказы, получатели бота
- SEO: мета-теги, Open Graph, Schema.org, `robots.txt`, `sitemap.xml`
- Защита: CSP, вход в админку по cookie `HttpOnly`, ограничение попыток входа

## Локальный запуск

```bash
npm install
cp .env.example .env
npm run dev
```

## Переменные окружения

| Переменная | Что это |
|---|---|
| `NUXT_TG_TOKEN` | Токен бота от @BotFather |
| `NUXT_TG_PHONES` | Белый список номеров через запятую, например `+992901234567,+992987654321` |
| `NUXT_TG_CHAT` | Необязательно: id чатов, которые получают заказы без подтверждения номера |
| `NUXT_ADMIN_LOGIN`, `NUXT_ADMIN_PASSWORD` | Вход в `/admin` |
| `NUXT_PUBLIC_SITE_URL` | Адрес сайта, например `https://menu.example.com` |
| `HOST`, `PORT` | Где слушает сервер. На VPS `127.0.0.1` и `3000` |
| `DATA_DIR`, `LOGS_DIR` | Папки данных и журнала заказов. По умолчанию `data` и `logs` в папке проекта |

## Развёртывание на VPS (Ubuntu)

Нужны Node.js 20.12 или новее, pm2 и Caddy.

```bash
git clone https://github.com/GhostTSP1469/online-menu.git
cd online-menu
npm ci
cp .env.example .env
nano .env
npm run build
npm i -g pm2
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup
```

Домен и HTTPS: впишите домен в `Caddyfile` вместо `menu.example.com`, затем

```bash
sudo cp Caddyfile /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

Caddy сам получит сертификат. A-запись домена должна указывать на IP сервера.

Обновление:

```bash
git pull
npm ci
npm run build
pm2 restart online-menu
```

## Важно

- Бот должен работать в одном экземпляре. Если запущены две копии с одним токеном, они мешают друг другу и сообщения теряются. Поэтому в `ecosystem.config.cjs` одна копия.
- `npm ci` выполняйте на самом сервере: модуль `sharp` собирается под систему.
- В `data/` лежит всё, что меняется через админку, в `logs/` журнал заказов. Делайте их резервную копию.
- Через nginx вместо Caddy: передавайте заголовки `Host` и `X-Forwarded-Proto` и задайте `client_max_body_size 12m` для загрузки фото.
