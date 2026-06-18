# TraceCraft Admin

This folder contains the TraceCraft management console built with Vite, React, TypeScript and Ant Design.

- User management
- Content management
- Template management

All operations call the backend API and persist to PostgreSQL.

## Run

Start the backend first, then start the admin dev server.

```bash
cd backend
npm run start

cd ../admin
npm install
npm run dev
```

Admin URL: `http://localhost:3002`

Default API base: `http://localhost:3001/api`.

To override it:

```bash
VITE_ADMIN_API_BASE_URL=http://localhost:3001/api npm run dev
```

## Data Source

The React API client calls:

- `POST /api/admin/auth/login`
- `GET /api/admin/auth/me`
- `GET /api/admin/users`
- `GET /api/admin/contents`
- `GET /api/admin/templates`
- `GET /api/admin/roleLibrary`
- `POST /api/admin/{module}`
- `PUT /api/admin/{module}/{id}`
- `DELETE /api/admin/{module}/{id}`

MVP login uses `TRACECRAFT_ADMIN_PASSWORD` from backend env. Default local password is `admin123`.

Production note: replace the MVP password check with hashed admin credentials and enforce permission checks before public deployment.

Delete actions are soft operations: users are disabled, contents are archived, and templates are deactivated.
