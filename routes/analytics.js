const router = require('express').Router();
const db = require('../db');
const { requireAuth } = require('../middleware/auth');

router.get('/dashboard', requireAuth, (req, res) => {
  const wsId = req.user.workspaceId;
  const totalResponses = db.prepare(`SELECT COUNT(*) AS n FROM responses r JOIN forms f ON r.form_id=f.id WHERE f.workspace_id=?`).get(wsId).n;
  const activeForms = db.prepare(`SELECT COUNT(*) AS n FROM forms WHERE workspace_id=? AND status='active'`).get(wsId).n;
  const totalForms = db.prepare(`SELECT COUNT(*) AS n FROM forms WHERE workspace_id=?`).get(wsId).n;
  const completeCount = db.prepare(`SELECT COUNT(*) AS n FROM responses r JOIN forms f ON r.form_id=f.id WHERE f.workspace_id=? AND r.status='complete'`).get(wsId).n;
  const completionRate = totalResponses > 0 ? Math.round(completeCount/totalResponses*100) : 0;
  const avgTime = db.prepare(`SELECT COALESCE(AVG(time_spent),0) AS n FROM responses r JOIN forms f ON r.form_id=f.id WHERE f.workspace_id=? AND r.status='complete'`).get(wsId).n;
  const thisWeek = db.prepare(`SELECT COUNT(*) AS n FROM responses r JOIN forms f ON r.form_id=f.id WHERE f.workspace_id=? AND r.submitted_at>=datetime('now','-7 days')`).get(wsId).n;
  const lastWeek = db.prepare(`SELECT COUNT(*) AS n FROM responses r JOIN forms f ON r.form_id=f.id WHERE f.workspace_id=? AND r.submitted_at>=datetime('now','-14 days') AND r.submitted_at<datetime('now','-7 days')`).get(wsId).n;
  res.json({ total_responses:totalResponses, active_forms:activeForms, total_forms:totalForms, completion_rate:completionRate, avg_time_seconds:Math.round(avgTime), this_week_responses:thisWeek, weekly_growth_pct:lastWeek>0?Math.round((thisWeek-lastWeek)/lastWeek*100):null });
});

router.get('/forms/:id', requireAuth, (req, res) => {
  const form = db.prepare('SELECT * FROM forms WHERE id=? AND workspace_id=?').get(req.params.id, req.user.workspaceId);
  if (!form) return res.status(404).json({ error: 'Form not found' });
  const questions = JSON.parse(form.questions);
  const allResponses = db.prepare('SELECT * FROM responses WHERE form_id=?').all(req.params.id);
  const completeResponses = allResponses.filter(r=>r.status==='complete');
  const startCount = db.prepare(`SELECT COUNT(DISTINCT session_id) AS n FROM analytics_events WHERE form_id=? AND event_type='start'`).get(req.params.id).n;
  const avgTime = completeResponses.length>0?Math.round(completeResponses.reduce((s,r)=>s+r.time_spent,0)/completeResponses.length):0;

  const funnel = [{ label:'Viewed form', count:form.view_count }, { label:'Started Q1', count:Math.max(startCount,allResponses.length) }];
  questions.forEach((q,i) => {
    const answered = allResponses.filter(r=>{ const a=JSON.parse(r.answers); return a[i]!==undefined&&a[i]!==null&&a[i]!==''; }).length;
    funnel.push({ label:`Q${i+2} — ${q.label.slice(0,28)}`, count:answered });
  });
  funnel.push({ label:'Completed', count:completeResponses.length });

  const distributions = questions.map((q,qi) => {
    const answers = allResponses.map(r=>JSON.parse(r.answers)[qi]).filter(a=>a!==undefined&&a!==null&&a!=='');
    let distribution = null;
    if (q.type==='multiple_choice'&&q.options) {
      const counts={}; q.options.forEach(o=>counts[o]=0);
      answers.forEach(a=>(Array.isArray(a)?a:[a]).forEach(v=>{if(counts[v]!==undefined)counts[v]++;}));
      distribution=q.options.map(o=>({label:o,count:counts[o],pct:answers.length>0?Math.round(counts[o]/answers.length*100):0}));
    } else if (q.type==='nps') {
      const nums=answers.map(Number).filter(n=>!isNaN(n));
      const p=nums.filter(n=>n>=9).length,pa=nums.filter(n=>n>=7&&n<=8).length,d=nums.filter(n=>n<=6).length,t=nums.length;
      distribution={promoters:{count:p,pct:t>0?Math.round(p/t*100):0},passives:{count:pa,pct:t>0?Math.round(pa/t*100):0},detractors:{count:d,pct:t>0?Math.round(d/t*100):0},score:t>0?Math.round((p-d)/t*100):null,total:t};
    } else if (q.type==='rating') {
      const counts={1:0,2:0,3:0,4:0,5:0}; answers.forEach(a=>{if(counts[a]!==undefined)counts[a]++;});
      distribution={counts,avg:answers.length>0?(answers.reduce((s,a)=>s+Number(a),0)/answers.length).toFixed(1):null};
    } else if (q.type==='yes_no') {
      const yes=answers.filter(a=>a===true||a==='Yes'||a==='yes').length;
      distribution={yes,no:answers.length-yes};
    }
    return {question_index:qi,question:q.label,type:q.type,total_answers:answers.length,distribution};
  });

  const utmRows = db.prepare(`SELECT utm_source, COUNT(*) AS count FROM responses WHERE form_id=? AND utm_source IS NOT NULL GROUP BY utm_source ORDER BY count DESC`).all(req.params.id);
  const directCount = allResponses.filter(r=>!r.utm_source).length;
  const trafficRaw = [{source:'direct',count:directCount},...utmRows.map(r=>({source:r.utm_source,count:r.count}))];
  const ttl = trafficRaw.reduce((s,r)=>s+r.count,0);
  const traffic = trafficRaw.map(t=>({...t,pct:ttl>0?Math.round(t.count/ttl*100):0})).sort((a,b)=>b.count-a.count);

  res.json({ form_id:req.params.id, title:form.title, views:form.view_count, starts:Math.max(startCount,allResponses.length), completions:completeResponses.length, partials:allResponses.filter(r=>r.status==='partial').length, start_rate:form.view_count>0?Math.round(Math.max(startCount,allResponses.length)/form.view_count*100):0, completion_rate:allResponses.length>0?Math.round(completeResponses.length/allResponses.length*100):0, avg_time_seconds:avgTime, funnel, distributions, traffic });
});

module.exports = router;
