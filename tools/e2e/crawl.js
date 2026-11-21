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
        // ---- website-parity mocks ----
        st.deals=st.deals||{}; st.nm=st.nm||{};
        const cust=(id)=>st.custs.find(x=>x.id===id);
        if((m=url.match(/^\/finance\/deal-calculator\/(c\d+)$/))){
          if(method==='GET'){ if(!['admin','finance','builder','sales_agent','loan_officer','manager'].includes(me.role)) return j(403,{message:'Access denied'}); return j(200,{success:true,data:{record:st.deals[m[1]]||null}}); }
          if(!['admin','finance','builder'].includes(me.role)) return j(403,{message:'Access denied'});
          const b=jb(); st.bodies.push('DEAL '+m[1]+' '+JSON.stringify(b)); st.deals[m[1]]={...(st.deals[m[1]]||{}),...b}; const c=cust(m[1]); c.payment_method=b.payment_method; c.quotation_value=b.quotation_value;
          return j(200,{success:true,data:{saved:{payment_method:b.payment_method}}}); }
        if((m=url.match(/^\/finance\/deal-calculator\/(c\d+)\/(confirm-scenario|vendor-float-confirm|contribution-returned)$/))){
          if(!['admin','manager','agent','sales_agent','builder'].includes(me.role)) return j(403,{message:'Access denied'});
          const b=jb(); st.bodies.push('PATCH '+url+' '+JSON.stringify(b)); const d=st.deals[m[1]]=st.deals[m[1]]||{}; const now=new Date().toISOString();
          if(m[2]==='confirm-scenario'){d.contribution_scenario=b.scenario; d.scenario_confirmed_at=now;} else if(m[2]==='vendor-float-confirm') d.vendor_float_confirmed_at=now; else d.contribution_returned_at=now;
          return j(200,{success:true,data:{}}); }
        if((m=url.match(/^\/customers\/(c\d+)\/audit-log$/))){ return j(200,{success:true,data:[
          {id:'a1',category:'status_change',action:'Status changed',field_name:'status',old_value:'loan_ready',new_value:'loan_applied',user_name:'Ravi Kumar',user_emp_id:'EMP-101',user_role:'sales_agent',created_at:'2026-11-18T10:00:00Z'},
          {id:'a2',category:'customer_edit',action:'Customer edited',field_name:'phone',old_value:'1',new_value:'2',user_name:'Priya Nair',user_emp_id:'EMP-103',user_role:'manager',created_at:'2026-11-17T10:00:00Z'},
          {id:'a3',category:'security',action:'Blocked edit',result:'blocked',block_reason:'Role cannot edit this field',user_name:'Ravi Kumar',user_emp_id:'EMP-101',user_role:'sales_agent',created_at:'2026-11-16T10:00:00Z'}]}); }
        if(url==='/customers/team/installers') return j(200,{success:true,data:[{id:'u-inst',name:'Suresh Rao',phone:'9876500002'},{id:'u-inst2',name:'Mahesh Babu',phone:'9876500009'}]});
        if((m=url.match(/^\/customers\/(c\d+)\/(installation|netmeter|netmeter\/approve|subsidy|referral|disbursal2|installation\/photos\/approve)$/))&&method==='PATCH'){
          const b=jb(); const c=cust(m[1]); st.bodies.push('PATCH '+url+' '+JSON.stringify(b)); const k=m[2];
          if(k==='installation'){
            if(!['admin','manager','installer','builder'].includes(me.role)) return j(403,{message:'Access denied'});
            if(b.action==='start'){ c.installation_id='i9'; c.status=c.status==='amount_disbursed'?c.status:c.status; }
            if(b.action==='assign'){ c.inst_assigned_to=b.installer_id; c.installer_name=b.installer_id==='u-inst'?'Suresh Rao':'Mahesh Babu'; }
            if(b.action==='schedule'){ c.inst_scheduled_date=b.date; }
            if(b.action==='complete'){ c.inst_completed_date=new Date().toISOString(); if(c.status!=='net_meter_applied') c.status='installation_complete'; }
          }
          if(k==='netmeter'){ if(b.action==='submitted') c.discom_submission_date=b.submission_date; if(b.action==='approved') c.status='net_meter_approved'; if(b.action==='installed') c.status='net_meter_installed'; if(b.action==='app_installed') c.consumer_app_installed=true; }
          if(k==='netmeter/approve'){ st.nm[m[1]]=st.nm[m[1]]||{}; if(b.action==='approve') st.nm[m[1]].approved=true; else st.nm[m[1]].reupload=true; }
          if(k==='subsidy'){ c.status='subsidy_credited'; c.subsidy_credited=true; }
          if(k==='referral'){ c['referral_s'+b.stage+'_paid']=true; c['referral_s'+b.stage+'_amount']=b.amount; }
          if(k==='disbursal2'){ c.second_disbursal_amount=b.amount; }
          if(k==='installation/photos/approve'){ const ph=(st.photos[m[1]]||[]).find(p=>p.label===b.label); if(ph){ph.approval_status=b.action; ph.rejection_note=b.note;} }
          return j(200,{success:true,data:{}}); }
        if((m=url.match(/^\/documents\/(d\w+)\/(verify|reset)$/))){ const b=jb(); st.bodies.push((method)+' '+url+' '+JSON.stringify(b)); if(m[2]==='verify'&&!['admin','finance','loan_officer','builder'].includes(me.role)) return j(403,{message:'Access denied'});
          for(const k of Object.keys(st.docs)) for(const d of st.docs[k]) if(d.id===m[1]){ d.status=m[2]==='verify'?b.status:'uploaded'; }
          return j(200,{success:true,data:{}}); }
        if(url.startsWith('/users')&&method==='GET'){ if(!['admin','builder'].includes(me.role)) return j(403,{message:'Access denied'}); return j(200,{success:true,data:[{id:'u-agent',name:'Ravi Kumar',role:'sales_agent',emp_id:'EMP-101'},{id:'u-mgr',name:'Priya Nair',role:'manager',emp_id:'EMP-103'}]}); }
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
      return j(404,{message:'not found'});
    });
    if(tokens){await page.addInitScript(t=>{localStorage.setItem('rcal.access',t.a);localStorage.setItem('rcal.refresh',t.r);},{a:tokens.a,r:tokens.r});}
    await page.goto(base); return {ctx,page,st};
  }
  const txt=async p=>p.evaluate(()=>document.body.innerText);
  const login=async(page,id,pw)=>{await page.getByLabel('Email or employee ID').fill(id);await page.getByLabel('Password',{exact:true}).fill(pw);await page.getByRole('button',{name:'Sign in'}).click();};


  const fs=require('fs');
  const findings=[]; const F=(sev,role,vp,screen,kind,detail)=>findings.push({sev,role,vp,screen,kind,detail});
  // what is on screen: interactive controls and visible text
  const snap=p=>p.evaluate(()=>{
    const W=innerWidth,H=innerHeight; const vis=e=>{if(e.offsetParent===null&&getComputedStyle(e).position!=='fixed')return false;const r=e.getBoundingClientRect();return r.width>0&&r.height>0;};
    const ctrls=[...document.querySelectorAll('[role=button],[role=tab],[role=radio],input,textarea')].filter(vis).map((e,i)=>{const r=e.getBoundingClientRect();e.setAttribute('data-crawl',i);return {i,label:(e.getAttribute('aria-label')||e.innerText||e.getAttribute('placeholder')||'').trim().replace(/\s+/g,' ').slice(0,60),role:e.getAttribute('role')||e.tagName.toLowerCase(),x:Math.round(r.left),y:Math.round(r.top),w:Math.round(r.width),h:Math.round(r.height),dis:e.getAttribute('aria-disabled')==='true'||e.disabled===true};});
    // fixed/absolute overlays near the bottom (tab bar, FAB, sticky bars)
    const texts=[...document.querySelectorAll('div[dir=auto]')].filter(vis).map(e=>{const r=e.getBoundingClientRect();return {t:e.innerText.trim(),x:r.left,y:r.top,w:r.width,h:r.height,trunc:e.scrollWidth>e.clientWidth+1&&getComputedStyle(e).overflow==='hidden'};}).filter(t=>t.t);
    return {W,H,ctrls,texts,url:location.pathname+location.search};
  });
  const overlap=(a,b)=>!(a.x+a.w<=b.x+1||b.x+b.w<=a.x+1||a.y+a.h<=b.y+1||b.y+b.h<=a.y+1);
  function checkLayout(role,vp,screen,s){
    // controls cut off sideways or too small
    for(const c of s.ctrls){
      if(c.x<-1||c.x+c.w>s.W+1){ if(!/^(Under process|Completed|Cancelled|All|Stage|Sort: SLA|HDFC Bank|SBI|Status|Overview|Progress|Cash flow|Docs|Logs)/.test(c.label)) F('layout',role,vp,screen,'off-screen',c.label); }
      if(['button','tab','radio'].includes(c.role)&&(c.w<44||c.h<44)) F('layout',role,vp,screen,'tap target under 44',`${c.label} ${c.w}x${c.h}`);
      if(['button','tab'].includes(c.role)&&!c.label) F('label',role,vp,screen,'button without a label',`at ${c.x},${c.y}`);
    }
    // controls overlapping each other
    for(let a=0;a<s.ctrls.length;a++)for(let b=a+1;b<s.ctrls.length;b++){const A=s.ctrls[a],B=s.ctrls[b]; if(A.role==='input'||B.role==='input')continue; if(overlap(A,B)&&!(A.x<=B.x&&A.x+A.w>=B.x+B.w&&A.y<=B.y&&A.y+A.h>=B.y+B.h)&&!(B.x<=A.x&&B.x+B.w>=A.x+A.w&&B.y<=A.y&&B.y+B.h>=A.y+A.h)) F('layout',role,vp,screen,'controls overlap',`${A.label} / ${B.label}`);}
    // truncated text
    for(const t of s.texts) if(t.trunc) F('layout',role,vp,screen,'text cut off (…)',t.t.slice(0,40));
    // same control twice on one screen
    const cnt={}; for(const c of s.ctrls) if(c.label&&['button'].includes(c.role)) cnt[c.label]=(cnt[c.label]||0)+1;
    for(const [l,n] of Object.entries(cnt)) if(n>1&&!/^(Add |View |Replace |Move to )/.test(l)) F('duplicate',role,vp,screen,'same button shown '+n+' times',l);
  }
  // click every button once and record what happened
  async function clickAll(X,role,vp,screen,url){
    const s=await snap(X.page); const labels=[...new Set(s.ctrls.filter(c=>c.role==='button'&&!c.dis&&c.label).map(c=>c.label))];
    for(const label of labels){
      if(/^(Sign out|Back|Close menu|Close dialog|Close|Call .*|WhatsApp|Open address in Maps)$/.test(label)) continue;
      await X.page.goto(base+url); await X.page.waitForTimeout(900);
      const before=(X.st.calls||[]).length, errs=X.st.errors.length, u0=X.page.url();
      const loc=X.page.getByRole('button',{name:label,exact:true}).filter({visible:true}).first();
      if(!(await loc.count())) continue;
      try{ await loc.click({timeout:3000}); }catch(e){ F('broken',role,vp,screen,'button cannot be tapped (covered?)',label); continue; }
      await X.page.waitForTimeout(700);
      const u1=X.page.url(); const calls=(X.st.calls||[]).slice(before).filter(c=>!/^GET/.test(c));
      const dlg=await X.page.locator('[aria-modal=true],[role=dialog]').count();
      const ud=await X.page.getByText('Under development').filter({visible:true}).count();
      const t=await X.page.evaluate(()=>document.body.innerText.length);
      let outcome = u1!==u0?'opens '+new URL(u1).pathname : ud?'Under development' : dlg?'opens a dialog' : calls.length?'sends '+calls.join(','):'changes the screen';
      if(u1===u0&&!dlg&&!ud&&!calls.length){ // did anything change at all?
        const s2=await snap(X.page); const same=JSON.stringify(s2.ctrls.map(c=>c.label))===JSON.stringify(s.ctrls.map(c=>c.label)); if(same) outcome='NOTHING HAPPENS';
      }
      if(X.st.errors.length>errs) F('broken',role,vp,screen,'JS error after tap',label+': '+X.st.errors.slice(errs)[0]);
      if(outcome==='NOTHING HAPPENS') F('broken',role,vp,screen,'tap does nothing',label);
      F('map',role,vp,screen,label,outcome);
    }
  }
  const ROLES=[['EMP-104','admin'],['EMP-103','manager'],['EMP-101','sales_agent'],['EMP-102','installer'],['EMP-105','finance'],['EMP-106','loan_officer']];
  const SCREENS=[['Home','/'],['Customers','/customers'],['Tasks','/tasks'],['More','/more'],
    ['Customer Overview','/customer/c1?tab=Overview'],['Customer Progress','/customer/c1?tab=Progress'],['Customer Cash flow','/customer/c5?tab=Cash%20flow'],['Customer Docs','/customer/c3?tab=Docs'],['Customer Logs','/customer/c1?tab=Logs'],['Disbursal customer','/customer/c3?tab=Progress'],['KYC form','/kyc/c7'],['Deal calculator','/deal/c1'],['Customer Logs','/customer/c1?tab=Logs'],
    ['Cancelled customer','/customer/c49?tab=Progress'],['Subsidy credited customer','/customer/c2?tab=Progress'],
    ['Loan tracker','/loans'],['Net meter','/tracker/netmeter'],['Subsidy','/tracker/subsidy'],['Disbursements','/tracker/disbursals'],['New customer','/new-customer'],['Edit customer','/edit-customer/c1']];
  for(const vp of [{width:360,height:740},{width:412,height:915}]){
    for(const [emp,role] of ROLES){
      const X=await newApp({vp}); await login(X.page,emp,'secret1'); await X.page.waitForTimeout(2500);
      for(const [screen,url] of SCREENS){
        await X.page.goto(base+url); await X.page.waitForTimeout(1200);
        const s=await snap(X.page);
        const name=`${screen}`;
        if(/not available|Not available for your role|cannot/i.test(await X.page.evaluate(()=>document.body.innerText))&&s.ctrls.length<4){ F('map',role,vp.width,name,'(screen)','not open for this role'); continue; }
        // scroll through the page so bottom content is checked against the bars
        checkLayout(role,vp.width,name,s);
        const shot=`/tmp/app/e2e/crawl/${vp.width}_${role}_${screen.replace(/\W+/g,'_')}.png`; await X.page.screenshot({path:shot,fullPage:false});
        if(vp.width===412){ try{ await clickAll(X,role,vp.width,name,url);}catch(e){ F('broken',role,vp.width,name,'crawler lost the page',String(e).slice(0,120)); break; } }
      }
      await X.ctx.close();
    }
  }
  fs.writeFileSync('/tmp/app/e2e/crawl/findings.json',JSON.stringify(findings,null,1));
  const by=(k)=>findings.filter(f=>f.sev===k);
  console.log('broken',by('broken').length,'layout',by('layout').length,'duplicate',by('duplicate').length,'label',by('label').length,'map',by('map').length);
  const bad=results.filter(r=>!r[0]); console.log('\n'+(results.length-bad.length)+'/'+results.length+' passed'); await browser.close(); srv.close(); process.exit(bad.length?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2)});
