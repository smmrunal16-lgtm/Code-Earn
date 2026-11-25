import express from 'express';
import session from 'express-session';
import SQLiteStoreFactory from 'connect-sqlite3';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import crypto from 'node:crypto';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as MicrosoftStrategy } from 'passport-microsoft';
import PDFDocument from 'pdfkit';

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
CREATE TABLE IF NOT EXISTS cloud_connections(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,provider TEXT NOT NULL,provider_email TEXT,access_token TEXT NOT NULL,refresh_token TEXT,expires_at INTEGER,created_at TEXT DEFAULT CURRENT_TIMESTAMP,UNIQUE(user_id,provider),FOREIGN KEY(user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS social_accounts(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,provider TEXT NOT NULL,provider_id TEXT NOT NULL,email TEXT,UNIQUE(provider,provider_id),FOREIGN KEY(user_id) REFERENCES users(id));
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
app.use(passport.initialize());
const oauthReady=p=>p==='google'?Boolean(process.env.GOOGLE_CLIENT_ID&&process.env.GOOGLE_CLIENT_SECRET&&process.env.TOKEN_ENCRYPTION_KEY):Boolean(process.env.MICROSOFT_CLIENT_ID&&process.env.MICROSOFT_CLIENT_SECRET&&process.env.TOKEN_ENCRYPTION_KEY);
if(oauthReady('google'))passport.use('google',new GoogleStrategy({clientID:process.env.GOOGLE_CLIENT_ID,clientSecret:process.env.GOOGLE_CLIENT_SECRET,callbackURL:process.env.GOOGLE_CALLBACK_URL||((process.env.APP_URL||'http://localhost:3000')+'/auth/google/callback'),passReqToCallback:true},async(req,access,refresh,profile,done)=>{try{const u=await socialUser('google',profile,access,refresh,3600);req.session.user={id:u.id,name:u.name,email:u.email,role:u.role};done(null,u);}catch(e){done(e);}}));
if(oauthReady('microsoft'))passport.use('microsoft',new MicrosoftStrategy({clientID:process.env.MICROSOFT_CLIENT_ID,clientSecret:process.env.MICROSOFT_CLIENT_SECRET,callbackURL:process.env.MICROSOFT_CALLBACK_URL||((process.env.APP_URL||'http://localhost:3000')+'/auth/microsoft/callback'),scope:['openid','profile','email','User.Read','Files.ReadWrite','offline_access'],passReqToCallback:true},async(req,access,refresh,profile,done)=>{try{const u=await socialUser('microsoft',profile,access,refresh,3600);req.session.user={id:u.id,name:u.name,email:u.email,role:u.role};done(null,u);}catch(e){done(e);}}));
app.get('/api/oauth/status',(req,res)=>res.json({google:oauthReady('google'),microsoft:oauthReady('microsoft'),cloud:req.session.user?db.prepare('SELECT provider FROM cloud_connections WHERE user_id=?').all(req.session.user.id).map(x=>x.provider):[]}));
app.get('/auth/google',(req,res,next)=>oauthReady('google')?next():res.status(503).send('Google OAuth is not configured.'),passport.authenticate('google',{scope:['openid','email','profile','https://www.googleapis.com/auth/drive.file'],accessType:'offline',prompt:'consent',session:false}));
app.get('/auth/google/callback',passport.authenticate('google',{failureRedirect:'/login?oauth=failed',session:false}),(req,res)=>req.session.save(()=>res.redirect('/dashboard?oauth=success')));
app.get('/auth/microsoft',(req,res,next)=>oauthReady('microsoft')?next():res.status(503).send('Microsoft OAuth is not configured.'),passport.authenticate('microsoft',{session:false}));
app.get('/auth/microsoft/callback',passport.authenticate('microsoft',{failureRedirect:'/login?oauth=failed',session:false}),(req,res)=>req.session.save(()=>res.redirect('/dashboard?oauth=success')));
const publicUser = u => u ? ({ id:u.id, name:u.name, email:u.email, role:u.role }) : null;
const tokenKey=()=>process.env.TOKEN_ENCRYPTION_KEY?crypto.createHash('sha256').update(process.env.TOKEN_ENCRYPTION_KEY).digest():null;
const seal=value=>{const key=tokenKey();if(!key)throw new Error('TOKEN_ENCRYPTION_KEY is not configured.');const iv=crypto.randomBytes(12),c=crypto.createCipheriv('aes-256-gcm',key,iv),data=Buffer.concat([c.update(String(value),'utf8'),c.final()]);return [iv.toString('hex'),c.getAuthTag().toString('hex'),data.toString('hex')].join(':');};
const unseal=value=>{const key=tokenKey();if(!key)throw new Error('TOKEN_ENCRYPTION_KEY is not configured.');const [iv,tag,data]=value.split(':'),d=crypto.createDecipheriv('aes-256-gcm',key,Buffer.from(iv,'hex'));d.setAuthTag(Buffer.from(tag,'hex'));return Buffer.concat([d.update(Buffer.from(data,'hex')),d.final()]).toString('utf8');};
const saveCloud=(uid,provider,email,access,refresh,expires)=>db.prepare('INSERT INTO cloud_connections(user_id,provider,provider_email,access_token,refresh_token,expires_at) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,provider) DO UPDATE SET provider_email=excluded.provider_email,access_token=excluded.access_token,refresh_token=COALESCE(excluded.refresh_token,cloud_connections.refresh_token),expires_at=excluded.expires_at').run(uid,provider,email,seal(access),refresh?seal(refresh):null,Date.now()+Number(expires||3600)*1000);
const socialUser=async(provider,profile,access,refresh,expires)=>{const pid=String(profile.id),email=String(profile.emails?.[0]?.value||profile._json?.mail||profile._json?.userPrincipalName||'').toLowerCase();if(!email)throw new Error('Provider did not return an email address.');const found=db.prepare('SELECT user_id FROM social_accounts WHERE provider=? AND provider_id=?').get(provider,pid);let u=found?db.prepare('SELECT * FROM users WHERE id=?').get(found.user_id):db.prepare('SELECT * FROM users WHERE email=?').get(email);if(!u){const info=db.prepare('INSERT INTO users(name,email,password) VALUES(?,?,?)').run(profile.displayName||email.split('@')[0],email,await bcrypt.hash(crypto.randomBytes(48).toString('hex'),12));u=db.prepare('SELECT * FROM users WHERE id=?').get(Number(info.lastInsertRowid));}db.prepare('INSERT OR IGNORE INTO social_accounts(user_id,provider,provider_id,email) VALUES(?,?,?,?)').run(u.id,provider,pid,email);saveCloud(u.id,provider,email,access,refresh,expires);return u;};
const pdfBuffer=cert=>new Promise((resolve,reject)=>{const doc=new PDFDocument({size:'A4',layout:'landscape',margin:55}),chunks=[];doc.on('data',x=>chunks.push(x));doc.on('end',()=>resolve(Buffer.concat(chunks)));doc.on('error',reject);doc.rect(25,25,792,545).lineWidth(4).stroke('#b79b5c');doc.font('Times-Bold').fontSize(34).fillColor('#8f7540').text('CODEEARN ACADEMY',{align:'center',top:115});doc.moveDown(1);doc.font('Times-Roman').fontSize(28).fillColor('#243c52').text('Certificate of Completion',{align:'center'});doc.moveDown(1.5);doc.fontSize(16).fillColor('#555').text('This certificate is proudly presented to',{align:'center'});doc.moveDown(.7);doc.font('Times-Bold').fontSize(30).fillColor('#243c52').text(cert.name,{align:'center'});doc.moveDown(.8);doc.font('Times-Roman').fontSize(16).fillColor('#555').text('for successfully completing the learning path',{align:'center'});doc.moveDown(.7);doc.font('Times-Bold').fontSize(24).fillColor('#977b42').text(cert.course,{align:'center'});doc.moveDown(2);doc.fontSize(11).fillColor('#756746').text('ISSUED '+cert.date+' | '+cert.certificateId,{align:'center'});doc.moveDown(1);doc.fontSize(9).fillColor('#888').text('Platform-issued learning certificate · Not a government accreditation',{align:'center'});doc.end();});
const cloudAccess=async row=>{if(row.expires_at>Date.now()+60000)return unseal(row.access_token);if(!row.refresh_token)throw new Error('Cloud connection expired. Reconnect your account.');const ms=row.provider==='microsoft',p=new URLSearchParams({client_id:ms?process.env.MICROSOFT_CLIENT_ID:process.env.GOOGLE_CLIENT_ID,client_secret:ms?process.env.MICROSOFT_CLIENT_SECRET:process.env.GOOGLE_CLIENT_SECRET,refresh_token:unseal(row.refresh_token),grant_type:'refresh_token'});if(ms)p.set('scope','openid profile email User.Read Files.ReadWrite offline_access');const r=await fetch(ms?'https://login.microsoftonline.com/common/oauth2/v2.0/token':'https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:p}),d=await r.json();if(!r.ok||!d.access_token)throw new Error('Cloud token refresh failed. Reconnect your account.');db.prepare('UPDATE cloud_connections SET access_token=?,refresh_token=?,expires_at=? WHERE id=?').run(seal(d.access_token),d.refresh_token?seal(d.refresh_token):row.refresh_token,Date.now()+Number(d.expires_in||3600)*1000,row.id);return d.access_token;};
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
 if(!c)return res.status(403).json({error:'Certificate is available after course access is approved.'});
 res.json({name:req.session.user.name,course:c.title,date:new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'}),certificateId:'CE-'+req.session.user.id+'-'+Number(req.params.courseId)});
});
app.post('/api/certificate/:courseId/cloud',requireUser,async(req,res)=>{
 try{const id=Number(req.params.courseId),provider=String(req.body.provider||'');if(!['google','microsoft'].includes(provider))return res.status(400).json({error:'Choose Google Drive or OneDrive.'});const c=db.prepare("SELECT c.title FROM enrollments e JOIN courses c ON c.id=e.course_id WHERE e.user_id=? AND e.course_id=? AND e.status='approved'").get(req.session.user.id,id);if(!c)return res.status(403).json({error:'Certificate is available after course approval.'});const row=db.prepare('SELECT * FROM cloud_connections WHERE user_id=? AND provider=?').get(req.session.user.id,provider);if(!row)return res.status(409).json({error:'Connect this cloud account first by signing in with that provider.'});const cert={name:req.session.user.name,course:c.title,date:new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'}),certificateId:'CE-'+req.session.user.id+'-'+id},pdf=await pdfBuffer(cert),fileName=('CodeEarn-'+c.title+'-'+cert.certificateId+'.pdf').replace(/[^a-zA-Z0-9._-]/g,'_'),access=await cloudAccess(row);let url='';
 if(provider==='google'){const boundary='ce_'+crypto.randomBytes(12).toString('hex'),meta=JSON.stringify({name:fileName,mimeType:'application/pdf'}),body=Buffer.concat([Buffer.from('--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+meta+'\r\n--'+boundary+'\r\nContent-Type: application/pdf\r\n\r\n'),pdf,Buffer.from('\r\n--'+boundary+'--')]);const up=await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'multipart/related; boundary='+boundary},body}),file=await up.json();if(!up.ok)throw new Error(file.error?.message||'Google Drive upload failed.');const perm=await fetch('https://www.googleapis.com/drive/v3/files/'+encodeURIComponent(file.id)+'/permissions',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({type:'anyone',role:'reader'})});if(!perm.ok)throw new Error('Uploaded, but Google Drive sharing could not be enabled.');url=file.webViewLink||'https://drive.google.com/file/d/'+file.id+'/view';
 }else{const up=await fetch('https://graph.microsoft.com/v1.0/me/drive/root:/'+encodeURIComponent(fileName)+':/content',{method:'PUT',headers:{Authorization:'Bearer '+access,'Content-Type':'application/pdf'},body:pdf}),file=await up.json();if(!up.ok)throw new Error(file.error?.message||'OneDrive upload failed.');const perm=await fetch('https://graph.microsoft.com/v1.0/me/drive/items/'+encodeURIComponent(file.id)+'/createLink',{method:'POST',headers:{Authorization:'Bearer '+access,'Content-Type':'application/json'},body:JSON.stringify({type:'view',scope:'anonymous'})}),link=await perm.json();if(!perm.ok)throw new Error(link.error?.message||'Uploaded, but OneDrive sharing could not be enabled.');url=link.link?.webUrl||'';}
 res.json({message:'Certificate saved to '+(provider==='google'?'Google Drive':'OneDrive')+'.',url});
 }catch(e){res.status(502).json({error:e.message||'Cloud certificate operation failed.'});}
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
