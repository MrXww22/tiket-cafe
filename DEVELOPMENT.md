# Разработка проекта tiket-cafe

Репозиторий проекта:

https://github.com/MrXww22/tiket-cafe

## Как добавить ребят к разработке

Открой настройки доступа:

https://github.com/MrXww22/tiket-cafe/settings/access

Дальше:

1. Нажми `Add people`.
2. Введи GitHub-логин или email разработчика.
3. Выдай роль `Write`, чтобы человек мог пушить свои ветки.
4. Разработчик должен принять приглашение на GitHub.

Не выдавай `Admin`, если человеку не нужно управлять настройками репозитория.

## Как разработчику скачать проект

```bash
git clone https://github.com/MrXww22/tiket-cafe.git
cd tiket-cafe
npm install
```

Создать локальный `.env` из шаблона:

```bash
cp .env.example .env
```

Для Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

После этого нужно заполнить `.env` локальными настройками базы и токенов.

Запуск проекта:

```bash
npm run dev
```

## Как каждому работать в своей ветке

Перед новой задачей обновить `main`:

```bash
git checkout main
git pull origin main
```

Создать свою ветку:

```bash
git checkout -b feature/task-name
```

Примеры названий:

```text
feature/menu-page
feature/admin-products
feature/orders-status
fix/login-error
```

После изменений:

```bash
git add .
git commit -m "Describe changes"
git push -u origin feature/task-name
```

## Как отправить изменения на проверку

Открой Pull Request:

https://github.com/MrXww22/tiket-cafe/compare

Выбери:

```text
base: main
compare: feature/task-name
```

Потом нажми `Create pull request`.

## Как подтянуть свежие изменения

Если работаешь в своей ветке:

```bash
git checkout main
git pull origin main
git checkout feature/task-name
git merge main
```

Если возник конфликт, его нужно исправить в файлах, затем:

```bash
git add .
git commit
git push
```

## Как обновлять проект на Linux VPS

Сервер, на который проект уже заливали:

```text
157.22.184.130
televizor1996sam.fvds.ru
```

Путь проекта на сервере:

```text
/var/www/cafe-menu
```

Обновление на сервере:

```bash
cd /var/www/cafe-menu
git pull origin main
npm install
npm run build
pm2 restart cafe-menu
```

Если PM2 ещё не настроен:

```bash
npm run build
pm2 start npm --name cafe-menu -- start
pm2 save
```

## Рабочее правило команды

`main` должна быть стабильной веткой. Разработчики не пушат напрямую в `main`, а делают свои ветки и Pull Request.

Правильный поток:

```text
feature/... -> Pull Request -> main -> VPS
```

