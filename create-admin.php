<?php
// Run once from your hosting terminal: php create-admin.php admin@example.com "Use-A-Strong-Password"
// This script is CLI-only and will not run from a browser.
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
if ($argc < 3) { fwrite(STDERR, "Usage: php create-admin.php email password\n"); exit(1); }
$email = strtolower(trim($argv[1])); $password = $argv[2];
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 12) {
    fwrite(STDERR, "Use a valid email and a password of at least 12 characters.\n"); exit(1);
}
$dir = __DIR__ . '/data'; if (!is_dir($dir)) mkdir($dir, 0775, true);
$db = new PDO('sqlite:' . $dir . '/codeearn.sqlite');
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->exec("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'student',created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
$stmt=$db->prepare("INSERT INTO users(name,email,password,role) VALUES(?,?,?,'admin') ON CONFLICT(email) DO UPDATE SET password=excluded.password, role='admin'");
$stmt->execute(['CodeEarn Admin',$email,password_hash($password,PASSWORD_DEFAULT)]);
fwrite(STDOUT, "Admin account created/updated for {$email}. Delete this script after setup.\n");
