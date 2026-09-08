# bookmark-manager-api

REST API dan background worker sederhana untuk menyimpan, mengorganisasi (dengan tag),
dan memeriksa status hidup/matinya (link check) bookmark milik pengguna.

## 1. Application Overview

Aplikasi terdiri dari dua proses terpisah yang berjalan dari satu codebase:

- **API server** (`src/server.js`) — REST API untuk registrasi/login user dan CRUD bookmark.
- **Worker** (`src/worker.js`) — proses terpisah yang berjalan berkala (cron) untuk
  memeriksa apakah URL bookmark masih dapat diakses, lalu memperbarui statusnya
  (`ok` / `broken`) di database.

Kedua proses membaca konfigurasi yang sama dan terhubung ke database yang sama.

## 2. Technology Stack

| Layer            | Teknologi                          |
|-------------------|-------------------------------------|
| Runtime            | Node.js 18+                        |
| Web framework       | Express 4                          |
| Database           | PostgreSQL (driver: `pg`)          |
| Auth               | JWT (`jsonwebtoken`) + bcrypt      |
| Scheduler (worker)  | `node-cron`                        |
| Testing            | Jest + Supertest                   |

## 3. Repository Structure

```
bookmark-manager/
├── migrations/
│   └── 001_init.sql          # skema database
├── scripts/
│   └── migrate.js            # migration runner sederhana
├── src/
│   ├── config.js              # baca & validasi environment variables
│   ├── db.js                  # koneksi pool PostgreSQL
│   ├── app.js                 # wiring Express app (untuk testing)
│   ├── server.js               # entrypoint proses API
│   ├── worker.js               # entrypoint proses worker (link checker)
│   ├── middleware/
│   │   ├── auth.js             # verifikasi JWT
│   │   └── errorHandler.js     # error handler terpusat
│   ├── routes/
│   │   ├── auth.js             # POST /auth/register, /auth/login
│   │   ├── bookmarks.js        # CRUD /bookmarks
│   │   └── health.js           # GET /health/live, /health/ready
│   ├── services/
│   │   ├── bookmarkService.js  # query database untuk bookmark
│   │   └── linkChecker.js      # logika pengecekan URL
│   └── utils/
│       └── validators.js       # validasi email/url
├── tests/
│   ├── validators.test.js
│   └── app.test.js
├── .env.example
├── jest.config.js
└── package.json
```

## 4. Local Development

Prasyarat: Node.js 18+, npm, dan instance PostgreSQL yang dapat diakses.

```bash
npm install
cp .env.example .env
# sesuaikan .env dengan koneksi database lokal Anda
npm run migrate
npm run dev        # menjalankan API server dengan nodemon (auto-reload)
```

Untuk menjalankan worker secara terpisah (di terminal lain):

```bash
npm run worker
```

## 5. Dependency

Lihat `package.json`. Dependency utama: `express`, `pg`, `jsonwebtoken`, `bcryptjs`,
`node-cron`, `dotenv`. Dependency dev: `jest`, `supertest`, `nodemon`.

## 6. Configuration

Semua konfigurasi dibaca dari environment variable melalui `src/config.js`
(menggunakan `dotenv` saat development). Tidak ada nilai konfigurasi yang
di-hardcode di source code.

## 7. Environment Variables

| Variable                | Wajib | Default            | Keterangan                                   |
|--------------------------|-------|---------------------|-----------------------------------------------|
| `PORT`                   | tidak | `3000`              | Port HTTP API server                          |
| `NODE_ENV`                | tidak | `development`        | Mode aplikasi                                 |
| `DATABASE_URL`            | ya    | —                    | Connection string PostgreSQL                  |
| `PGSSL`                   | tidak | `false`              | Set `true` jika DB memerlukan SSL             |
| `JWT_SECRET`               | ya    | —                    | Secret untuk menandatangani JWT               |
| `JWT_EXPIRES_IN`           | tidak | `1h`                 | Masa berlaku token                            |
| `LINK_CHECK_CRON`          | tidak | `*/15 * * * *`        | Jadwal cron untuk worker link-checker         |
| `LINK_CHECK_TIMEOUT_MS`     | tidak | `5000`               | Timeout per request pengecekan URL            |
| `LINK_CHECK_CONCURRENCY`    | tidak | `5`                  | Jumlah pengecekan URL paralel dalam satu batch |

Nilai untuk `DATABASE_URL` dan `JWT_SECRET` **wajib** disediakan; aplikasi akan
gagal start (`throw`) jika tidak ada.

## 8. Port yang Digunakan

- API server: `PORT` (default `3000`), HTTP saja — aplikasi tidak menangani TLS.
- Worker: tidak membuka port (bukan HTTP server), hanya proses cron internal.

## 9. Database Requirement

Aplikasi **membutuhkan instance PostgreSQL** yang dapat diakses oleh kedua proses
(API dan worker). Skema database ada di `migrations/001_init.sql` (tabel `users`
dan `bookmarks`). Jalankan `npm run migrate` untuk menerapkannya ke database yang
dikonfigurasi di `DATABASE_URL`.

Ketersediaan, provisioning, backup, dan high-availability database berada di luar
tanggung jawab aplikasi ini.

## 10. External Service / API

Worker (`linkChecker.js`) melakukan outbound HTTP request (HEAD, fallback GET) ke
URL yang tersimpan sebagai bookmark milik user — jadi worker membutuhkan akses
jaringan keluar (outbound) ke internet publik. Tidak ada API pihak ketiga lain
yang digunakan.

## 11. API Endpoint

| Method | Path              | Auth | Deskripsi                          |
|--------|-------------------|------|--------------------------------------|
| POST   | `/auth/register`   | tidak | Registrasi user baru                |
| POST   | `/auth/login`       | tidak | Login, mengembalikan JWT            |
| GET    | `/bookmarks`        | ya    | List bookmark milik user (filter opsional: `?tag=`, `?status=`) |
| POST   | `/bookmarks`        | ya    | Membuat bookmark baru                |
| GET    | `/bookmarks/:id`     | ya    | Detail satu bookmark                 |
| PATCH  | `/bookmarks/:id`     | ya    | Update title/tags bookmark           |
| DELETE | `/bookmarks/:id`     | ya    | Hapus bookmark                        |

Autentikasi menggunakan header `Authorization: Bearer <token>`.

## 12. Health Check

- `GET /health/live` — liveness, selalu `200 { "status": "ok" }` jika proses hidup.
- `GET /health/ready` — readiness, `200` jika database dapat diakses, `503` jika tidak.

Worker tidak memiliki HTTP health endpoint (bukan HTTP server); statusnya hanya
terlihat dari log proses.

## 13. Test

```bash
npm test
```

Test menggunakan Jest + Supertest. Modul `src/db.js` di-mock pada test integrasi
(`tests/app.test.js`) sehingga test dapat berjalan tanpa koneksi database yang
sesungguhnya. `tests/validators.test.js` berisi unit test murni.

## 14. Cara Menjalankan Aplikasi

```bash
npm install
cp .env.example .env         # lalu isi DATABASE_URL dan JWT_SECRET
npm run migrate
npm start                    # proses API
npm run worker               # proses worker, di terminal terpisah
```

Dokumen ini sengaja tidak membahas containerization, orchestration, reverse
proxy, TLS, monitoring, atau deployment production — itu berada di luar
lingkup developer handoff ini.
