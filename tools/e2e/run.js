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
        if((m=url.match(/^\/customers\/(c\d+)\/installation\/photos$/))){ if(!['admin','manager','installer','sales_agent','loan_officer','builder'].includes(me.role)) return j(403,{message:'Access denied'}); const c=st.custs.find(x=>x.id===m[1]); const nmv=(st.nm||{})[m[1]]||{}; return j(200,{success:true,data:{photos:st.photos[m[1]]||[],installation_id:c&&c.installation_id||null,nm_photo_url:nmv.url||null,nm_photo_approved:!!nmv.approved,nm_photo_reupload_requested:!!nmv.reupload}}); }
        if((m=url.match(/^\/customers\/(c\d+)\/installation\/photos\/upload$/))){ const lb=formField('label'); st.bodies.push('UPLOAD photo '+m[1]+' '+lb); if(lb==='net_meter'){(st.nm=st.nm||{})[m[1]]={...((st.nm||{})[m[1]]||{}),url:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',approved:false,reupload:false}; return j(200,{success:true,data:{}});} (st.photos[m[1]]=st.photos[m[1]]||[]).push({label:lb,file_url:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',approval_status:'pending'}); return j(200,{success:true,data:{}}); }
        if((m=url.match(/^\/installations\/(i\d+)\/checkin$/))){ const b=jb(); st.bodies.push('CHECKIN '+m[1]+' '+(typeof b.lat==='number'&&typeof b.lng==='number')); return j(200,{success:true,data:{gps_verified:true,distance_m:12,fence_m:200,message:'Check-in successful — status updated to In Progress'}}); }
        if(url==='/installations?limit=100'){ if(!['admin','installer','sales_agent','finance','loan_officer','builder'].includes(me.role)) return j(403,{message:'Access denied'}); return j(200,{success:true,data:[{id:'i1',customer_id:'c3',customer_name:'Customer 03',customer_project_id:'RCAL-1003',customer_city:'Pedana',system_kw:3,status:'scheduled',scheduled_date:'2026-11-25',photos_uploaded:2},{id:'i2',customer_id:'c4',customer_name:'Customer 04',customer_project_id:'RCAL-1004',status:'completed',scheduled_date:'2026-11-01',photos_uploaded:8,progress_pct:100}],pagination:{total:2,page:1,limit:100,totalPages:1}}); }
        if((m=url.match(/^\/customers\/(c\d+)\/cash-payment$/))){ const cid=m[1];
          if(method==='GET'){ if(!['admin','manager','sales_agent','loan_officer','installer','builder'].includes(me.role)) return j(403,{message:'Access denied'}); return j(200,{success:true,data:st.cash[cid]||null}); }
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

  // 1 sign-in screen + validation
  let A=await newApp(); await A.page.getByLabel('Email or employee ID').waitFor({timeout:15000});
  ok('sign-in screen shown on fresh start',(await txt(A.page)).includes('Sign in to continue'));
  await A.page.screenshot({path:'/tmp/app/e2e/01_signin.png'});
  await A.page.getByRole('button',{name:'Sign in'}).click();
  ok('empty form shows both validation messages',(await txt(A.page)).includes('Enter your email or employee ID')&&(await txt(A.page)).includes('at least 6 characters'));
  ok('no API call made for invalid form',A.st.calls.length===0);
  await login(A.page,'EMP-101','wrongpw'); await A.page.getByText('Invalid credentials').waitFor({timeout:8000});
  ok('wrong password shows server message and stays on sign-in',(await txt(A.page)).includes('Sign in to continue'));
  await login(A.page,'EMP-101','secret1'); await A.page.getByText('Good ',{exact:false}).filter({visible:true}).first().waitFor({timeout:15000});
  ok('sales agent signs in -> Home',(await txt(A.page)).includes('Ravi'));
  ok('login stored tokens in secure storage',await A.page.evaluate(()=>localStorage.getItem('rcal.refresh')==='R1'));
  const labels=await A.page.getByRole('tab').allInnerTexts(); const tabs=await A.page.locator('[role=tab]').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
  ok('agent tabs: Home, Customers, Tasks, More + New customer button',JSON.stringify(tabs)==='["Home","Customers","Tasks","More"]'&&await A.page.getByLabel('New customer').count()>0,JSON.stringify(tabs));
  await A.page.screenshot({path:'/tmp/app/e2e/02_home_agent.png'});
  // tap targets on bar
  const sizes=await A.page.evaluate(()=>[...document.querySelectorAll('[role=tab],[aria-label="New customer"]')].map(e=>{const r=e.getBoundingClientRect();return [e.getAttribute('aria-label'),Math.round(r.width),Math.round(r.height)]}));
  ok('every tab-bar control at least 44x44',sizes.every(s=>s[1]>=44&&s[2]>=44),JSON.stringify(sizes));
  // navigate tabs
  
  // ---- Phase 1: dashboard ----
  await A.page.getByText('Needs attention').waitFor({timeout:10000}); const ht=await txt(A.page);
  ok('Home shows hero and three tiles',/Active projects/.test(ht)&&/kW in pipeline/.test(ht)&&/Customers/.test(ht)&&/SLA breached/.test(ht)&&/Installed/.test(ht));
  ok('Home shows total 49 customers',/\b49\b/.test(ht));
  ok('Home has Needs attention rows, no R-codes',/Loans awaiting approval/.test(ht)&&/Field visits pending/.test(ht)&&(ht.match(/\bR\d{1,2}\b/g)||[]).length===0);
  ok('Home has no duplicate pipeline/report buttons',await A.page.getByRole('button',{name:'View pipeline'}).count()===0&&await A.page.getByRole('button',{name:'Reports'}).count()===0&&await A.page.getByLabel('New customer').count()===1);
  ok('Home asked for limit=500 once',A.st.calls.filter(c=>c.includes('limit=500')).length===1);
  await A.page.screenshot({path:'/tmp/app/e2e/07_home_data.png'});
  // ---- Phase 1: customers list ----
  await A.page.getByRole('tab',{name:'Customers'}).click(); await A.page.getByLabel('Search customers').waitFor({timeout:8000});
  await A.page.getByText('Anjali Devi').filter({visible:true}).first().waitFor({timeout:8000}); ok('Customers tab opens with list',true);
  const ct=await txt(A.page); ok('subtitle shows 45 projects, newest first',/45 projects · newest first/.test(ct));
  ok('segment chips carry counts (screen readers) and Stage chip exists',await A.page.locator('[aria-label="Under process, 45"],[aria-label="Completed, 3"],[aria-label="Cancelled, 1"],[aria-label="All, 49"]').count()===4&&await A.page.getByRole('button',{name:'Stage filter'}).count()===1);
  ok('first page asks segment=active limit=20',A.st.calls.some(c=>/customers\?page=1&limit=20&segment=active/.test(c)));
  ok('card shows status chip, place, next action',/Loan: Applied/.test(ct)&&/Pedana, Krishna/.test(ct)&&/Update loan decision/.test(ct));
  // pagination: scroll list to the bottom
  for(let i=0;i<6;i++){ await A.page.evaluate(()=>{document.querySelectorAll('div').forEach(d=>{if(d.scrollHeight>d.clientHeight+50&&getComputedStyle(d).overflowY!=='visible')d.scrollTop=d.scrollHeight;});}); await A.page.waitForTimeout(500); }
  ok('scrolling loads page 2',A.st.calls.some(c=>/customers\?page=2&limit=20/.test(c)));
  await A.page.screenshot({path:'/tmp/app/e2e/08_customers.png'});
  // search
  await A.page.getByLabel('Search customers').fill('Customer 07'); await A.page.waitForTimeout(1200);
  ok('search sends search param (debounced)',A.st.calls.some(c=>/customers\?page=1&limit=20&search=Customer\+07&segment=active/.test(c)));
  ok('search result shown, others hidden',(await txt(A.page)).includes('Customer 07')&&!(await txt(A.page)).includes('Anjali Devi'));
  await A.page.getByLabel('Search customers').fill('zzzz'); await A.page.getByText('No customers found').waitFor({timeout:8000}); ok('empty search shows No customers found',true);
  await A.page.getByLabel('Clear search').click(); await A.page.getByText('Anjali Devi').filter({visible:true}).first().waitFor({timeout:8000}); ok('clear search restores list',true);
  // segments
  await A.page.getByRole('button',{name:/^Completed/}).click(); await A.page.getByText('Project Complete').filter({visible:true}).first().waitFor({timeout:8000});
  ok('Completed segment sends segment=completed and shows 3',A.st.calls.some(c=>/segment=completed/.test(c))&&/3 projects/.test(await txt(A.page)));
  await A.page.getByRole('button',{name:/^All/}).click(); await A.page.waitForTimeout(800);
  ok('All segment omits segment param',A.st.calls.some(c=>/customers\?page=1&limit=20$/.test(c)));
  await A.page.getByRole('button',{name:/^Under process/}).click(); await A.page.getByText('Anjali Devi').filter({visible:true}).first().waitFor({timeout:8000});
  const chipSizes=await A.page.evaluate(()=>[...document.querySelectorAll('[aria-label="Under process, 45"],[aria-label="Completed, 3"],[aria-label="Cancelled, 1"],[aria-label="All, 49"]')].map(e=>Math.round(e.getBoundingClientRect().height)));
  ok('segment chips at least 44 tall',chipSizes.length===4&&chipSizes.every(h=>h>=44),JSON.stringify(chipSizes));
  // ---- Phase 1: customer screen ----
  await A.page.getByText('Anjali Devi').first().click(); await A.page.getByRole('tab',{name:'Overview'}).waitFor({timeout:8000});
  const dt=await txt(A.page); ok('customer screen shows name, project id, step chip',/Anjali Devi/.test(dt)&&/RCAL-1001/.test(dt)&&/Loan · step 3\/8/.test(dt));
  const tt=JSON.stringify((await A.page.locator('[role=tab]').allInnerTexts()).slice(-5)); ok('five tabs: Overview, Progress, Cash flow, Docs, Logs '+tt,tt==='["Overview","Progress","Cash flow","Docs","Logs"]');
  ok('bottom bar has WhatsApp and Update progress',await A.page.getByRole('button',{name:'WhatsApp',exact:true}).count()===1&&await A.page.getByRole('button',{name:'Update progress'}).count()===1);
  ok('Overview shows phone, size, agent, quotation in rupees',/9876510001/.test(dt)&&/3 kW/.test(dt)&&/Ravi Kumar/.test(dt)&&/₹3,25,000/.test(dt));
  ok('detail fetched /customers/c1',A.st.calls.includes('GET /customers/c1'));
  await A.page.screenshot({path:'/tmp/app/e2e/09_customer_overview.png'});
  await A.page.getByRole('tab',{name:'Progress'}).click(); await A.page.getByText('Loan Applied: Awaiting Decision').first().waitFor({timeout:8000});
  ok('Progress shows the website cards: Loan Applied awaiting decision with bank, amount',/Loan Applied: Awaiting Decision/.test(await txt(A.page))&&/SBI Machilipatnam/.test(await txt(A.page))&&/₹2,50,000/.test(await txt(A.page))&&/Lead & KYC Complete/.test(await txt(A.page))&&/PM Surya Ghar Registered/.test(await txt(A.page)));
  ok('Progress loaded deal and cash payments for the agent',A.st.calls.includes('GET /finance/deal-calculator/c1')&&A.st.calls.includes('GET /customers/c1/cash-payment'));
  await A.page.screenshot({path:'/tmp/app/e2e/10_customer_progress.png'});
  ok('only one Call button and no duplicate progress strip',await A.page.getByRole('button',{name:/^Call /}).count()===1);
  await A.page.getByRole('tab',{name:'Cash flow'}).click(); await A.page.getByText('No deal data yet').or(A.page.getByText('Cash Flow Steps')).first().waitFor({timeout:5000}); ok('Cash flow tab opens',true);
  await A.page.getByRole('tab',{name:'Docs'}).click(); await A.page.getByText('Documents',{exact:true}).first().waitFor({timeout:5000}); ok('Docs tab lists documents',true);
  const tabH=await A.page.evaluate(()=>[...document.querySelectorAll('[role=tab]')].filter(e=>['Overview','Progress','Cash flow','Docs','Logs'].includes(e.textContent.trim())).map(e=>Math.round(e.getBoundingClientRect().height)));
  ok('customer tabs at least 44 tall',tabH.length===5&&tabH.every(h=>h>=44),JSON.stringify(tabH));
  await A.page.getByLabel('Back').click(); await A.page.getByLabel('Search customers').waitFor({timeout:8000}); ok('Back returns to the customer list',true);
  // detail not found
  await A.page.goto(base+'/customer/c999'); await A.page.getByText(/not found/i).first().waitFor({timeout:15000}); ok('unknown customer shows an error with Try again',await A.page.getByRole('button',{name:'Try again'}).count()>0);
  await A.page.goto(base); await A.page.getByText('Good ',{exact:false}).filter({visible:true}).first().waitFor({timeout:15000});

  await A.page.getByRole('tab',{name:'Tasks'}).click(); await A.page.getByText('Customers waiting on the team').waitFor({timeout:8000}); ok('Tasks tab opens with work queue',true);
  await A.page.getByRole('tab',{name:'Home'}).click(); await A.page.getByLabel('New customer').last().waitFor({timeout:8000});
  await A.page.getByLabel('New customer').last().click(); await A.page.getByText('Step 1 of 3 · Customer').waitFor({timeout:8000}); ok('+ opens New customer step 1',true);
  await A.page.screenshot({path:'/tmp/app/e2e/03_newcustomer.png'});
  await A.page.getByRole('button',{name:'Close'}).first().click(); await A.page.getByRole('tab',{name:'More'}).waitFor({timeout:8000});
  await A.page.getByRole('tab',{name:'More'}).click(); await A.page.getByText('Open the website').waitFor({timeout:8000});
  ok('More shows profile and web-pages list',(await txt(A.page)).includes('EMP-101')&&(await txt(A.page)).includes('Loans'));
  ok('agent does NOT see Team / Control panel / Settings',!/Team|Control panel|System settings/.test((await txt(A.page)).split('Open the website')[1]||''));
  await A.page.getByRole('button',{name:'Check connection'}).click(); await A.page.getByText(/Connected \(\d+ ms\)/).waitFor({timeout:8000}); ok('Check connection reports Connected',true);
  await A.page.screenshot({path:'/tmp/app/e2e/04_more_agent.png',fullPage:false});
  A.page.once('dialog',d=>d.accept());
  await A.page.getByRole('button',{name:'Sign out'}).click(); await A.page.getByText('Sign in to continue').waitFor({timeout:8000});
  ok('sign out returns to sign-in',true); ok('sign out clears tokens',await A.page.evaluate(()=>!localStorage.getItem('rcal.refresh')&&!localStorage.getItem('rcal.access')));
  ok('sign out told the server',A.st.calls.includes('POST /auth/logout'));
  ok('no JS errors in whole flow',A.st.errors.filter(e=>!/401|404|Failed to load resource/.test(e)).length===0,A.st.errors.slice(0,2).join(' | '));
  await A.ctx.close();


  // 2 installer tabs
  let B=await newApp(); await login(B.page,'EMP-102','secret1'); await B.page.getByText('Good ',{exact:false}).filter({visible:true}).first().waitFor({timeout:15000});
  const tb=await B.page.locator('[role=tab]').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
  ok('installer tabs: Tasks first, then Home, More; no Customers; no + button',JSON.stringify(tb)==='["Tasks","Home","More"]'&&await B.page.getByLabel('New customer').count()===0,JSON.stringify(tb));
  await B.page.screenshot({path:'/tmp/app/e2e/05_home_installer.png'});
  await B.page.goto(base+'/customer/c1'); await B.page.getByText('Assigned as Installer').first().waitFor({timeout:15000});
  ok('installer sees Progress and Logs only (no Overview/Cash flow, no money)',JSON.stringify(await B.page.locator('[role=tab]').allInnerTexts())==='["Progress","Logs"]'&&!/₹/.test(await txt(B.page)));
  ok('installer has no action buttons on a customer',(await B.page.getByRole('button',{name:'Cancel customer',exact:true}).count())===0&&(await B.page.getByRole('button',{name:'Move to next step',exact:true}).count())===0&&(await B.page.getByText('Actions',{exact:true}).count())===0);
  await B.page.getByRole('tab',{name:'Logs'}).click(); await B.page.getByText('Status changed').first().waitFor({timeout:8000}); ok('installer Logs tab opens',true);
  await B.ctx.close();

  // 3 builder sees everything
  let C=await newApp(); await login(C.page,'emp-000','secret1'); await C.page.getByText('Good ',{exact:false}).filter({visible:true}).first().waitFor({timeout:15000});
  await C.page.getByRole('tab',{name:'More'}).click(); await C.page.getByText('Open the website').waitFor({timeout:8000});
  const bt=await txt(C.page); ok('builder (lowercase emp-000 accepted) sees the website row with more pages than an agent',/Open the website/.test(bt)&&/and \d+ more/.test(bt)); await C.ctx.close();

  // 4 session restore with valid token (no login screen)
  let D=await newApp({role:'EMP-101',tokens:{a:'A1',r:'R1'}}); await D.page.getByText('Good ',{exact:false}).filter({visible:true}).first().waitFor({timeout:15000});
  ok('restores session from stored tokens without login',true); ok('restore made no login call',!D.st.calls.includes('POST /auth/login')); await D.ctx.close();

  // 5 expired access token -> silent refresh
  let E=await newApp({role:'EMP-101',tokens:{a:'OLD',r:'R1'}}); await E.page.getByText('Good ',{exact:false}).filter({visible:true}).first().waitFor({timeout:15000});
  ok('expired access token refreshed silently',E.st.refreshes===1&&await E.page.evaluate(()=>localStorage.getItem('rcal.refresh')==='R2'),'refreshes='+E.st.refreshes); await E.ctx.close();

  // 6 refresh token rejected -> back to sign-in
  let F=await newApp({role:'EMP-101',tokens:{a:'OLD',r:'BAD'}}); await F.page.getByText('Sign in to continue').waitFor({timeout:15000});
  ok('rejected refresh token -> sign-in screen, tokens wiped',await F.page.evaluate(()=>!localStorage.getItem('rcal.refresh'))); await F.ctx.close();

  // 7 server down at start -> offline screen, still signed in, retry works
  let G=await newApp({role:'EMP-101',tokens:{a:'A1',r:'R1'},down:true}); await G.page.getByText("Can't reach the server").waitFor({timeout:40000});
  ok('server unreachable -> offline screen (not signed out)',await G.page.evaluate(()=>localStorage.getItem('rcal.refresh')==='R1'));
  await G.page.screenshot({path:'/tmp/app/e2e/06_offline.png'});
  G.st.down=false; await G.page.getByRole('button',{name:'Try again'}).click(); await G.page.getByText('Good ',{exact:false}).filter({visible:true}).first().waitFor({timeout:15000});
  ok('Try again recovers when server is back',true); await G.ctx.close();


  // ================= Phase 3: new customer, documents, cash flow (sales agent) =================
  const PNG='/tmp/app/e2e/01_signin.png';
  let P=await newApp(); await login(P.page,'EMP-101','secret1'); await P.page.getByText('Needs attention').waitFor({timeout:15000});
  const pb=(n)=>P.page.getByRole('button',{name:n,exact:true});
  await P.page.getByLabel('New customer').last().click(); await P.page.getByText('Step 1 of 3 · Customer').waitFor({timeout:8000}); ok('New customer opens on step 1 of 3',true);
  await pb('Next').click(); await P.page.getByText('Enter the customer name (at least 2 letters).').waitFor({timeout:5000});
  ok('step 1 checks name and phone on the phone',await P.page.getByText('Phone must be exactly 10 digits.').count()>0&&!P.st.bodies.some(b=>b.startsWith('POST /customers ')));
  await P.page.getByLabel('Customer name').fill('Lakshmi Prasad'); await P.page.getByLabel('Phone',{exact:true}).fill('9876510001');
  await P.page.getByText('Already a customer').waitFor({timeout:8000}); ok('duplicate phone found (Anjali Devi)',await P.page.getByText(/Anjali Devi · RCAL-1001 has this phone number/).count()>0);
  ok('Next is blocked while the phone is a duplicate',await pb('Next').isDisabled());
  await P.page.screenshot({path:'/tmp/app/e2e/20_new_dup.png'});
  await P.page.getByLabel('Phone',{exact:true}).fill('+91 98765 99887'); ok('pasted +91 number keeps the 10 digits',await P.page.getByLabel('Phone',{exact:true}).inputValue()==='9876599887');
  await P.page.waitForTimeout(600); ok('duplicate warning clears for a new number',await P.page.getByText('Already a customer').count()===0);
  await pb('Next').click(); await P.page.getByText('Step 2 of 3 · Site & system').waitFor({timeout:5000});
  await pb('Next').click(); await P.page.getByText('Enter the village or city.').waitFor({timeout:5000}); ok('step 2 needs village or city',true);
  await P.page.getByLabel('Village').fill('Pedana'); await P.page.getByLabel('System size in kW (optional)').fill('3');
  await P.page.getByRole('radio',{name:'RCC Flat'}).click(); await P.page.getByRole('radio',{name:'Referral'}).click(); await pb('Next').click();
  await P.page.getByText('Enter who referred this customer.').waitFor({timeout:5000}); ok('referral needs referrer name and phone',true);
  await P.page.getByLabel('Referred by').fill('Ramesh'); await P.page.getByLabel('Referrer phone').fill('9123456780');
  await P.page.screenshot({path:'/tmp/app/e2e/21_new_step2.png'});
  await pb('Next').click(); await P.page.getByText('Check before saving').waitFor({timeout:5000});
  ok('review shows the entered values',/Lakshmi Prasad/.test(await txt(P.page))&&/3 kW/.test(await txt(P.page))&&/Ramesh · 9123456780/.test(await txt(P.page)));
  await P.page.screenshot({path:'/tmp/app/e2e/22_new_review.png'});
  await pb('Create customer').dblclick(); await P.page.getByText('Customer created. Complete KYC next.').waitFor({timeout:10000});
  const created=P.st.bodies.filter(b=>b.startsWith('POST /customers '));
  ok('double tap creates exactly one customer',created.length===1,String(created.length));
  const cb=JSON.parse(created[0].slice('POST /customers '.length));
  ok('create body matches the server rules',cb.name==='Lakshmi Prasad'&&cb.phone==='9876599887'&&cb.whatsapp==='9876599887'&&cb.system_kw===3&&cb.city==='Pedana'&&cb.lead_source==='referral'&&cb.referrer_phone==='9123456780'&&cb.roof_type==='RCC Flat');
  ok('after create the customer opens on Progress with KYC card',/Complete KYC/.test(await txt(P.page)));
  await P.page.getByRole('tab',{name:'Docs'}).click();
  await P.page.getByText('0 of 8').waitFor({timeout:8000}); ok('Docs lists 8 document slots, all missing',(await P.page.getByText('Missing',{exact:true}).count())===8);
  // upload Aadhaar through the gallery
  await pb('Add Aadhaar').click(); await P.page.getByRole('button',{name:'Choose from gallery'}).waitFor({timeout:5000});
  ok('source sheet offers camera first, gallery, PDF',(await P.page.getByRole('button',{name:'Take photo'}).count())===1&&(await P.page.getByRole('button',{name:'Pick a PDF or file'}).count())===1);
  await P.page.screenshot({path:'/tmp/app/e2e/23_source_sheet.png'});
  const [fc]=await Promise.all([P.page.waitForEvent('filechooser',{timeout:8000}),P.page.getByRole('button',{name:'Choose from gallery'}).click()]);
  await fc.setFiles(PNG); await P.page.getByText('Aadhaar uploaded.').first().waitFor({timeout:10000});
  ok('upload sent customer_id, doc_type=aadhaar and the file',P.st.bodies.some(b=>/^UPLOAD doc c50 aadhaar file=true$/.test(b)),P.st.bodies.filter(b=>b.startsWith('UPLOAD')).join('|'));
  await P.page.getByText('1 of 8').waitFor({timeout:8000}); ok('Aadhaar now shows Uploaded with View and Replace',await pb('Replace Aadhaar').count()===1);
  await P.page.screenshot({path:'/tmp/app/e2e/24_docs.png'});
  // field visit + edit
  await P.page.getByRole('tab',{name:'Overview'}).click(); await pb('Mark done').waitFor({timeout:8000}); await pb('Mark done').click(); await pb('Mark done').last().click();
  await P.page.getByText('Field visit marked done.').waitFor({timeout:8000});
  ok('field visit sends field_visit_done=true with who and when',P.st.bodies.some(b=>/PATCH \/customers\/c50 .*"field_visit_done":true.*"field_visit_by_name":"Ravi Kumar"/.test(b)));
  await P.page.getByLabel('More actions').click(); await P.page.getByRole('button',{name:'Edit customer',exact:true}).click(); await P.page.getByText('Edit customer').first().waitFor({timeout:8000});
  await P.page.getByLabel('Mandal').fill('Machilipatnam'); await pb('Save changes').click(); await P.page.getByRole('tab',{name:'Overview'}).waitFor({timeout:8000});
  const eb=P.st.bodies.filter(b=>b.startsWith('PATCH /customers/c50 ')).pop();
  ok('edit sends only the changed field',eb==='PATCH /customers/c50 {"mandal":"Machilipatnam"}',eb);
  // cash customer: cash flow tab and instalments from Progress
  const c5=P.st.custs.find(x=>x.id==='c5'); c5.status='pmsg_registered'; P.st.deals.c5={payment_method:'cash',quotation_value:300000,deal_price:300000,project_cost:250000,subsidy_total:78000};
  await P.page.goto(base+'/customer/c5?tab=Cash%20flow'); await P.page.getByText('Cash Flow Steps').waitFor({timeout:15000});
  const cft=await txt(P.page); ok('cash flow shows quotation ₹3,00,000 and subsidy ₹78,000',/₹3,00,000/.test(cft)&&/₹78,000/.test(cft),cft.slice(0,300));
  await P.page.screenshot({path:'/tmp/app/e2e/25_cash.png'});
  await pb('Received').click(); ok('Received filter works',true); await pb('All steps').click();
  await P.page.getByRole('tab',{name:'Progress'}).click(); await P.page.getByText('Enter Payment Particulars').waitFor({timeout:8000});
  await pb('Record Payment Received').click(); await P.page.getByText('Enter a valid amount').waitFor({timeout:5000}); ok('empty amount blocked on the phone',!P.st.bodies.some(b=>b.includes('cash-payment')));
  await P.page.getByLabel('Amount Received (₹) *').fill('150000'); await P.page.getByText(/One lakh fifty thousand/i).waitFor({timeout:3000}); ok('amount shown in words under the field',true);
  await pb('Record Payment Received').click(); await P.page.getByText(/Instalment 1 recorded/).first().waitFor({timeout:8000});
  ok('cash payment body {installment:1, amount:150000}',P.st.bodies.includes('POST /customers/c5/cash-payment {"installment":1,"amount":150000,"notes":""}'));
  await P.page.getByText('Cash Collection').first().waitFor({timeout:8000}); ok('card changes to final payment after reload',await pb('Record Final Payment').count()===1&&/Balance due: ₹1,50,000/.test(await txt(P.page)));
  await P.page.getByLabel('Final payment (₹)').fill('150000'); await pb('Record Final Payment').click(); await P.page.getByText(/Instalment 2 recorded|fully received/).first().waitFor({timeout:8000}); ok('final payment recorded',true);
  await P.page.getByText('Start Installation').first().waitFor({timeout:8000}); ok('after full cash the Start Installation card appears (agent role note)',/Your role cannot do this step/.test(await txt(P.page)));
  await P.page.screenshot({path:'/tmp/app/e2e/25b_cash_progress.png'});
  // Tasks + loan tracker
  await P.page.goto(base); await P.page.getByText('Needs attention').waitFor({timeout:15000});
  await P.page.getByRole('tab',{name:'Tasks'}).click(); await P.page.getByText('Customers waiting on the team').waitFor({timeout:8000});
  ok('Tasks groups customers by next action',/Field visit pending|Complete KYC|Update loan decision/.test(await txt(P.page))&&(await P.page.getByText('Under development').count())===0);
  await P.page.screenshot({path:'/tmp/app/e2e/26_tasks_agent.png'});
  await P.page.getByRole('tab',{name:'More'}).click(); await P.page.getByText('Trackers').waitFor({timeout:8000});
  ok('agent More shows Loan tracker',await P.page.getByRole('button',{name:'Loan tracker'}).count()===1);
  await P.page.getByRole('button',{name:'Loan tracker'}).click(); await P.page.getByText('Past SLA',{exact:true}).waitFor({timeout:8000});
  const lt=await txt(P.page); ok('loan tracker tiles: 1 past SLA, 1 in review, 1 disbursed',/Past SLA\s*1/.test(lt)&&/In review\s*1/.test(lt)&&/Disbursed\s*1/.test(lt),lt.slice(0,200));
  ok('overdue loan first with Day 18 of 7 and Escalation L2',lt.indexOf('Anjali Devi')<lt.indexOf('Customer 05')&&/Day 18 of 7/.test(lt)&&/Escalation L2/.test(lt));
  await P.page.screenshot({path:'/tmp/app/e2e/27_loans.png'});
  await pb('SBI').click(); ok('bank chip filters to SBI loans',!(await txt(P.page)).includes('Anjali Devi')); await pb('SBI').click();
  await pb('Escalate').first().click(); await pb('Escalate').last().click(); await P.page.getByText('Write at least 3 characters.').waitFor({timeout:5000});
  await P.page.getByLabel('Reason').fill('abcd'); await pb('Escalate').last().click(); await P.page.getByText('Write at least 5 characters.').waitFor({timeout:5000});
  ok('escalate reason must be 5+ characters, no request sent',!P.st.bodies.some(b=>b.startsWith('ESCALATE')));
  await P.page.getByLabel('Reason').fill('Bank not responding for 11 days'); await pb('Escalate').last().click(); await P.page.getByText(/Escalated: L3/).waitFor({timeout:8000});
  ok('escalate body has the reason',P.st.bodies.includes('ESCALATE l1 {"reason":"Bank not responding for 11 days"}'));
  ok('no JS errors in Phase 3–5 agent flow',P.st.errors.filter(e=>!/401|403|400|404|422|Failed to load resource/.test(e)).length===0,P.st.errors.slice(0,2).join(' | '));
  await P.ctx.close();


  // ================= Website parity: customer page =================
  const PNG2='/tmp/app/e2e/01_signin.png';
  const rb=(p,n)=>p.getByRole('button',{name:n,exact:true});
  let Q=await newApp(); await login(Q.page,'EMP-101','secret1'); await Q.page.getByText('Needs attention').waitFor({timeout:15000});
  await Q.page.goto(base+'/customer/c1'); await Q.page.getByText('Customer Details').waitFor({timeout:15000});
  const ov=await txt(Q.page);
  ok('Overview has Customer Details, Field Visit, Last Activity, Notes',/Customer Details/.test(ov)&&/Field Visit/.test(ov)&&/Last Activity/.test(ov)&&/Notes/.test(ov));
  ok('Overview shows Aadhaar/PAN/Bill/DISCOM/Roof/Payment/Quotation labels',['Aadhaar','PAN','Electricity Bill No.','DISCOM','Roof','Payment','Quotation','Lead Source','Agent','Full Address'].every(l=>ov.includes(l)));
  ok('Next Action card lists the Progress step',/Next Action/.test(ov)&&/Loan Applied: Awaiting Decision/.test(ov));
  await Q.page.getByText(/Status changed/).first().waitFor({timeout:8000}); ok('Last Activity shows audit rows',true);
  await Q.page.getByLabel('Add a note (replaces the current note)').fill('  Call after 5pm  '); await rb(Q.page,'Save Note').click(); await Q.page.getByText('Note saved.').waitFor({timeout:8000});
  ok('note saved via PATCH notes (trimmed)',Q.st.bodies.includes('PATCH /customers/c1 {"notes":"Call after 5pm"}'));
  await rb(Q.page,'Save Note').click(); await Q.page.getByText('Please type a note first').waitFor({timeout:5000}); ok('empty note blocked',true);
  await Q.page.screenshot({path:'/tmp/app/e2e/30_overview_parity.png',fullPage:true});
  await Q.page.getByLabel('More actions').click();
  const mi=await Q.page.locator('[role=button]').evaluateAll(els=>els.map(e=>e.getAttribute('aria-label')));
  ok('agent menu: Edit, KYC, Deal, Cancel; no Assign agent / Move back',['Edit customer','KYC & project details','Deal calculator','Cancel customer'].every(x=>mi.includes(x))&&!mi.includes('Assign agent')&&!mi.includes('Move back'),JSON.stringify(mi));
  await Q.page.getByLabel('Close menu').click({position:{x:5,y:600}});
  // loan decision -> scenario -> disbursal
  await Q.page.getByRole('tab',{name:'Progress'}).click(); await Q.page.getByText('Loan Applied: Awaiting Decision').first().waitFor({timeout:8000});
  await rb(Q.page,'Loan Sanctioned').click(); await Q.page.getByText('Confirm 10% Contribution Scenario').waitFor({timeout:8000});
  ok('Loan Sanctioned sends status loan_sanctioned',Q.st.bodies.includes('PATCH /customers/c1/status {"status":"loan_sanctioned"}'));
    ok('three scenarios offered, C preselected',await Q.page.getByRole('radio').count()===3&&await Q.page.getByRole('radio',{name:/Scenario C/,checked:true}).count()===1);
  await rb(Q.page,'Confirm Scenario').click(); await Q.page.getByText('Confirm 1st Disbursal').waitFor({timeout:8000});
  ok('scenario saved with {scenario:C}',Q.st.bodies.includes('PATCH /finance/deal-calculator/c1/confirm-scenario {"scenario":"C"}'));
  await rb(Q.page,'Confirm Disbursal').click(); await Q.page.getByText('Please enter disbursed amount').waitFor({timeout:5000}); ok('empty disbursal blocked',true);
  await Q.page.getByLabel('Disbursed Amount (₹) *').fill('250000'); await Q.page.getByText(/Two lakh fifty thousand/i).waitFor({timeout:3000});
  await rb(Q.page,'Confirm Disbursal').click(); await Q.page.getByText('Start Installation Process').first().waitFor({timeout:8000});
  ok('disbursal patches customer then status disbursed_full',Q.st.bodies.includes('PATCH /customers/c1 {"amount_disbursed":250000,"loan_sanctioned":true}')&&Q.st.bodies.includes('PATCH /customers/c1/status {"status":"disbursed_full"}'));
  ok('agent cannot start installation: button disabled with role note',await rb(Q.page,'Start Installation Process').isDisabled()&&/Your role cannot do this step/.test(await txt(Q.page)));
  await Q.page.screenshot({path:'/tmp/app/e2e/31_disbursal.png',fullPage:true});
  // loan rejection with reason
  Q.st.custs.find(x=>x.id==='c8').status='loan_applied';
  await Q.page.goto(base+'/customer/c8?tab=Progress'); await rb(Q.page,'Rejected').waitFor({timeout:15000}); await rb(Q.page,'Rejected').click();
  await Q.page.getByRole('heading',{name:'Loan Rejected'}).waitFor({timeout:5000}); await rb(Q.page,'Confirm Rejection').click(); await Q.page.getByText(/Write at least|required/i).first().waitFor({timeout:5000});
  ok('rejection needs a reason, nothing sent',!Q.st.bodies.some(b=>b.includes('loan_rejection_reason')));
  await Q.page.getByLabel('Rejection Reason').fill('Low CIBIL'); await rb(Q.page,'Confirm Rejection').click(); await Q.page.getByText('Reason: Low CIBIL').waitFor({timeout:8000});
  ok('rejection sends reason then loan_rejected',Q.st.bodies.includes('PATCH /customers/c8 {"loan_rejection_reason":"Low CIBIL"}')&&Q.st.bodies.includes('PATCH /customers/c8/status {"status":"loan_rejected"}'));
  // apply loan
  Q.st.custs.find(x=>x.id==='c9').status='loan_ready';
  await Q.page.goto(base+'/customer/c9?tab=Progress'); await rb(Q.page,'Submit Loan Application').waitFor({timeout:15000});
  await rb(Q.page,'Submit Loan Application').click(); await Q.page.getByText('Bank name is required').waitFor({timeout:5000});
  await Q.page.getByLabel('Bank Name *').fill('Indian Bank'); await Q.page.getByLabel('IFSC Code').fill('idib000t138'); await rb(Q.page,'Submit Loan Application').click(); await Q.page.getByText('Loan amount is required').waitFor({timeout:5000});
  await Q.page.getByLabel('Loan Amount (₹) *').fill('200000'); await rb(Q.page,'Submit Loan Application').click(); await Q.page.getByText('Loan Applied: Awaiting Decision').first().waitFor({timeout:8000});
  ok('apply loan saves bank, IFSC upper-case, amount then loan_applied',Q.st.bodies.some(b=>b.startsWith('PATCH /customers/c9 ')&&b.includes('"loan_bank":"Indian Bank"')&&b.includes('"loan_ifsc":"IDIB000T138"')&&b.includes('"loan_amount":200000'))&&Q.st.bodies.includes('PATCH /customers/c9/status {"status":"loan_applied"}'));
  // KYC form
  await Q.page.goto(base+'/kyc/c7'); await rb(Q.page,'Save KYC').waitFor({timeout:15000});
  await rb(Q.page,'Save KYC').click(); await Q.page.getByText('Aadhaar must be 12 digits').waitFor({timeout:5000});
  ok('KYC checks Aadhaar and PAN before sending',await Q.page.getByText('PAN must be in format ABCDE1234F').count()>0&&!Q.st.bodies.some(b=>b.startsWith('PATCH /customers/c7 ')));
  await Q.page.getByLabel(/^Aadhaar/).fill('123412341234'); await Q.page.getByLabel('PAN *').fill('abcde1234f'); await Q.page.getByLabel('IFSC').fill('SBIN0001234');
  await Q.page.screenshot({path:'/tmp/app/e2e/32_kyc.png',fullPage:true});
  await rb(Q.page,'Save KYC').click(); await Q.page.waitForTimeout(1500);
  ok('KYC saves Aadhaar digits, PAN upper-case and field fields',Q.st.bodies.some(b=>b.startsWith('PATCH /customers/c7 ')&&b.includes('"pan":"ABCDE1234F"')&&b.includes('"aadhaar":"123412341234"')));
  // deal calculator as agent: read only
  await Q.page.goto(base+'/deal/c9'); await Q.page.getByText('Only admin and finance can save a deal').waitFor({timeout:15000}); ok('agent sees deal calculator read-only (no Save)',await rb(Q.page,'Save to Customer').count()===0);
  ok('no JS errors in agent parity flow',Q.st.errors.filter(e=>!/401|403|400|404|422|Failed to load resource/.test(e)).length===0,Q.st.errors.slice(0,2).join(' | '));
  await Q.ctx.close();

  // manager: installation -> net meter -> subsidy -> referral -> complete (c1 continues from disbursed_full)
  let M2=await newApp(); await login(M2.page,'EMP-103','secret1'); await M2.page.getByText('Needs attention').waitFor({timeout:15000});
  M2.st.custs.find(x=>x.id==='c1').status='disbursed_full'; M2.st.custs.find(x=>x.id==='c1').amount_disbursed=250000; M2.st.deals.c1={scenario_confirmed_at:'2026-11-19T00:00:00Z',contribution_scenario:'C'};
  await M2.page.goto(base+'/customer/c1?tab=Progress'); await rb(M2.page,'Start Installation Process').waitFor({timeout:15000});
  await rb(M2.page,'Start Installation Process').click(); await M2.page.getByText('Assign Installer').first().waitFor({timeout:8000});
  ok('start installation sends {action:start}',M2.st.bodies.includes('PATCH /customers/c1/installation {"action":"start"}'));
  await M2.page.getByRole('radio',{name:/Suresh Rao/}).click(); await rb(M2.page,'Assign').click(); await M2.page.getByText('Installer assigned.').waitFor({timeout:8000});
  ok('assign sends installer id',M2.st.bodies.includes('PATCH /customers/c1/installation {"action":"assign","installer_id":"u-inst"}'));
  await M2.page.getByLabel('Installation date').fill('2030-01-15'); await rb(M2.page,'Confirm').click(); await M2.page.getByText(/Installation scheduled for/).waitFor({timeout:8000});
  ok('schedule sends date',M2.st.bodies.includes('PATCH /customers/c1/installation {"action":"schedule","date":"2030-01-15"}'));
  const LB=['before_install','mount_frame','panels_array','inverter_mount','dc_wiring','ac_wiring','meter_board','team_customer'];
  M2.st.photos.c1=LB.map((l,i)=>({label:l,file_url:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',approval_status:i<2?'pending':'approved'}));
  await M2.page.reload(); await rb(M2.page,'Approve').first().waitFor({timeout:15000});
  ok('photo grid: 8 slots, View on each, Approve/Reject on pending ones',await rb(M2.page,'View').count()===8&&await rb(M2.page,'Approve').count()===2&&await rb(M2.page,'Reject').count()===2);
  await M2.page.screenshot({path:'/tmp/app/e2e/33_photos.png',fullPage:true});
  await rb(M2.page,'Approve').first().click(); await M2.page.getByText('Photo approved').waitFor({timeout:8000});
  ok('approve sends label and action',M2.st.bodies.includes('PATCH /customers/c1/installation/photos/approve {"label":"before_install","action":"approved","note":null}'));
  await rb(M2.page,'Reject').first().click(); await M2.page.getByLabel('Reason').fill('Blurry'); await rb(M2.page,'Reject').last().click(); await M2.page.getByText('Photo rejected').waitFor({timeout:8000});
  ok('reject sends note',M2.st.bodies.includes('PATCH /customers/c1/installation/photos/approve {"label":"mount_frame","action":"rejected","note":"Blurry"}'));
  ok('complete is locked until all photos are approved',/need approval|approve all|Upload and approve/i.test(await txt(M2.page))&&await rb(M2.page,'Mark Installation Complete').count()===0);
  M2.st.photos.c1.forEach(p=>p.approval_status='approved'); await M2.page.reload(); await rb(M2.page,'Mark Installation Complete').waitFor({timeout:15000});
  await rb(M2.page,'Mark Installation Complete').click(); await rb(M2.page,'Mark complete').click(); await rb(M2.page,'Apply for Net Metering').waitFor({timeout:10000});
  ok('installation complete sent',M2.st.bodies.includes('PATCH /customers/c1/installation {"action":"complete"}'));
  await rb(M2.page,'Apply for Net Metering').click(); await M2.page.getByText('Submit Documents to DISCOM').waitFor({timeout:8000});
  await rb(M2.page,'Record').click(); await M2.page.getByText('Please select the document submission date').waitFor({timeout:5000});
  await M2.page.getByLabel('Submission date').fill('2026-11-19'); await rb(M2.page,'Record').click(); await rb(M2.page,'Mark Approved').waitFor({timeout:8000});
  await rb(M2.page,'Mark Approved').click(); await M2.page.getByText('DISCOM Approved').waitFor({timeout:8000});
  ok('net meter: submitted date then approved',M2.st.bodies.includes('PATCH /customers/c1/netmeter {"action":"submitted","submission_date":"2026-11-19"}')&&M2.st.bodies.includes('PATCH /customers/c1/netmeter {"action":"approved"}'));
  const [fcn]=await Promise.all([M2.page.waitForEvent('filechooser',{timeout:8000}),rb(M2.page,'Files').click()]); await fcn.setFiles(PNG2);
  await rb(M2.page,'View Photo').waitFor({timeout:10000}); ok('net meter photo uploaded',M2.st.bodies.includes('UPLOAD photo c1 net_meter'));
  await rb(M2.page,'Approve').click(); await rb(M2.page,'Mark Installed').waitFor({timeout:8000});
  await rb(M2.page,'Mark Installed').click(); await M2.page.getByText('Install Solar Monitoring App on Consumer Device').first().waitFor({timeout:8000});
  ok('Proceed to Subsidy blocked until the app is installed',await rb(M2.page,'Proceed to Subsidy').isDisabled());
  await M2.page.getByRole('button',{name:/Mark (Solar Monitoring )?App Installed/}).first().click(); await M2.page.waitForTimeout(1200); await rb(M2.page,'Proceed to Subsidy').click(); await M2.page.getByText('Subsidy Awaited').waitFor({timeout:8000});
  await rb(M2.page,'Mark Subsidy Credited').click(); await rb(M2.page,'Yes').click(); await M2.page.getByText('Referral Stage 1 Commission').waitFor({timeout:10000});
  ok('subsidy credited sent',M2.st.bodies.includes('PATCH /customers/c1/subsidy {"credited":true}'));
  await M2.page.waitForTimeout(1500); await M2.page.getByLabel('Stage 1 amount (₹)').fill('5000'); await rb(M2.page,'Pay S1').click(); await M2.page.getByText('Referral Stage 2 Commission').waitFor({timeout:8000}).catch(async e=>{console.log('DBG',M2.st.bodies.slice(-3),(await txt(M2.page)).slice(-900)); throw e;});
  await M2.page.getByLabel('Stage 2 amount (₹)').fill('5000'); await rb(M2.page,'Pay S2').click(); await rb(M2.page,'Mark Project Complete').waitFor({timeout:8000});
  ok('both referral stages recorded',M2.st.bodies.filter(b=>b.startsWith('PATCH /customers/c1/referral ')).length===2);
  await M2.page.screenshot({path:'/tmp/app/e2e/34_ready_complete.png',fullPage:true});
  await rb(M2.page,'Mark Project Complete').click(); await M2.page.getByText(/successfully completed/).waitFor({timeout:8000});
  ok('project completes (trophy view)',/successfully completed/.test(await txt(M2.page)));
  ok('no JS errors in manager parity flow',M2.st.errors.filter(e=>!/401|403|400|404|422|Failed to load resource/.test(e)).length===0,M2.st.errors.slice(0,2).join(' | '));
  await M2.ctx.close();

  // admin: deal calculator save, docs verify, logs filter, assign agent
  let AD=await newApp(); await login(AD.page,'EMP-104','secret1'); await AD.page.getByText('Needs attention').waitFor({timeout:15000});
  await AD.page.goto(base+'/deal/c9'); await rb(AD.page,'Save to Customer').waitFor({timeout:15000});
  await rb(AD.page,'Save to Customer').click(); await AD.page.getByText('Quotation value and project cost are required').waitFor({timeout:5000});
  await AD.page.getByLabel('Customer agreed price (₹)').fill('300000'); await AD.page.getByLabel('Project cost (₹)').fill('250000');
  ok('quotation follows the agreed price until typed',(await AD.page.getByLabel('Quotation value (₹)').inputValue())!=='');
  await AD.page.screenshot({path:'/tmp/app/e2e/35_deal.png',fullPage:true});
  await rb(AD.page,'Save to Customer').click(); await AD.page.waitForTimeout(1200);
  ok('deal saved with method and prices',AD.st.bodies.some(b=>b.startsWith('DEAL c9 ')&&b.includes('"payment_method":"loan"')&&b.includes('"project_cost":250000')));
  AD.st.docs.c9=[{id:'dx1',doc_type:'aadhaar',status:'uploaded',has_file:true,mime_type:'image/png'},{id:'dx2',doc_type:'pan',status:'uploaded',has_file:true,mime_type:'image/png'}];
  await AD.page.goto(base+'/customer/c9?tab=Docs'); await rb(AD.page,'Verify Aadhaar').waitFor({timeout:15000});
  ok('docs show uploaded/verified counts',/2 of 8 uploaded/.test(await txt(AD.page))&&/0 verified/.test(await txt(AD.page)));
  await rb(AD.page,'Verify Aadhaar').click(); await AD.page.getByText(/1 verified/).waitFor({timeout:8000}); ok('verify sends {status:verified}',AD.st.bodies.includes('PATCH /documents/dx1/verify {"status":"verified"}'));
  await rb(AD.page,'Fail PAN card').click(); await AD.page.waitForTimeout(800); ok('fail sends {status:failed}',AD.st.bodies.includes('PATCH /documents/dx2/verify {"status":"failed"}'));
  await AD.page.getByRole('tab',{name:'Logs'}).click(); await AD.page.getByText('3 entries').waitFor({timeout:8000});
  ok('logs: category chips, blocked entry flagged',await AD.page.getByRole('button',{name:'Status Change'}).count()===1&&/Role cannot edit this field/.test(await txt(AD.page)));
  await AD.page.getByRole('button',{name:'Customer Edit'}).click(); await AD.page.getByText('1 entry').waitFor({timeout:5000}); ok('filtering by category narrows the list',/phone/.test(await txt(AD.page))&&!/Blocked edit/.test(await txt(AD.page)));
  await AD.page.screenshot({path:'/tmp/app/e2e/36_logs.png',fullPage:true});
  await AD.page.getByLabel('More actions').click(); await rb(AD.page,'Assign agent').click(); await AD.page.getByRole('radio',{name:/Priya Nair/}).click(); await rb(AD.page,'Save assignment').click(); await AD.page.getByText('Team assignment saved.').waitFor({timeout:8000});
  ok('assign agent patches assigned_agent',AD.st.bodies.includes('PATCH /customers/c9 {"assigned_agent":"u-mgr"}'));
  ok('no JS errors in admin parity flow',AD.st.errors.filter(e=>!/401|403|400|404|422|Failed to load resource/.test(e)).length===0,AD.st.errors.slice(0,2).join(' | '));
  await AD.ctx.close();

  // installer: own jobs home and progress view
  let IN=await newApp(); await login(IN.page,'EMP-102','secret1'); await IN.page.getByText('Your open jobs').waitFor({timeout:15000});
  const ih=await txt(IN.page); ok('installer Home shows only own jobs (no company numbers, no ₹)',/Your open jobs/.test(ih)&&!/Active projects|kW in pipeline|SLA breached/.test(ih)&&!/₹/.test(ih));
  await IN.page.screenshot({path:'/tmp/app/e2e/37_installer_home.png'});
  await IN.page.goto(base+'/customer/c3'); await IN.page.getByText('Upload Photos').first().waitFor({timeout:15000});
  ok('installer progress: assigned banner, 8 slots, no money',/Assigned Installer/.test(await txt(IN.page))&&!/₹/.test(await txt(IN.page)));
  const [fci]=await Promise.all([IN.page.waitForEvent('filechooser',{timeout:8000}),rb(IN.page,'Files').first().click()]); await fci.setFiles(PNG2);
  await IN.page.getByText(/Before Install uploaded/).first().waitFor({timeout:10000}); ok('installer uploads a site photo (label before_install)',IN.st.bodies.includes('UPLOAD photo c3 before_install'));
  ok('installer cannot complete until all 8 photos',/Upload all 8 photos to complete/.test(await txt(IN.page))&&await rb(IN.page,'Mark Installation Complete').count()===0);
  await IN.page.screenshot({path:'/tmp/app/e2e/38_installer_progress.png',fullPage:true});
  ok('no JS errors in installer parity flow',IN.st.errors.filter(e=>!/401|403|400|404|422|Failed to load resource/.test(e)).length===0,IN.st.errors.slice(0,2).join(' | '));
  await IN.ctx.close();
  // 8 desktop-width sanity (no overflow)
  let H=await newApp({vp:{width:1280,height:800}}); await H.page.getByLabel('Email or employee ID').waitFor({timeout:15000});
  ok('sign-in renders at desktop width without horizontal overflow',await H.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)); await H.ctx.close();

  const bad=results.filter(r=>!r[0]); console.log('\n'+(results.length-bad.length)+'/'+results.length+' passed'); await browser.close(); srv.close(); process.exit(bad.length?1:0);
})().catch(e=>{console.error('HARNESS ERROR',e);process.exit(2)});
