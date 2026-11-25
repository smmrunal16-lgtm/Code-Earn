import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, 'codeearn-node.sqlite'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
db.exec(`
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL,email TEXT UNIQUE NOT NULL,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'student',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS courses(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,category TEXT NOT NULL,level TEXT NOT NULL,price INTEGER NOT NULL,description TEXT NOT NULL,lessons TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS enrollments(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,course_id INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,course_id),FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(course_id) REFERENCES courses(id));
CREATE TABLE IF NOT EXISTS payments(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,course_id INTEGER NOT NULL,reference TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(course_id) REFERENCES courses(id));
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,kind TEXT NOT NULL,price INTEGER NOT NULL,description TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,product_id INTEGER NOT NULL,status TEXT NOT NULL DEFAULT 'pending',created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id),FOREIGN KEY(product_id) REFERENCES products(id));
`);
const courseSeed = [
['C Programming','Programming','Beginner',499,'Build a strong foundation in structured programming.','Basics|Variables and data types|Operators|Conditions and loops|Functions|Arrays and strings|Pointers|Structures and file handling'],
['C++ Programming','Programming','Beginner',599,'Learn object-oriented programming with C++.','Syntax and basics|Conditions and loops|Functions|Classes and objects|Inheritance|Polymorphism|STL|File handling'],
['Java Masterclass','Programming','Intermediate',799,'Core Java concepts with practical examples.','Java setup|Variables and operators|Control flow|OOP|Inheritance and interfaces|Exceptions|Collections|JDBC basics'],
['Python Programming','Programming','Beginner',699,'Start coding with Python from zero.','Syntax|Data types|Conditions and loops|Functions|Lists and dictionaries|Files|OOP|Mini projects'],
['JavaScript','Web Development','Beginner',699,'Create interactive websites using JavaScript.','Language basics|DOM|Events|Arrays and objects|Functions|Async concepts|Local storage|Projects'],
['HTML & CSS','Web Development','Beginner',399,'Design responsive and accessible web pages.','HTML structure|Semantic HTML|Forms|CSS selectors|Flexbox|Grid|Responsive design|Portfolio project'],
['PHP & MySQL','Web Development','Intermediate',699,'Build dynamic websites with database connectivity.','PHP basics|Forms|Sessions|PDO|CRUD|Authentication|Security|Mini project'],
['SQL & DBMS','Database','Beginner',499,'Understand relational databases and SQL queries.','DBMS concepts|Tables|DDL and DML|SELECT|Joins|Aggregate functions|Subqueries|Normalization'],
['C# Fundamentals','Programming','Beginner',699,'Learn modern C# and object-oriented programming.','Syntax|Types|Conditions|Methods|Classes|Collections|Exceptions|LINQ basics'],
['Kotlin Basics','Mobile Development','Beginner',699,'Learn Kotlin language fundamentals.','Syntax|Variables|Null safety|Conditions|Functions|Classes|Collections|Coroutines intro'],
['Go Programming','Programming','Intermediate',799,'Build efficient applications with Go.','Setup|Types|Control flow|Functions|Structs|Interfaces|Goroutines|HTTP server'],
['Ruby Basics','Programming','Beginner',599,'Learn expressive Ruby programming.','Syntax|Strings and arrays|Hashes|Methods|Blocks|Classes|Files|Small project']
];
if (!db.prepare('SELECT COUNT(*) n FROM courses').get().n) {
 const insert = db.prepare('INSERT INTO courses(title,category,level,price,description,lessons) VALUES(?,?,?,?,?,?)');
 const tx = db.transaction(rows => rows.forEach(row => insert.run(...row))); tx(courseSeed);
}
if (!db.prepare('SELECT COUNT(*) n FROM products').get().n) {
 const insert = db.prepare('INSERT INTO products(title,kind,price,description) VALUES(?,?,?,?)');
 [['CSE Interview Notes','PDF Notes',99,'Quick revision notes for programming and technical interviews.'],['Web Portfolio Template','Website Template',149,'A responsive starter for your developer portfolio.'],['Student Project Pack','Source Code',249,'Beginner-friendly project source with setup notes.'],['SQL Practice Set','Practice Pack',79,'SQL exercises for DBMS and placement preparation.']].forEach(x=>insert.run(...x));
}
const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' }, contentSecurityPolicy: false }));
app.use(express.json({ limit: '30kb' }));
app.use(express.urlencoded({ extended: false, limit: '30kb' }));
const SQLiteStore = SQLiteStoreFactory(session);
app.use(session({ store: new SQLiteStore({ db: 'sessions.sqlite', dir: dataDir }), secret: process.env.SESSION_SECRET || 'change-this-session-secret-before-deploying-please', resave: false, saveUninitialized: false, cookie: { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 1000*60*60*24*7 } }));
const publicUser = u => u ? ({ id:u.id, name:u.name, email:u.email, role:u.role }) : null;
const requireUser = (req,res,next) => req.session.user ? next() : res.status(401).json({error:'Please sign in first.'});
const requireAdmin = (req,res,next) => req.session.user?.role === 'admin' ? next() : res.status(403).json({error:'Administrator access required.'});
app.get('/api/health', (req,res) => res.json({ok:true,app:'CodeEarn'}));
app.get('/api/me', (req,res) => res.json({user:publicUser(req.session.user)}));
app.get('/api/courses', (req,res) => res.json(db.prepare('SELECT id,title,category,level,price,description,lessons FROM courses ORDER BY category,title').all().map(c=>({...c,lessons:c.lessons.split('|')}))));
app.get('/api/products', (req,res) => res.json(db.prepare('SELECT * FROM products ORDER BY id').all()));
app.post('/api/register', async (req,res) => {
 const name=String(req.body.name||'').trim(), email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||'');
 if(name.length<2||name.length>80||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||password.length<8) return res.status(400).json({error:'Enter a valid name, email and password (8+ characters).'});
 try { const info=db.prepare('INSERT INTO users(name,email,password) VALUES(?,?,?)').run(name,email,await bcrypt.hash(password,12)); req.session.user={id:Number(info.lastInsertRowid),name,email,role:'student'}; res.json({user:publicUser(req.session.user)}); }
 catch(e){ if(String(e.code).includes('SQLITE_CONSTRAINT')) return res.status(409).json({error:'Email already registered.'}); throw e; }
});
app.post('/api/login', async (req,res) => {
 const email=String(req.body.email||'').trim().toLowerCase(), password=String(req.body.password||'');
 const u=db.prepare('SELECT * FROM users WHERE email=?').get(email);
 if(!u||!(await bcrypt.compare(password,u.password))) return res.status(401).json({error:'Incorrect email or password.'});
 req.session.regenerate(err=>{if(err)return res.status(500).json({error:'Could not start session.'});req.session.user={id:u.id,name:u.name,email:u.email,role:u.role};res.json({user:publicUser(req.session.user)});});
});
app.post('/api/logout',requireUser,(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.post('/api/enroll',requireUser,(req,res)=>{
 const id=Number(req.body.courseId), c=db.prepare('SELECT * FROM courses WHERE id=?').get(id); if(!c)return res.status(404).json({error:'Course not found.'});
 db.prepare('INSERT OR IGNORE INTO enrollments(user_id,course_id,status) VALUES(?,?,?)').run(req.session.user.id,id,c.price===0?'approved':'pending');
 res.json({message:c.price===0?'You are enrolled.':'Enrollment request saved. Submit payment reference after paying.'});
});
app.post('/api/payment-reference',requireUser,(req,res)=>{
 const courseId=Number(req.body.courseId), reference=String(req.body.reference||'').trim();
 if(!reference||reference.length>100)return res.status(400).json({error:'Enter a valid transaction reference.'});
 if(!db.prepare('SELECT id FROM courses WHERE id=?').get(courseId))return res.status(404).json({error:'Course not found.'});
 db.prepare('INSERT INTO payments(user_id,course_id,reference) VALUES(?,?,?)').run(req.session.user.id,courseId,reference);
 res.json({message:'Reference submitted. Admin will verify it manually.'});
});
app.post('/api/order',requireUser,(req,res)=>{
 const id=Number(req.body.productId); if(!db.prepare('SELECT id FROM products WHERE id=?').get(id))return res.status(404).json({error:'Product not found.'});
 db.prepare('INSERT INTO orders(user_id,product_id) VALUES(?,?)').run(req.session.user.id,id);res.json({message:'Order request placed. Admin will process it manually.'});
});
app.get('/api/dashboard',requireUser,(req,res)=>{
 const id=req.session.user.id;
 res.json({enrollments:db.prepare('SELECT e.id,e.status,c.id courseId,c.title,c.price FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=? ORDER BY e.id DESC').all(id),payments:db.prepare('SELECT p.id,p.reference,p.status,c.title FROM payments p JOIN courses c ON c.id=p.course_id WHERE p.user_id=? ORDER BY p.id DESC').all(id),orders:db.prepare('SELECT o.id,o.status,p.title FROM orders o JOIN products p ON p.id=o.product_id WHERE o.user_id=? ORDER BY o.id DESC').all(id)});
});
app.get('/api/certificate/:courseId',requireUser,(req,res)=>{
 const c=db.prepare("SELECT c.title FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=? AND e.course_id=? AND e.status='approved'").get(req.session.user.id,Number(req.params.courseId));
 if(!c)return res.status(403).json({error:'Certificate is available after course access is approved.'});res.json({name:req.session.user.name,course:c.title,date:new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})});
});
app.get('/api/admin/overview',requireAdmin,(req,res)=>{
 res.json({
 payments:db.prepare("SELECT p.id,p.reference,p.status,u.name,c.title FROM payments p JOIN users u ON u.id=p.user_id JOIN courses c ON c.id=p.course_id WHERE p.status='pending'").all(),
 enrollments:db.prepare("SELECT e.id,u.name,c.title FROM enrollments e JOIN users u ON u.id=e.user_id JOIN courses c ON c.id=e.course_id WHERE e.status='pending'").all(),
 orders:db.prepare("SELECT o.id,u.name,p.title FROM orders o JOIN users u ON u.id=o.user_id JOIN products p ON p.id=o.product_id WHERE o.status='pending'").all()
 });
});
app.post('/api/admin/approve-payment',requireAdmin,(req,res)=>{
 const p=db.prepare('SELECT user_id,course_id FROM payments WHERE id=?').get(Number(req.body.id));if(!p)return res.status(404).json({error:'Payment not found.'});
 const tx=db.transaction(()=>{db.prepare("UPDATE payments SET status='verified' WHERE id=?").run(Number(req.body.id));db.prepare("INSERT OR IGNORE INTO enrollments(user_id,course_id,status) VALUES(?,?,'approved')").run(p.user_id,p.course_id);db.prepare("UPDATE enrollments SET status='approved' WHERE user_id=? AND course_id=?").run(p.user_id,p.course_id);});tx();res.json({message:'Payment marked verified and course access approved.'});
});
app.post('/api/admin/approve-enrollment',requireAdmin,(req,res)=>{const r=db.prepare("UPDATE enrollments SET status='approved' WHERE id=?").run(Number(req.body.id));if(!r.changes)return res.status(404).json({error:'Request not found.'});res.json({message:'Enrollment approved.'});});
app.post('/api/admin/approve-order',requireAdmin,(req,res)=>{const r=db.prepare("UPDATE orders SET status='approved' WHERE id=?").run(Number(req.body.id));if(!r.changes)return res.status(404).json({error:'Order not found.'});res.json({message:'Order marked approved.'});});
if(process.env.NODE_ENV==='production'){app.use(express.static(path.join(__dirname,'dist')));app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'dist','index.html')));}
else {app.use(express.static(path.join(__dirname,'public')));}
const port=Number(process.env.PORT||3000);
app.listen(port,()=>console.log('CodeEarn server running on http://localhost:'+port));
