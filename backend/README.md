# Starry Class Backend

## Setup

1. Install dependencies:

```bash
npm install
```

2. (Optional) Seed students:

```bash
npm run seed
```

3. Start server:

```bash
npm start
```

## Environment

- `PORT`: server port (default 4000)
- `DB_PATH`: sqlite db path (default `./data/class.db`)
- `CORS_ORIGIN`: allowed origin, `*` for all
- `ADMIN_KEY`: admin import/content key (required for admin APIs)
- `REQUIRE_INVITE`: `true` to require invite codes on register

## API

- `POST /auth/register` { name, inviteCode }
- `POST /auth/login` { token }
- `GET /content`
- `GET /admin/content` (header `x-admin-key`)
- `PUT /admin/content` (header `x-admin-key`)
- `GET /admin/students` (header `x-admin-key`)
- `POST /admin/students` (header `x-admin-key`)
- `PUT /admin/students/:id` (header `x-admin-key`)
- `DELETE /admin/students/:id` (header `x-admin-key`)
- `GET /admin/invites` (header `x-admin-key`)
- `POST /admin/invites` (header `x-admin-key`)
- `DELETE /admin/invites/:code` (header `x-admin-key`)
- `GET /messages`
- `POST /messages` (auth)
- `POST /upload` (auth, multipart form file)
- `GET /admin/messages` (header `x-admin-key`)
- `PUT /admin/messages/:id` (header `x-admin-key`)
- `DELETE /admin/messages/:id` (header `x-admin-key`)
- `POST /admin/import` (header `x-admin-key`)
- `GET /students`
- `GET /students/:id`
- `PUT /students/:id`
- `GET /relationships`
- `POST /relationships`
- `DELETE /relationships/:id`

## Admin Pages

Open in browser after server starts:

- `http://<server>:4000/admin/admin.html`

Use `ADMIN_KEY` to load/save class homepage content, manage students, and generate invites.
