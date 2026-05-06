# CommuTech

CommuTech is a civic issue reporting platform.

It includes:

- a Laravel backend API
- a private Laravel admin dashboard
- an Expo React Native mobile app

## Project Structure

```text
backend/   Laravel API and admin dashboard
frontend/  Expo React Native mobile app
Logo/      Project visual assets
```

## Backend Setup

```powershell
cd backend
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

Local backend URLs:

```text
Admin dashboard: http://127.0.0.1:8000/admin/login
API base URL:    http://127.0.0.1:8000/api
Health check:    http://127.0.0.1:8000/api/health
```

## Frontend Setup

```powershell
cd frontend
npm install
npm start
```

## Mobile API URL

The mobile app API base URL is configured in:

```text
frontend/src/services/api.js
```

For local laptop testing:

```js
export const API_BASE_URL = "http://127.0.0.1:8000/api";
```

For real-phone testing, use the laptop's local network IPv4 address:

```js
export const API_BASE_URL = "http://YOUR_LAPTOP_IP:8000/api";
```

When testing from a real phone, run Laravel with:

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

## Authentication

The API uses Laravel Sanctum personal access tokens.

Protected API requests must include:

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
```

The token is a Sanctum Bearer token, not a JWT.

## Private Local Notes

Sensitive local details such as personal test accounts, local IP addresses, demo passwords, and handoff notes should stay outside Git.

Use this ignored local file for that information:

```text
PRIVATE_NOTES.md
```

## Ownership

This project is private coursework/final-year-project work. Do not copy, publish, redistribute, or reuse it without permission from the project owner.
