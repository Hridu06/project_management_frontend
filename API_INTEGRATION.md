# Backend API Integration

Notes on connecting this frontend (`Nanosoft-Attendance-System`) to the Laravel backend
(`project_management_backend`). Only **authentication** (login / logout / session restore)
is wired to the real API so far — everything else still runs on mock data (see
[What's still mocked](#whats-still-mocked-not-connected)).

## Backend (no changes needed)

- Auth uses Laravel Sanctum **API tokens** (`Authorization: Bearer <token>`), not cookies —
  so no CORS-credentials / `sanctum` stateful-domain setup was required.
- Laravel's default CORS config already allows all origins on `api/*` routes
  (`vendor/laravel/framework/config/cors.php` — no `config/cors.php` override exists or is
  needed). Verified with `curl` that `/api/auth/login` returns
  `Access-Control-Allow-Origin: *`.
- Existing endpoints used (`routes/api.php`):
  - `POST /api/auth/login`
  - `POST /api/auth/register`
  - `POST /api/auth/logout` (auth:sanctum)
  - `GET  /api/user` (auth:sanctum) — used to restore session on page load

## Frontend files

| File | What it does |
|---|---|
| [src/types/auth.ts](src/types/auth.ts) | Shared types: `Role`, `ApiUser` (raw API shape), `AuthUser` (app shape) |
| [src/services/api.ts](src/services/api.ts) | Core `fetch` wrapper — reads `VITE_API_BASE_URL`, attaches `Authorization: Bearer <token>` automatically, stores/reads/clears the token in `localStorage`, throws a typed `ApiError` on failure |
| [src/services/authService.ts](src/services/authService.ts) | `login()`, `register()`, `logout()`, `fetchCurrentUser()` — thin calls to the auth endpoints above |
| [src/context/AuthContext.tsx](src/context/AuthContext.tsx) | `login(email, password)` now calls the real API and stores the token; on app mount, if a token exists it calls `fetchCurrentUser()` to restore the session (`isLoading` while that check runs); `logout()` clears local state immediately and calls the backend logout endpoint in the background |
| [src/routes/ProtectedRoute.tsx](src/routes/ProtectedRoute.tsx) | Waits for `isLoading` to finish before deciding to redirect, so a page refresh doesn't briefly bounce a logged-in user to `/login` |
| [src/pages/auth/Login.tsx](src/pages/auth/Login.tsx) | Form now calls `login(email, password)` for real, shows a loading state on the button and an inline error message from `ApiError` |
| [src/pages/admin/Settings.tsx](src/pages/admin/Settings.tsx) | The "Save Changes" profile form used to fake a save by calling `login({...})` to overwrite the local user — removed, since there's no backend endpoint yet to actually update a profile. It currently just shows "Saved" without persisting anything. |
| `.env` / `.env.example` | `VITE_API_BASE_URL=http://localhost:8000/api` |

## How login works now

1. User submits email + password on `/login`.
2. `authService.login()` → `POST /api/auth/login` → backend returns `access_token` + `user`.
3. Token is saved to `localStorage` (`nanosoft_auth_token`); `AuthContext` sets `user`.
4. Every subsequent API call via `api.ts` automatically adds `Authorization: Bearer <token>`.
5. On any future page load/refresh, `AuthContext` calls `GET /api/user` with the stored token
   to confirm it's still valid and re-populate `user`. If it's invalid/expired, the token is
   cleared and the user is treated as logged out.
6. Logout clears local state right away (UI feels instant) and calls
   `POST /api/auth/logout` in the background to revoke the token server-side.

## Running it locally

```
# backend
cd project_management_backend
php artisan serve            # http://localhost:8000

# frontend
cd Nanosoft-Attendance-System
npm run dev                  # http://localhost:5173 (or next free port)
```

Test user created for local testing:

- email: `admin@test.com`
- password: `Password123!`

⚠️ Make sure nothing else is already using port 8000 — during testing here it briefly
collided with an unrelated project also serving on `127.0.0.1:8000`.

## What's still mocked (not connected)

The backend currently only has auth routes. Everything below reads/writes an in-memory
array in the frontend (`src/services/*Service.ts`) and resets on every page reload:

- `attendanceService.ts`
- `contributionService.ts`
- `employeeService.ts`
- `leaveService.ts`
- `managerService.ts`
- `projectService.ts`
- `settingsService.ts`
- `departmentService.ts`
- `designationService.ts`

Connecting each of these needs a matching Laravel controller + routes first, then the same
pattern used here (call `apiRequest()` from `services/api.ts` instead of the in-memory
array).
