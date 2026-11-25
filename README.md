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
- Google and Microsoft sign-in plus Drive/OneDrive certificate export are implemented; they require owner-provided OAuth app credentials in environment variables before they can be used.
- Course and product photography is loaded from static image URLs; no image API is called.

## Scope notes
- Course pages currently contain structured curriculum outlines; full lesson videos/content still need to be added.
- Certificates are platform-issued learning records, not government or university accreditations.
- Digital product file delivery is not automated yet.
- Configure your own verified payment instructions before accepting real orders.

## License
Apache License 2.0. See [LICENSE](LICENSE).


## Google & Microsoft sign-in and certificate cloud storage

CodeEarn supports Google and Microsoft OAuth sign-in. The selected provider also grants file access so students can save approved course certificates as PDF files to Google Drive or OneDrive and create a view-sharing link.

### Required environment variables

Copy `.env.example` to `.env` locally, or configure the values in your hosting provider's environment settings. Never commit the real `.env` file or share client secrets in chat.

- `APP_URL`: public base URL.
- `SESSION_SECRET`: long random session secret.
- `TOKEN_ENCRYPTION_KEY`: long random key used to encrypt OAuth tokens in SQLite.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`.
- `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_CALLBACK_URL`.

**Google:** Create an OAuth 2.0 Web application in Google Cloud Console, enable the Google Drive API, and register the exact redirect URI `https://YOUR_DOMAIN/auth/google/callback`. The app requests OpenID/email/profile and `drive.file` access.

**Microsoft:** Register a Web app in Microsoft Entra and add `https://YOUR_DOMAIN/auth/microsoft/callback`. Configure delegated Microsoft Graph permissions `User.Read` and `Files.ReadWrite`; offline access is requested for token refresh.

After credentials are configured, students can use Google or Microsoft on the login/register page. The connected provider account is available for certificate storage. In the Student Dashboard, approved courses show **Save to Drive** and **Save to OneDrive** actions. CodeEarn generates a PDF, uploads it and returns a share link. Anyone with the link may be able to view the certificate, so share carefully.

For local development, register `http://localhost:3000/auth/google/callback` and `http://localhost:3000/auth/microsoft/callback`. Cloud integration is not active until valid credentials and callback URLs are configured. Certificates are platform-issued and are not government, university or accreditation-body certifications.
