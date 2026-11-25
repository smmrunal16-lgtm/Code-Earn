# CodeEarn — Learn, Build & Earn

A React + Node.js + SQLite coding education and digital resource platform. No AI services, third-party APIs or payment gateway integrations are used.

## Features
- Separate routes/pages for Home, Courses, Course Details, Digital Store, About, Contact, Login, Register, Student Dashboard, Certificates and Admin
- Responsive premium visual design with motion transitions, hover animations and curated photography
- Node.js + Express application server
- SQLite database with automatic course/product seed data
- Student registration, login and personal dashboard
- Courses for C, C++, Java, Python, JavaScript, HTML/CSS, PHP, SQL, C#, Kotlin, Go and Ruby
- Enrollment requests and structured course curriculum
- Manual UPI transaction-reference submission and admin verification
- Digital resource catalogue and order requests
- Admin dashboard for payment, enrollment and order approvals
- Branded printable platform-issued certificates with browser PDF export
- Password hashing with bcrypt and SQLite-backed sessions

## Requirements
- Node.js 20 or newer
- npm
- A host that supports a persistent writable disk for SQLite

## Run locally
```bash
npm install
npm run dev
```
Open the Vite address shown in the terminal (normally http://localhost:5173). The Express server runs on http://localhost:3000 and Vite proxies internal `/api` requests to it.

## Production
```bash
npm install
npm run build
NODE_ENV=production SESSION_SECRET="replace-with-a-long-random-secret" npm start
```
The Express server serves the built React app from `dist/`. Set `PORT` if your host requires a specific port. Use HTTPS and a persistent disk for the `data/` directory. Do not deploy on static-only hosting such as GitHub Pages.

## Create an administrator
Run once on the server, from the project root:
```bash
npm run admin -- admin@example.com "a-unique-password-of-at-least-12"
```
Use the supplied email and password to sign in. Keep credentials private. Set a strong random `SESSION_SECRET` environment variable in production.

## Payments and digital products
This project deliberately has no payment gateway integration and makes no calls to external APIs. Students submit a UPI transaction reference after paying using payment instructions provided by the site owner. The administrator must independently verify the transaction before approving course access. Never ask for UPI PINs or OTPs. Product orders are request records; the administrator must manually arrange delivery of purchased files.

## Integrations
- Google and Microsoft sign-in / cloud certificate storage are not connected yet. These require OAuth app registration and credentials from the account owner; do not place client secrets in frontend code or commit them to GitHub.
- Course and product photography is loaded from static image URLs; no image API is called.

## Scope notes
- Course pages currently contain structured curriculum outlines; full lesson videos/content still need to be added.
- Certificates are platform-issued learning records, not government or university accreditations.
- Digital product file delivery is not automated yet.
- Configure your own verified payment instructions before accepting real orders.

## License
Apache License 2.0. See [LICENSE](LICENSE).
