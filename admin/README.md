# TraceCraft Admin Panel (API Mode)

This folder contains a lightweight browser-side admin panel for:

- User management
- Content management
- Template management

All operations call the backend API and persist to PostgreSQL.

## Run

Start the backend first, then open `admin/index.html` directly in a browser or use a local static server.

```bash
cd backend
npm run start

cd ../admin
python -m http.server 8080
```

Default API base: `http://localhost:3001/api`.

To override it before loading `admin.js`, set:

```html
<script>
  window.TRACECRAFT_API_BASE = 'http://localhost:3001/api';
</script>
```

## Data Source

The `service` object in `admin.js` calls:

- `GET /api/admin/users`
- `GET /api/admin/contents`
- `GET /api/admin/templates`
- `GET /api/admin/roleLibrary`
- `POST /api/admin/{module}`
- `PUT /api/admin/{module}/{id}`
- `DELETE /api/admin/{module}/{id}`

MVP note: admin login is not implemented yet. Add admin authentication before public deployment.
