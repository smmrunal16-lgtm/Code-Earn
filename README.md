# CodeEarn — Learn, Build & Earn

A responsive, API-free coding learning and digital resource storefront built with PHP and SQLite.

## Features
- Student registration, login and session-based dashboard
- Course catalogue across C, C++, Java, Python, JavaScript, HTML/CSS, PHP, SQL, C#, Kotlin, Go and Ruby
- Course enrollment requests and lesson-outline curriculum
- Manual UPI reference submission with admin verification (no payment gateway/API)
- Digital resource catalogue and order requests
- Admin dashboard to approve course access, verify payment references and process product orders
- Printable platform learning certificate (browser Print → Save as PDF)
- Responsive dark interface
- SQLite database created automatically on first run
- CSRF-protected forms and password hashing

## Requirements
- PHP 8.1+
- PHP PDO SQLite extension enabled
- A PHP web host with write permission for the `data/` directory

> GitHub Pages does not execute PHP. Deploy this project to a PHP hosting provider or run it locally with PHP.

## Run locally
1. Install PHP 8.1+ with PDO SQLite enabled.
2. From the project directory run:
   ```bash
   php -S localhost:8000
   ```
3. Open http://localhost:8000 in your browser.
4. Register a student account. The SQLite database is created at `data/codeearn.sqlite`.

## Create the first administrator
Run this once in the project directory from a terminal:
```bash
php create-admin.php admin@example.com "Replace-With-A-Long-Unique-Password"
```
Then sign in using that email and password. Delete `create-admin.php` from the deployed server after creating the administrator. Do not commit real passwords.

## Manual payment workflow
There is intentionally no payment gateway or external API. A student can submit a UPI transaction reference after paying using payment details supplied by the platform owner. An administrator checks the transaction independently and approves it in the admin dashboard. Never ask students to share UPI PINs, OTPs or passwords. Do not mark a payment verified based only on a screenshot or unverified claim.

## Important scope notes
- Course pages currently provide structured curriculum outlines, not a complete video/lesson hosting system.
- Certificates are platform-issued printable learning records; they are not government or university accreditations.
- Product orders are request records. The admin must manually verify payment and arrange delivery of the digital file; downloadable product delivery is not automated yet.
- Add your own verified UPI/payment instructions before accepting real orders.

## Security and deployment
- Use HTTPS in production.
- Keep the `data/` directory writable by PHP and block direct public access to it at the web-server level.
- Back up the SQLite database regularly.
- Use a unique administrator password and remove `create-admin.php` after setup.
- Review and test the application on your chosen PHP host before accepting payments.

## License
Apache License 2.0. See [LICENSE](LICENSE).
