const { chromium } = require('playwright'); const http=require('http'); const fs=require('fs'); const path=require('path');
const ROOT=process.env.ROOT||'/tmp/app/station/dist-web';
const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.ico':'image/x-icon','.ttf':'font/ttf','.json':'application/json','.hbc':'application/octet-stream'};
const srv=http.createServer((q,r)=>{let p=decodeURIComponent(q.url.split('?')[0]); let f=path.join(ROOT,p); if(!fs.existsSync(f)||fs.statSync(f).isDirectory()) f=path.join(ROOT,'index.html'); r.setHeader('content-type',mime[path.extname(f)]||'application/octet-stream'); fs.createReadStream(f).pipe(r);});
const API='https://solarepc-api.ramakrishnam28.workers.dev/api/v1';
const USERS={'EMP-101':{id:'u-agent',name:'Ravi Kumar',email:'ravi@x.com',role:'sales_agent',emp_id:'EMP-101',phone:'9876500001',city:'Vijayawada'},
 'EMP-102':{id:'u-inst',name:'Suresh Rao',email:'suresh@x.com',role:'installer',emp_id:'EMP-102',phone:'9876500002',city:'Guntur'},
 'EMP-103':{id:'u-mgr',name:'Priya Nair',email:'priya@x.com',role:'manager',emp_id:'EMP-103',phone:'9876500004',city:'Vijayawada'},
 'EMP-104':{id:'u-admin',name:'Asha Admin',email:'a@x.com',role:'admin',emp_id:'EMP-104',phone:'9876500005',city:'Vijayawada'},
 'EMP-105':{id:'u-fin',name:'Farah Finance',email:'f@x.com',role:'finance',emp_id:'EMP-105',phone:'9876500006',city:'Vijayawada'},
 'EMP-106':{id:'u-loan',name:'Lokesh Loans',email:'l@x.com',role:'loan_officer',emp_id:'EMP-106',phone:'9876500007',city:'Vijayawada'},
 'EMP-000':{id:'u-build',name:'Mohammed Quadeer',email:'q@x.com',role:'builder',emp_id:'EMP-000',phone:'9876500003',city:'Machilipatnam'}};

const STAT=['loan_applied','kyc_pending','disbursed_full','installation_complete','survey_completed','loan_rejected','pmsg_pending'];
const CUSTS=Array.from({length:49},(_,i)=>{const n=i+1; const seg=n<=45?'active':n<=48?'completed':'cancelled';
  return {id:'c'+n,name:n===1?'Anjali Devi':'Customer '+String(n).padStart(2,'0'),phone:'98765'+String(10000+n),project_id:'RCAL-'+String(1000+n),status:seg==='completed'?'project_complete':seg==='cancelled'?'cancelled':STAT[n%STAT.length],seg,
    system_kw:3,village:'Pedana',district:'Krishna',lead_source:'referral',agent_name:'Ravi Kumar',quotation_value:n===1?325000:null,loan_bank:n===1?'SBI Machilipatnam':null,loan_amount:n===1?250000:null,field_visit_done:n%2===0};});
CUSTS[0].status='loan_applied';
CUSTS[1].status='subsidy_credited'; CUSTS[1].mock_gap=true;
CUSTS[2].status='amount_disbursed'; CUSTS[2].installation_id='i1';
CUSTS[4].payment_method='cash'; CUSTS[4].dc_quotation_value=300000; CUSTS[4].subsidy_amount=78000;
CUSTS[45].status='project_complete';
CUSTS[48].status='cancelled'; CUSTS[48].cancelled_from_status='loan_applied'; CUSTS[48].cancel_reason='Customer changed mind'; CUSTS[48].cancelled_by_name='Priya Nair'; CUSTS[48].cancelled_at='2026-11-10T10:00:00Z';
const segOf=c=>c.status==='cancelled'?'cancelled':c.status==='project_complete'?'completed':'active';
const Module=require('module'); const _l=Module._load; Module._load=function(r,p,...a){ if(/config\/db|ApiError|customerAuditLog/.test(r)) return {}; return _l.call(this,r,p,...a); };
const SE=require('/tmp/be/src/utils/statusEngine.js'), WF=require('/tmp/be/src/utils/workflow.js'); Module._load=_l;
let results=[];
 const ok=(n,c,d='')=>{results.push([c,n,d]);console.log((c?'PASS ':'FAIL ')+n+(d?'  '+d:''));};
(async()=>{
  await new Promise(r=>srv.listen(5173,r)); const base='http://localhost:5173';
  const browser=await chromium.launch();
  async function newApp({role='EMP-101',tokens=null,down=false,expireFirst=false,vp={width:390,height:844}}={}){
    const ctx=await browser.newContext({viewport:vp,deviceScaleFactor:2,isMobile:true,hasTouch:true,geolocation:{latitude:16.18,longitude:81.13},permissions:['geolocation']});
    const page=await ctx.newPage(); const st={calls:[],down,access:'A1',refresh:'R1',expired:expireFirst,refreshes:0,errors:[],custs:JSON.parse(JSON.stringify(CUSTS)),bodies:[],loans:[{id:'l1',customer_id:'c1',customer_name:'Anjali Devi',loan_ref:'LOAN-2026-001',bank_name:'HDFC Bank',status:'applied',sanctioned_amount:520000,applied_amount:520000,sla_days:7,days_elapsed:18,sla_days_left:-11,submitted_at:'2026-11-01',escalation_level:2,loan_officer_phone:'9000000001'},{id:'l2',customer_id:'c5',customer_name:'Customer 05',loan_ref:'LOAN-2026-002',bank_name:'SBI',status:'under_review',applied_amount:260000,sla_days:10,days_elapsed:3,sla_days_left:7,submitted_at:'2026-11-15',escalation_level:0},{id:'l3',customer_id:'c3',customer_name:'Customer 03',loan_ref:'LOAN-2026-003',bank_name:'SBI',status:'disbursed',disbursed_amount:180000,sla_days:10}]};
    page.on('pageerror',e=>st.errors.push(String(e))); page.on('console',m=>{if(m.type()==='error')st.errors.push(m.text())});
    await page.route(API+'/**',async route=>{
      const req=route.request(); const url=req.url().replace(API,''); const method=req.method(); const auth=req.headers()['authorization']||'';
      st.calls.push(method+' '+url);
      const j=(s,b)=>{(st.resp=st.resp||[]).push([s,method+' '+url]); return route.fulfill({status:s,contentType:'application/json',headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*','access-control-allow-methods':'*'},body:JSON.stringify(b)});};
      if(method==='OPTIONS') return j(204,{});
      if(st.down) return route.abort('failed');
      if(url==='/auth/login'){const b=JSON.parse(req.postData()); const u=USERS[b.email.toUpperCase()]; if(!u||b.password!=='secret1') return j(401,{success:false,message:'Invalid credentials'}); st.role=u; return j(200,{success:true,data:{accessToken:'A1',refreshToken:'R1',user:{id:u.id,name:u.name,email:u.email,role:u.role}}});}
      if(url==='/auth/refresh'){st.refreshes++; const b=JSON.parse(req.postData()); if(b.refreshToken!==st.refresh) return j(401,{message:'Invalid refresh token'}); st.access='A'+(st.refreshes+1); st.refresh='R'+(st.refreshes+1); st.expired=false; return j(200,{success:true,data:{accessToken:st.access,refreshToken:st.refresh}});}
      if(url==='/auth/logout') return j(200,{success:true,data:{}});
      if(auth!=='Bearer '+st.access || st.expired) return j(401,{message:'Token expired'});
      const u=st.role||USERS[role];
      if(url==='/auth/me') return j(200,{success:true,data:u});
      if(url==='/settings/bundle') return j(200,{success:true,data:{rolePerms:{},userOverrides:{'u-agent':{reports:1}},settings:{},activity:[]}});


      {
        let body={}; try{body=req.postData()?JSON.parse(req.postData()):{};}catch{body={};} const me=st.role||USERS[role];
        const m=url.match(/^\/customers\/(c\d+)\/(status|move-back|cancel|reactivate|completion\/request|completion\/review|notes|workflow|timeline)$/);
        if(m){
          const c=st.custs.find(x=>x.id===m[1]); const act=m[2]; if(!c) return j(404,{message:'Customer not found'});
          if(method!=='GET') st.bodies.push(method+' '+url+' '+JSON.stringify(body));
          const ADM=['admin','manager','builder'];
          const ok=(extra)=>j(200,{success:true,data:{id:c.id,status:c.status,...(extra||{})}});
          const log=(a,md)=>{(st.tl[c.id]=st.tl[c.id]||[]).push({id:'t'+Math.random(),action:a,metadata:md||{},user_name:me.name,created_at:new Date().toISOString()});};
          st.tl=st.tl||{};
          if(act==='workflow'){ const pm=c.payment_method||'loan'; const steps=WF.buildWorkflow(pm,c.status).map(s=>s.can_move_back?{...s,...(({resets,keeps})=>({resets,keeps}))(WF.describeMoveBack(c,s.key,{}))}:s); return j(200,{success:true,data:{payment_method:pm,current_status:c.status,current_label:WF.labelFor(pm,c.status),cancelled:c.status==='cancelled',steps}}); }
          if(act==='timeline') return j(200,{success:true,data:[...(st.tl[c.id]||[])].reverse()});
          if(act==='notes'){ if(!['admin','manager','sales_agent','loan_officer','installer','finance','builder'].includes(me.role)) return j(403,{message:'Access denied'}); if(!body.note||!body.note.trim()) return j(400,{message:'Note text is required'}); log(body.note.trim(),{type:'note',author:me.email}); return j(201,{success:true,data:{text:body.note}}); }
          if(act==='status'){
            if(!['admin','manager','sales_agent','loan_officer','builder'].includes(me.role)) return j(403,{message:'Access denied. Required role: admin or manager or sales_agent or loan_officer'});
            const allowed=SE.VALID_TRANSITIONS[c.status]||[]; if(c.status===body.status) return j(400,{message:'Customer is already in this status'});
            if(!allowed.includes(body.status)) return j(400,{message:'Invalid transition: '+c.status+' → '+body.status+'. Allowed: '+allowed.join(', ')});
            const from=c.status; c.status=body.status; log('Status changed to '+body.status,{from,to:body.status,note:body.note||null}); return ok({previousStatus:from});
          }
          if(act==='move-back'){
            if(!ADM.includes(me.role)) return j(403,{message:'Access denied. Required role: admin or manager or builder'});
            if(String(body.reason||'').trim().length<3) return j(400,{message:'Please give a reason for moving the customer back'});
            if(!(SE.rankOf(body.target_status)<SE.rankOf(c.status))) return j(400,{message:'Move Back can only go to an earlier step than the current one'});
            const from=c.status; c.status=body.target_status; log('Moved back to '+body.target_status,{from,reason:body.reason}); return ok({previousStatus:from});
          }
          if(act==='cancel'){
            if(String(body.reason||'').trim().length<3) return j(400,{message:'Please give a reason for cancelling this customer'});
            if(c.status==='cancelled') return j(400,{message:'This customer is already cancelled'});
            if(c.status==='project_complete') return j(400,{message:'A completed project cannot be cancelled. Move it back first if it was marked complete by mistake.'});
            if(SE.rankOf(c.status)>=SE.rankOf('amount_disbursed')&&!['admin','builder'].includes(me.role)) return j(403,{message:'Money has already been received for this customer. Only admin can cancel now.'});
            const from=c.status; c.status='cancelled'; c.cancelled_from_status=from; c.cancel_reason=body.reason.trim(); c.cancelled_by_name=me.name; c.cancelled_at=new Date().toISOString(); log('Customer cancelled',{reason:body.reason}); return ok({previousStatus:from});
          }
          if(act==='reactivate'){
            if(!ADM.includes(me.role)) return j(403,{message:'Only admin or manager can reactivate a cancelled customer'});
            if(c.status!=='cancelled') return j(400,{message:'This customer is not cancelled'});
            c.status=c.cancelled_from_status||'lead_captured'; c.cancel_reason=null; c.cancelled_at=null; c.cancelled_by_name=null; log('Customer reactivated',{note:body.note||null}); return ok();
          }
          if(act==='completion/request'){
            if(c.status!=='subsidy_credited') return j(400,{message:'Completion can be requested only after the subsidy is credited'});
            if(c.completion_requested_at) return j(400,{message:'A completion request is already waiting for approval'});
            if(c.mock_gap) return j(400,{message:'Cannot request completion yet: subsidy not credited'});
            c.completion_requested_at=new Date().toISOString(); c.completion_requested_by_name=me.name; c.completion_request_note=body.note||null; c.completion_rejected_note=null; log('Project completion requested'); return ok();
          }
          if(act==='completion/review'){
            if(!ADM.includes(me.role)) return j(403,{message:'Only admin or manager can review a completion request'});
            if(!c.completion_requested_at) return j(400,{message:'There is no completion request to review'});
            if(body.action==='approve'){ c.status='project_complete'; c.completion_requested_at=null; log('Completion request approved'); return ok(); }
            if(!body.note||!String(body.note).trim()) return j(400,{message:'Please give a reason for sending it back'});
            c.completion_requested_at=null; c.completion_rejected_note=String(body.note).trim(); log('Completion request sent back',{note:body.note}); return ok();
          }
        }
      }

      // ---------------- Phase 3–5 mocks ----------------
      {
        const raw=req.postData()||''; const me=st.role||USERS[role]; st.docs=st.docs||{}; st.photos=st.photos||{}; st.cash=st.cash||{};
        const jb=()=>{try{return JSON.parse(raw)}catch{return {}}};
        const formField=(name)=>{const m=raw.match(new RegExp('name="'+name+'"\\r\\n\\r\\n([^\\r]*)'));return m?m[1]:null;};
        if(url.startsWith('/customers/check-duplicate')){ const q=new URL('http://x'+url).searchParams; const c=st.custs.find(x=>x.phone===q.get('value')&&x.id!==q.get('exclude_id')); return j(200,{success:true,data:c?{id:c.id,name:c.name,project_id:c.project_id,phone:c.phone}:null}); }
        if(url==='/customers'&&method==='POST'){ const b=jb(); st.bodies.push('POST /customers '+JSON.stringify(b));
          if(!['admin','manager','sales_agent','builder'].includes(me.role)) return j(403,{message:'Access denied'});
          if(!/^\d{10}$/.test(b.phone||'')) return j(422,{message:'Validation failed',errors:[{field:'phone',message:'Phone must be exactly 10 digits'}]});
          const n=st.custs.length+1; const c={id:'c'+n,project_id:'RCAL-'+(1000+n),status:'lead_captured',agent_name:me.name,field_visit_done:false,...b}; st.custs.unshift(c); return j(201,{success:true,data:c}); }
        if(/^\/customers\/c\d+$/.test(url)&&method==='PATCH'){ const b=jb(); st.bodies.push('PATCH '+url+' '+JSON.stringify(b)); const c=st.custs.find(x=>'/customers/'+x.id===url); if(!c) return j(404,{message:'Customer not found'});
          if(!['admin','manager','sales_agent','finance','builder'].includes(me.role)) return j(403,{message:'Access denied'}); Object.assign(c,b); return j(200,{success:true,data:{id:c.id}}); }
        let m;
        if((m=url.match(/^\/documents\/customer\/(c\d+)$/))){ if(!['admin','manager','sales_agent','finance','loan_officer','builder'].includes(me.role)) return j(403,{message:'Access denied'}); return j(200,{success:true,data:{documents:st.docs[m[1]]||[],summary:{}}}); }
        if(url==='/documents/upload'&&method==='POST'){ const cid=formField('customer_id'), dt=formField('doc_type'); st.bodies.push('UPLOAD doc '+cid+' '+dt+' file='+(/filename="/.test(raw)||raw.length>500));
          if(!cid||!dt) return j(422,{message:'customer_id and doc_type are required'});
          (st.docs[cid]=st.docs[cid]||[]).push({id:'d'+Math.random().toString(36).slice(2),doc_type:dt,status:'uploaded',has_file:true,mime_type:'image/png'}); return j(200,{success:true,data:{ok:1}}); }
        if((m=url.match(/^\/documents\/(d\w+)\/url$/))) return j(200,{success:true,data:{download_url:'https://example.com/doc.png'}});
        if((m=url.match(/^\/customers\/(c\d+)\/installation\/photos$/))){ if(!['admin','manager','installer','sales_agent','loan_officer','builder'].includes(me.role)) return j(403,{message:'Access denied'}); const c=st.custs.find(x=>x.id===m[1]); return j(200,{success:true,data:{photos:st.photos[m[1]]||[],installation_id:c&&c.installation_id||null}}); }
        if((m=url.match(/^\/customers\/(c\d+)\/installation\/photos\/upload$/))){ const lb=formField('label'); st.bodies.push('UPLOAD photo '+m[1]+' '+lb); (st.photos[m[1]]=st.photos[m[1]]||[]).push({label:lb,file_url:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',approval_status:'pending'}); return j(200,{success:true,data:{}}); }
        if((m=url.match(/^\/installations\/(i\d+)\/checkin$/))){ const b=jb(); st.bodies.push('CHECKIN '+m[1]+' '+(typeof b.lat==='number'&&typeof b.lng==='number')); return j(200,{success:true,data:{gps_verified:true,distance_m:12,fence_m:200,message:'Check-in successful — status updated to In Progress'}}); }
        if(url==='/installations?limit=100'){ if(!['admin','installer','sales_agent','finance','loan_officer','builder'].includes(me.role)) return j(403,{message:'Access denied'}); return j(200,{success:true,data:[{id:'i1',customer_id:'c3',customer_name:'Customer 03',customer_project_id:'RCAL-1003',customer_city:'Pedana',system_kw:3,status:'scheduled',scheduled_date:'2026-11-25',photos_uploaded:2},{id:'i2',customer_id:'c4',customer_name:'Customer 04',customer_project_id:'RCAL-1004',status:'completed',scheduled_date:'2026-11-01',photos_uploaded:8,progress_pct:100}],pagination:{total:2,page:1,limit:100,totalPages:1}}); }
        if((m=url.match(/^\/customers\/(c\d+)\/cash-payment$/))){ const cid=m[1];
          if(method==='GET'){ if(!['admin','manager','sales_agent','loan_officer','installer','builder','finance'].includes(me.role)) return j(403,{message:'Access denied'}); return j(200,{success:true,data:st.cash[cid]||null}); }
          if(!['admin','manager','sales_agent','loan_officer','builder'].includes(me.role)) return j(403,{message:'Access denied'});
          const b=jb(); st.bodies.push('POST '+url+' '+JSON.stringify(b)); const cur=st.cash[cid]=st.cash[cid]||{};
          if(cur['installment_'+b.installment+'_amount']) return j(400,{message:'Installment '+b.installment+' is already recorded (₹'+cur['installment_'+b.installment+'_amount']+'). Only an admin can correct it.'});
          if(b.installment===2&&!cur.installment_1_amount) return j(400,{message:'Record installment 1 before installment 2'});
          cur['installment_'+b.installment+'_amount']=b.amount; cur['installment_'+b.installment+'_date']=new Date().toISOString();
          return j(200,{success:true,data:{total_collected:(cur.installment_1_amount||0)+(cur.installment_2_amount||0),fully_paid:false}}); }
        if(url==='/loans?limit=200'){ if(!['admin','finance','loan_officer','sales_agent','builder'].includes(me.role)) return j(403,{message:'Access denied'});
          return j(200,{success:true,data:st.loans,pagination:{total:st.loans.length,page:1,limit:200,totalPages:1}}); }
        if(url.startsWith('/loans?overdue=true')&&!['admin','finance','loan_officer','sales_agent','builder'].includes(me.role)) return j(403,{message:'Access denied'});
        if(url.startsWith('/loans?overdue=true')) return j(200,{success:true,data:st.loans.filter(l=>l.sla_days_left<0),pagination:{total:st.loans.filter(l=>l.sla_days_left<0).length}});
        if((m=url.match(/^\/loans\/(l\d+)\/escalate$/))){ const b=jb(); st.bodies.push('ESCALATE '+m[1]+' '+JSON.stringify(b)); if(String(b.reason||'').length<5) return j(422,{message:'Validation failed'}); const l=st.loans.find(x=>x.id===m[1]); l.escalation_level=(l.escalation_level||0)+1; return j(200,{success:true,data:{escalation_level:l.escalation_level,label:'L'+l.escalation_level+' — Loan Officer notified'}}); }
      }
      if(url.startsWith('/customers/segment-counts')) return j(200,{success:true,data:{active:45,completed:3,cancelled:1,all:49}});
      if(url.startsWith('/customers?')){
        const q=new URL('http://x'+url).searchParams; st.lastList=url; const page=+q.get('page')||1, lim=+q.get('limit')||20; const seg=q.get('segment')||'all'; const se=(q.get('search')||'').toLowerCase();
        let all=st.custs.filter(c=>seg==='all'||segOf(c)===seg); if(se) all=all.filter(c=>(c.name+c.phone+c.project_id).toLowerCase().includes(se));
        if(lim>=500) all=st.custs;
        const slice=all.slice((page-1)*lim,page*lim); return j(200,{success:true,data:slice,pagination:{total:all.length,page,limit:lim,totalPages:Math.max(1,Math.ceil(all.length/lim))}});
      }
      if(/^\/customers\/c\d+$/.test(url)){ const c=st.custs.find(x=>'/customers/'+x.id===url); return c?j(200,{success:true,data:c}):j(404,{message:'not found'}); }
      { const me=st.role||USERS[role]; let mm;
        if((mm=url.match(/^\/finance\/deal-calculator\/(c\d+)$/))&&method==='GET'){ if(!['admin','finance','builder','sales_agent','loan_officer','manager'].includes(me.role)) return j(403,{message:'Access denied'}); return j(200,{success:true,data:{record:null}}); }
        if(/^\/customers\/c\d+\/audit-log$/.test(url)) return j(200,{success:true,data:[]});
        if(url==='/customers/team/installers') return j(200,{success:true,data:[]}); }
      return j(404,{message:'not found'});
    });
    if(tokens){await page.addInitScript(t=>{localStorage.setItem('rcal.access',t.a);localStorage.setItem('rcal.refresh',t.r);},{a:tokens.a,r:tokens.r});}
    await page.goto(base); return {ctx,page,st};
  }
  const txt=async p=>p.evaluate(()=>document.body.innerText);
  const login=async(page,id,pw)=>{await page.getByLabel('Email or employee ID').fill(id);await page.getByLabel('Password',{exact:true}).fill(pw);await page.getByRole('button',{name:'Sign in'}).click();};


  const ROLES=[['EMP-000','builder'],['EMP-104','admin'],['EMP-103','manager'],['EMP-101','sales_agent'],['EMP-102','installer'],['EMP-105','finance'],['EMP-106','loan_officer']];
  const has=(r,list)=>r==='builder'||list.includes(r);
  const EXPECT_TABS={builder:'Home,Customers,Tasks,More',admin:'Home,Customers,Tasks,More',manager:'Home,Customers,Tasks,More',sales_agent:'Home,Customers,Tasks,More',installer:'Tasks,Home,More',finance:'Home,Customers,Tasks,More',loan_officer:'Home,Customers,Tasks,More'};
  const report=[];
  for(const [emp,r] of ROLES){
    const X=await newApp(); await login(X.page,emp,'secret1'); await X.page.getByText(/Good |Your installation jobs|Needs attention/).filter({visible:true}).first().waitFor({timeout:15000}).catch(()=>{});
    await X.page.waitForTimeout(800);
    const tabs=(await X.page.locator('[role=tab]').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')))).join(',');
    ok(r+': bottom tabs '+tabs,tabs===EXPECT_TABS[r]);
    ok(r+': New customer button only for roles that can create',(await X.page.getByLabel('New customer').count()>0)===has(r,['admin','manager','sales_agent']));
    await X.page.screenshot({path:`/tmp/app/e2e/sw_${r}_home.png`});
    for(const t of tabs.split(',')){ await X.page.getByRole('tab',{name:t}).click(); await X.page.waitForTimeout(900); await X.page.screenshot({path:`/tmp/app/e2e/sw_${r}_${t}.png`}); }
    const moreTxt=await txt(X.page);
    ok(r+': Loan tracker in More only when GET /loans allows the role',/Loan tracker/.test(moreTxt)===has(r,['admin','finance','loan_officer','sales_agent']));
    // customer screen
    await X.page.goto(base+'/customer/c1'); await X.page.getByLabel('Back',{exact:true}).waitFor({timeout:15000}); await X.page.waitForTimeout(800);
    const ctabs=(await X.page.locator('[role=tab]').allInnerTexts()).slice(r==='installer'?-2:-5).join(',');
    ok(r+': customer tabs '+ctabs,ctabs===(r==='installer'?'Progress,Logs':'Overview,Progress,Cash flow,Docs,Logs'));
    const btns=[];
    for(const t of ctabs.split(',')){
      await X.page.getByRole('tab',{name:t}).last().click(); await X.page.waitForTimeout(900);
      await X.page.screenshot({path:`/tmp/app/e2e/sw_${r}_c1_${t.replace(' ','_')}.png`});
      const b=await X.page.evaluate(()=>[...document.querySelectorAll('[role=button]')].filter(e=>e.offsetParent!==null).map(e=>e.getAttribute('aria-label')||e.innerText.trim()).filter(Boolean));
      btns.push(t+': '+[...new Set(b)].join(' | '));
    }
    const all=btns.join('\n');
    ok(r+': Move back only for admin/manager',/\| Move back( \||$)/m.test(all)===has(r,['admin','manager']));
    ok(r+': Save Note only for roles that can edit',/Overview:.*Save Note/.test(all)===has(r,['admin','manager','sales_agent','finance']));
    ok(r+': Update progress shortcut not duplicated on Progress tab',!/Progress:.*Update progress/.test(all));
    if(r!=='installer'){ await X.page.getByRole('tab',{name:'Progress'}).last().click(); await X.page.waitForTimeout(600); const pt=await X.page.evaluate(()=>document.body.innerText); ok(r+': Progress shows role note only when an action is blocked',/Your role cannot do this step/.test(pt)===!has(r,['admin','manager','sales_agent'])); }
    ok(r+': document Add buttons only for roles allowed',/Docs:.*Add Aadhaar/.test(all)===has(r,['admin','manager','sales_agent','finance','loan_officer']));
    ok(r+': ⋮ menu present for every role except installer (Deal calculator is read-only for some)',(await X.page.getByLabel('More actions').count()>0)===(r!=='installer'));
    if(await X.page.getByLabel('More actions').count()>0){
      await X.page.getByLabel('More actions').click(); await X.page.waitForTimeout(300);
      const menu=await X.page.evaluate(()=>[...document.querySelectorAll('[role=button]')].map(e=>e.getAttribute('aria-label')).filter(l=>['Edit customer','Assign agent','Cancel customer','Reactivate customer','Deal calculator'].includes(l)));
      ok(r+': ⋮ menu '+menu.join('/'),menu.includes('Cancel customer')===has(r,['admin','manager','sales_agent'])&&menu.includes('Edit customer')===has(r,['admin','manager','sales_agent','finance'])&&menu.includes('Assign agent')===has(r,['admin'])&&menu.includes('Deal calculator'));
      await X.page.getByLabel('Close menu').click({position:{x:5,y:5}});
    }
    const denied=(X.st.resp||[]).filter(([s])=>s===403||s===404);
    ok(r+': no 403/404 while browsing (app never calls what the role cannot use)',denied.length===0,denied.map(d=>d.join(' ')).join(', '));
    ok(r+': no JS errors',X.st.errors.filter(e=>!/Failed to load resource/.test(e)).length===0,X.st.errors.slice(0,2).join(' | '));
    report.push('## '+r+'\n'+all);
    await X.ctx.close();
  }
  require('fs').writeFileSync('/tmp/app/e2e/sweep_buttons.txt',report.join('\n\n'));

  // ---------- layout at small and large Android widths ----------
  const overflow=async p=>p.evaluate(()=>{const W=innerWidth;const bad=[];
    const scrollerX=e=>{for(let a=e.parentElement;a;a=a.parentElement){const cs=getComputedStyle(a);if(/(auto|scroll)/.test(cs.overflowX)||/hidden/.test(cs.overflow))return true;}return false;};
    document.querySelectorAll('div[dir=auto],[role=button],[role=tab]').forEach(e=>{if(e.offsetParent===null)return;const r=e.getBoundingClientRect();if((r.right>W+1||r.left<-1)&&!scrollerX(e))bad.push((e.innerText||e.getAttribute('aria-label')||'').slice(0,30)+'@'+Math.round(r.right));});
    return {doc:document.documentElement.scrollWidth<=W+1,bad:bad.slice(0,5)};});
  for(const vp of [{width:360,height:740},{width:412,height:915}]){
    const L=await newApp({vp}); await login(L.page,'EMP-000','secret1'); await L.page.getByText('Needs attention').waitFor({timeout:15000});
    const screens=[['home',null],['customers','Customers'],['tasks','Tasks'],['more','More']];
    for(const [n,t] of screens){ if(t){await L.page.getByRole('tab',{name:t}).click(); await L.page.waitForTimeout(900);} const o=await overflow(L.page); ok(`${vp.width}px ${n}: nothing cut off sideways`,o.doc&&o.bad.length===0,o.bad.join(', ')); await L.page.screenshot({path:`/tmp/app/e2e/lay_${vp.width}_${n}.png`}); }
    for(const t of ['Overview','Progress','Cash flow','Docs','Logs']){ await L.page.goto(base+'/customer/c1?tab='+encodeURIComponent(t)); await L.page.getByLabel('Back',{exact:true}).waitFor({timeout:15000}); await L.page.waitForTimeout(900); const o=await overflow(L.page); ok(`${vp.width}px customer ${t}: nothing cut off sideways`,o.doc&&o.bad.length===0,o.bad.join(', ')); await L.page.screenshot({path:`/tmp/app/e2e/lay_${vp.width}_c_${t.replace(' ','_')}.png`}); }
    for(const [n,u] of [['loans','/loans'],['netmeter','/tracker/netmeter'],['subsidy','/tracker/subsidy'],['disbursals','/tracker/disbursals'],['new','/new-customer'],['edit','/edit-customer/c1']]){ await L.page.goto(base+u); await L.page.getByLabel(/Back|Close/).first().waitFor({timeout:15000}); await L.page.waitForTimeout(900); const o=await overflow(L.page); ok(`${vp.width}px ${n}: nothing cut off sideways`,o.doc&&o.bad.length===0,o.bad.join(', ')); await L.page.screenshot({path:`/tmp/app/e2e/lay_${vp.width}_${n}.png`}); }
    // tap targets everywhere on the customer screen
    await L.page.goto(base+'/customer/c1?tab=Docs'); await L.page.getByLabel('Back',{exact:true}).waitFor({timeout:15000}); await L.page.waitForTimeout(900);
    const small=await L.page.evaluate(()=>[...document.querySelectorAll('[role=button],[role=tab],[role=radio]')].filter(e=>e.offsetParent!==null).map(e=>{const r=e.getBoundingClientRect();return [e.getAttribute('aria-label')||e.innerText,Math.round(r.width),Math.round(r.height)]}).filter(([,w,h])=>w<44||h<44));
    ok(`${vp.width}px Docs: every control at least 44x44`,small.length===0,JSON.stringify(small.slice(0,6)));
    await L.ctx.close();
  }
  // ---------- error and empty states ----------
  const E1=await newApp(); await login(E1.page,'EMP-000','secret1'); await E1.page.getByText('Needs attention').waitFor({timeout:15000});
  await E1.page.route('**/api/v1/documents/customer/**',r=>r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Server error, try later'})}));
  await E1.page.route('**/api/v1/loans?limit=200',r=>r.fulfill({status:500,contentType:'application/json',body:JSON.stringify({message:'Database busy'})}));
  await E1.page.goto(base+'/customer/c1?tab=Docs'); await E1.page.getByText('Server error, try later').waitFor({timeout:15000}); ok('Docs: server error shown with Try again',await E1.page.getByRole('button',{name:'Try again'}).count()>0);
  await E1.page.goto(base+'/loans'); await E1.page.getByText('Database busy').waitFor({timeout:15000}); ok('Loan tracker: server error shown with Try again',await E1.page.getByRole('button',{name:'Try again'}).count()>0);
  await E1.page.unroute('**/api/v1/loans?limit=200'); E1.st.loans=[]; await E1.page.getByRole('button',{name:'Try again'}).click(); await E1.page.getByText('No loan applications yet.').waitFor({timeout:10000}); ok('Loan tracker: empty state after retry',true);
  await E1.page.goto(base+'/customer/c999?tab=Docs'); await E1.page.getByText(/not found/i).first().waitFor({timeout:15000}); ok('unknown customer: error, no crash',await E1.page.getByRole('button',{name:'Try again'}).count()>0);
  // offline while a screen is open
  await E1.page.goto(base+'/loans'); await E1.page.getByText('Loan tracker').first().waitFor({timeout:15000});
  E1.st.down=true; await E1.page.goto(base+'/customer/c1'); await E1.page.getByText(/Cannot reach the server|Can't reach the server/).first().waitFor({timeout:40000}); ok('server down: clear message, not a blank screen',true);
  ok('error flows: no JS errors',E1.st.errors.filter(e=>!/Failed to load resource|net::ERR/.test(e)).length===0,E1.st.errors.slice(0,2).join(' | '));
  await E1.ctx.close();

  const bad=results.filter(r=>!r[0]); console.log('\n'+(results.length-bad.length)+'/'+results.length+' passed'); await browser.close(); srv.close(); process.exit(bad.length?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2)});
