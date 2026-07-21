const Database = require('better-sqlite3');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'youform.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free', brand_color TEXT DEFAULT '#7C3AED',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL, email TEXT NOT NULL, password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member', created_at TEXT NOT NULL DEFAULT (datetime('now')), UNIQUE(email)
);
CREATE TABLE IF NOT EXISTS forms (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  created_by TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT,
  slug TEXT UNIQUE NOT NULL, status TEXT NOT NULL DEFAULT 'draft',
  layout TEXT NOT NULL DEFAULT 'conversational', questions TEXT NOT NULL DEFAULT '[]',
  settings TEXT NOT NULL DEFAULT '{}', theme TEXT NOT NULL DEFAULT '{}',
  response_count INTEGER NOT NULL DEFAULT 0, view_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')), updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS responses (
  id TEXT PRIMARY KEY, form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  respondent_name TEXT, respondent_email TEXT, answers TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'complete', time_spent INTEGER DEFAULT 0,
  ip_address TEXT, utm_source TEXT, utm_medium TEXT, utm_campaign TEXT,
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY, form_id TEXT NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, session_id TEXT, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS templates (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT, category TEXT NOT NULL,
  icon TEXT DEFAULT 'ti-file', questions TEXT NOT NULL DEFAULT '[]',
  settings TEXT NOT NULL DEFAULT '{}', is_public INTEGER NOT NULL DEFAULT 1,
  use_count INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS integrations (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  form_id TEXT REFERENCES forms(id), type TEXT NOT NULL, label TEXT,
  config TEXT NOT NULL DEFAULT '{}', status TEXT NOT NULL DEFAULT 'connected',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
`);

function seed() {
  const existing = db.prepare('SELECT id FROM workspaces WHERE slug = ?').get('youform-demo');
  if (existing) return;

  const wsId = uuidv4(), userId = uuidv4();
  const hash = bcrypt.hashSync('demo1234', 10);
  db.prepare('INSERT INTO workspaces (id,name,slug,plan,brand_color) VALUES (?,?,?,?,?)').run(wsId,'Acme Corp','youform-demo','pro','#7C3AED');
  db.prepare('INSERT INTO users (id,workspace_id,name,email,password_hash,role) VALUES (?,?,?,?,?,?)').run(userId,wsId,'Jordan Lee','jordan@acme.com',hash,'owner');

  const f1=uuidv4(),f2=uuidv4(),f3=uuidv4(),f4=uuidv4(),f5=uuidv4();

  const q_contact = JSON.stringify([
    {id:uuidv4(),type:'short_text',label:'Your name',required:true,placeholder:'Jane Smith'},
    {id:uuidv4(),type:'email',label:'Email address',required:true,placeholder:'jane@company.com'},
    {id:uuidv4(),type:'short_text',label:'Subject',required:true,placeholder:'What is this about?'},
    {id:uuidv4(),type:'long_text',label:'Message',required:true,placeholder:'Tell us more…'}
  ]);
  const q_nps = JSON.stringify([
    {id:uuidv4(),type:'nps',label:'How likely are you to recommend us to a friend or colleague?',required:true},
    {id:uuidv4(),type:'multiple_choice',label:'What do you value most about us?',required:false,options:['Product quality','Customer support','Pricing','Ease of use','Reliability']},
    {id:uuidv4(),type:'long_text',label:'Any other thoughts?',required:false,placeholder:'We read every response…'}
  ]);
  const q_waitlist = JSON.stringify([
    {id:uuidv4(),type:'short_text',label:'Full name',required:true,placeholder:'Your name'},
    {id:uuidv4(),type:'email',label:'Work email',required:true,placeholder:'you@company.com'},
    {id:uuidv4(),type:'dropdown',label:'Company size',required:true,options:['1–10','11–50','51–200','201–1000','1000+']},
    {id:uuidv4(),type:'dropdown',label:'Your role',required:true,options:['Founder / CEO','Product','Engineering','Design','Marketing','Other']},
    {id:uuidv4(),type:'short_text',label:'What problem are you trying to solve?',required:false}
  ]);
  const q_job = JSON.stringify([
    {id:uuidv4(),type:'short_text',label:'Full name',required:true},
    {id:uuidv4(),type:'email',label:'Email',required:true},
    {id:uuidv4(),type:'phone',label:'Phone number',required:false},
    {id:uuidv4(),type:'dropdown',label:'Years of experience',required:true,options:['< 1 year','1–3 years','3–5 years','5–10 years','10+ years']},
    {id:uuidv4(),type:'long_text',label:'Why do you want to join us?',required:true},
    {id:uuidv4(),type:'file_upload',label:'Resume (PDF)',required:true},
    {id:uuidv4(),type:'yes_no',label:'Are you open to relocation?',required:false}
  ]);
  const q_event = JSON.stringify([
    {id:uuidv4(),type:'short_text',label:'Your name',required:true},
    {id:uuidv4(),type:'email',label:'Email',required:true},
    {id:uuidv4(),type:'yes_no',label:'Will you attend in person?',required:true},
    {id:uuidv4(),type:'number',label:'How many guests are you bringing?',required:false},
    {id:uuidv4(),type:'dropdown',label:'Dietary preference',required:false,options:['No preference','Vegetarian','Vegan','Gluten-free']}
  ]);

  const ins = db.prepare('INSERT INTO forms (id,workspace_id,created_by,title,slug,status,layout,questions,response_count,view_count,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)');
  const now = new Date().toISOString();
  ins.run(f1,wsId,userId,'Contact us','contact-us','active','conversational',q_contact,142,1803,new Date(Date.now()-30*864e5).toISOString(),now);
  ins.run(f2,wsId,userId,'NPS survey — Q3 2026','nps-q3-2026','active','conversational',q_nps,318,2140,new Date(Date.now()-14*864e5).toISOString(),now);
  ins.run(f3,wsId,userId,'Early access waitlist','early-access-waitlist','active','conversational',q_waitlist,627,4102,new Date(Date.now()-7*864e5).toISOString(),now);
  ins.run(f4,wsId,userId,'Product designer — job application','job-product-designer','draft','classic',q_job,0,0,now,now);
  ins.run(f5,wsId,userId,'Team offsite RSVP','team-offsite-rsvp','active','conversational',q_event,41,58,now,now);

  const insR = db.prepare('INSERT INTO responses (id,form_id,respondent_name,respondent_email,answers,status,time_spent,utm_source,submitted_at) VALUES (?,?,?,?,?,?,?,?,?)');
  const insE = db.prepare('INSERT INTO analytics_events (id,form_id,event_type,session_id,created_at) VALUES (?,?,?,?,?)');

  const respondents = [
    {name:'Priya Sharma',email:'priya@acme.co',form:f2,answers:{0:9,1:['Ease of use','Product quality'],2:'Honestly impressed.'},time:187,utm:'email',days:0},
    {name:'Marcus Chen',email:'marcus@beta.io',form:f2,answers:{0:7,1:['Pricing'],2:''},time:94,utm:'linkedin',days:0},
    {name:'Aisha Patel',email:'aisha@gamma.co',form:f2,answers:{0:10,1:['Customer support','Reliability'],2:'Support team is outstanding.'},time:143,utm:'direct',days:1},
    {name:'Tom Bauer',email:'tom@delta.de',form:f2,answers:{0:5,1:['Pricing'],2:'Too expensive for small teams.'},time:211,utm:'direct',days:1},
    {name:null,email:null,form:f2,answers:{0:8},time:42,utm:'email',days:1,status:'partial'},
    {name:'Riya Nair',email:'riya@eps.in',form:f2,answers:{0:9,1:['Product quality','Ease of use'],2:'Would love a mobile app.'},time:176,utm:'direct',days:2},
    {name:'David Kim',email:'david@zeta.kr',form:f2,answers:{0:4,1:['Reliability'],2:'Had two outages last month.'},time:298,utm:'twitter',days:2},
    {name:'Sofia Russo',email:'sofia@eta.it',form:f2,answers:{0:8,1:['Ease of use'],2:''},time:158,utm:'linkedin',days:3},
    {name:'James Liu',email:'james@theta.sg',form:f2,answers:{0:10,1:['Customer support'],2:'5 stars.'},time:195,utm:'email',days:3},
    {name:'Meera Iyer',email:'meera@iota.in',form:f2,answers:{0:7,1:['Product quality'],2:'Docs could be better.'},time:224,utm:'direct',days:4},
    {name:'Alex Wong',email:'alex@corp.com',form:f1,answers:{0:'Alex Wong',1:'alex@corp.com',2:'Enterprise pricing',3:'We have a team of 200.'},time:134,utm:'direct',days:0},
    {name:'Bea Torres',email:'bea@startup.io',form:f1,answers:{0:'Bea Torres',1:'bea@startup.io',2:'Integration question',3:'Does your product integrate with Notion?'},time:89,utm:'google',days:1},
    {name:'Chris Park',email:'chris@fund.vc',form:f3,answers:{0:'Chris Park',1:'chris@fund.vc',2:'51–200',3:'Product',4:'Streamline our user research.'},time:201,utm:'linkedin',days:0},
    {name:'Dana Mills',email:'dana@saas.co',form:f3,answers:{0:'Dana Mills',1:'dana@saas.co',2:'11–50',3:'Founder / CEO',4:''},time:112,utm:'direct',days:0},
    {name:'Eve Chen',email:'eve@tech.io',form:f3,answers:{0:'Eve Chen',1:'eve@tech.io',2:'1–10',3:'Engineering',4:'Building a feedback tool.'},time:176,utm:'twitter',days:1},
    {name:'Frank Müller',email:'frank@de.com',form:f5,answers:{0:'Frank Müller',1:'frank@de.com',2:true,3:1,4:'Vegetarian'},time:67,utm:'email',days:0},
    {name:'Grace Ho',email:'grace@sg.com',form:f5,answers:{0:'Grace Ho',1:'grace@sg.com',2:false,3:0,4:'No preference'},time:54,utm:'email',days:0},
  ];

  respondents.forEach(r => {
    const rid=uuidv4(), sid=uuidv4();
    const dt=new Date(Date.now()-r.days*864e5-Math.random()*5e4).toISOString();
    insR.run(rid,r.form,r.name,r.email,JSON.stringify(r.answers),r.status||'complete',r.time,r.utm,dt);
    insE.run(uuidv4(),r.form,'view',sid,dt);
    insE.run(uuidv4(),r.form,'start',sid,dt);
    if ((r.status||'complete')==='complete') insE.run(uuidv4(),r.form,'complete',sid,dt);
  });

  const templates = [
    {name:'Contact us',desc:'Simple inquiry and message form',cat:'general',icon:'ti-mail',uses:2840,qs:[{type:'short_text',label:'Your name',required:true},{type:'email',label:'Email',required:true},{type:'short_text',label:'Subject',required:true},{type:'long_text',label:'Message',required:true}]},
    {name:'NPS survey',desc:'Net Promoter Score with open feedback',cat:'feedback',icon:'ti-chart-line',uses:3210,qs:[{type:'nps',label:'How likely are you to recommend us?',required:true},{type:'multiple_choice',label:'What matters most?',required:false,options:['Quality','Support','Pricing','Ease of use']},{type:'long_text',label:'Any feedback?',required:false}]},
    {name:'Customer satisfaction',desc:'CSAT rating and follow-up',cat:'feedback',icon:'ti-mood-smile',uses:1920,qs:[{type:'rating',label:'How satisfied are you?',required:true,scale:5},{type:'multiple_choice',label:'What could be improved?',required:false,options:['Performance','Mobile','Integrations','Pricing','Docs']},{type:'long_text',label:'Anything else?',required:false}]},
    {name:'Waitlist signup',desc:'Early access with qualification',cat:'lead_gen',icon:'ti-rocket',uses:4150,qs:[{type:'short_text',label:'Full name',required:true},{type:'email',label:'Work email',required:true},{type:'dropdown',label:'Company size',required:true,options:['1–10','11–50','51–200','201–1000','1000+']},{type:'short_text',label:'What problem are you solving?',required:false}]},
    {name:'Lead generation',desc:'Qualify inbound leads',cat:'lead_gen',icon:'ti-users',uses:2670,qs:[{type:'short_text',label:'Full name',required:true},{type:'email',label:'Work email',required:true},{type:'phone',label:'Phone',required:false},{type:'dropdown',label:'Budget',required:true,options:['<$1k/mo','$1–5k/mo','$5k+/mo','Not sure']},{type:'long_text',label:'Tell us about your project',required:true}]},
    {name:'Event RSVP',desc:'Attendance and meal preferences',cat:'events',icon:'ti-calendar-event',uses:1580,qs:[{type:'short_text',label:'Name',required:true},{type:'email',label:'Email',required:true},{type:'yes_no',label:'Will you attend?',required:true},{type:'dropdown',label:'Dietary preference',required:false,options:['No preference','Vegetarian','Vegan','Gluten-free']}]},
    {name:'Job application',desc:'Standard intake for any role',cat:'hr',icon:'ti-briefcase',uses:2010,qs:[{type:'short_text',label:'Full name',required:true},{type:'email',label:'Email',required:true},{type:'phone',label:'Phone',required:false},{type:'long_text',label:'Why do you want to join?',required:true},{type:'file_upload',label:'Resume (PDF)',required:true}]},
    {name:'Employee onboarding',desc:'First-week check-in',cat:'hr',icon:'ti-id-badge-2',uses:890,qs:[{type:'rating',label:'How smooth was onboarding?',required:true,scale:5},{type:'multiple_choice',label:'What went well?',required:false,options:['Team welcome','Tools setup','Role clarity','Manager support']},{type:'long_text',label:'What could be improved?',required:false}]},
    {name:'Order form',desc:'Product orders with payment',cat:'orders',icon:'ti-shopping-cart',uses:1340,qs:[{type:'short_text',label:'Full name',required:true},{type:'email',label:'Email',required:true},{type:'dropdown',label:'Product',required:true,options:['Starter — $99','Pro — $249','Enterprise — Custom']},{type:'payment',label:'Payment',required:true}]},
    {name:'Quiz',desc:'Scored quiz with multiple choice',cat:'education',icon:'ti-school',uses:760,qs:[{type:'short_text',label:'Your name',required:true},{type:'multiple_choice',label:'Which is a JavaScript framework?',required:true,options:['Django','Rails','React','Flask']},{type:'yes_no',label:'Do you use TypeScript?',required:true}]},
  ];

  const insTmpl = db.prepare('INSERT INTO templates (id,name,description,category,icon,questions,use_count) VALUES (?,?,?,?,?,?,?)');
  templates.forEach(t => insTmpl.run(uuidv4(),t.name,t.desc,t.cat,t.icon,JSON.stringify(t.qs.map(q=>({...q,id:uuidv4()}))),t.uses));

  const insI = db.prepare('INSERT INTO integrations (id,workspace_id,form_id,type,label,config,status) VALUES (?,?,?,?,?,?,?)');
  insI.run(uuidv4(),wsId,f1,'google_sheets','Contact → Sheet',JSON.stringify({sheet_id:'abc123'}),'connected');
  insI.run(uuidv4(),wsId,f2,'slack','NPS → #feedback',JSON.stringify({channel:'#feedback'}),'connected');

  console.log('✅ Seed complete — jordan@acme.com / demo1234');
}

seed();
module.exports = db;
