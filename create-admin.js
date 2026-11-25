import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
const [emailArg,password] = process.argv.slice(2);
const email=String(emailArg||'').trim().toLowerCase();
if(!email||!/^\S+@\S+\.\S+$/.test(email)||!password||password.length<12){console.error('Usage: npm run admin -- admin@example.com "a-unique-password-12-chars-min"');process.exit(1);}
fs.mkdirSync('data',{recursive:true});
const db=new Database(path.join('data','codeearn-node.sqlite'));
db.exec("CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'student',created_at TEXT DEFAULT CURRENT_TIMESTAMP)");
const hash=await bcrypt.hash(password,12);
db.prepare("INSERT INTO users(name,email,password,role) VALUES('CodeEarn Admin',?,?, 'admin') ON CONFLICT(email) DO UPDATE SET password=excluded.password,role='admin'").run(email,hash);
console.log('Administrator ready:',email);
