# CommuTech

CommuTech is a civic reporting app.

- Citizens use the mobile app to register, login, and report issues.
- Workers will handle assigned reports.
- Admins use the private Laravel admin dashboard.

## Project Folders

```text
backend/   Laravel API + admin dashboard
frontend/  Expo React Native mobile app
Logo/      Project logos
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

Admin dashboard:

```text
http://127.0.0.1:8000/admin/login
```

API base URL:

```text
http://127.0.0.1:8000/api
```

## Frontend Setup

```powershell
cd frontend
npm install
npm start
```

## API URL For Mobile App

The API URL is in:

```text
frontend/src/services/api.js
```

Laptop testing:

```js
export const API_BASE_URL = "http://127.0.0.1:8000/api";
```

Real iPhone or Samsung testing:

```js
export const API_BASE_URL = "http://YOUR_LAPTOP_IP:8000/api";
```

Example:

```js
export const API_BASE_URL = "http://192.168.100.233:8000/api";
```

When testing on a real phone, run Laravel like this:

```powershell
php artisan serve --host=0.0.0.0 --port=8000
```

To find your laptop IP:

```powershell
ipconfig
```

Use the Wi-Fi `IPv4 Address`.

## Test Users

Register these from Postman or the mobile app.

### Citizen

```json
{
  "firstName": "Mohamad",
  "lastName": "Moumneh",
  "email": "mmoumneh14@gmail.com",
  "phone": "+961 70740676",
  "city": "Beirut",
  "address": "Beirut, Malla",
  "password": "mohamad123",
  "confirmPassword": "mohamad123"
}
```

### Worker

```json
{
  "firstName": "Sarah",
  "lastName": "Alayann",
  "email": "Sarah@gmail.com",
  "phone": "+961 71112233",
  "role": "worker",
  "city": "Beirut",
  "address": "Beirut, Verdun",
  "password": "mohamad123",
  "confirmPassword": "mohamad123"
}
```

### Admin

```json
{
  "firstName": "Admin",
  "lastName": "CommuTech",
  "email": "admin@gmail.com",
  "phone": "+961 70111222",
  "role": "admin",
  "city": "Beirut",
  "address": "Beirut, Downtown",
  "password": "mohamad123",
  "confirmPassword": "mohamad123"
}
```

## Auth API

Register:

```text
POST /api/auth/register
```

Login:

```text
POST /api/auth/login
```

Logout:

```text
POST /api/auth/logout
```

Protected routes need:

```text
Authorization: Bearer YOUR_ACCESS_TOKEN
```
