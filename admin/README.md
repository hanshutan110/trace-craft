# TraceCraft Admin Demo (Mock Mode)

This folder builds a lightweight browser-side admin demo with:

- User management
- Content management
- Template management

All operations currently rely on `localStorage` mock data and can be switched to real APIs later.

## Run

Open `admin/index.html` directly in a browser, or use a local static server.

```bash
# Example (if Python is available)
cd admin
python -m http.server 8080
# Then open http://localhost:8080/index.html
```

## Data source

- Default data is defined in `admin.js` as `DEFAULT_DB`.
- The mock database persists under:

`localStorage["tracecraft-admin-mock-db-v2"]`

- Click **Reset Mock Data** to restore defaults.

## Integration idea for real backend later

The variable `service` in `admin.js` is a mock data layer:

- `list`
- `create`
- `update`
- `remove`

You can replace this object with `fetch` calls when backend APIs are ready (keep same method names and return shape).  
No major UI refactor is needed afterward.
