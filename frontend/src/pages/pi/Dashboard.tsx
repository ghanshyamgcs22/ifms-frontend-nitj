// pages/pi/PIDashboard.tsx — WITH REJECTED REQUESTS + FILE NUMBER + VIEW FILE

import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import {
  Loader2, PlusCircle, ChevronDown, ChevronUp,
  CheckCircle2, XCircle, Clock, BookOpen, Wallet,
  AlertCircle, Search, MessageSquare, IndianRupee,
  ArrowRight, FileText, Bell, Building2, Calendar,
  Layers, TrendingUp, BarChart3, ShieldCheck,
  AlertTriangle, Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface QueryInfo { query: string; raisedBy: string; raisedByLabel: string; raisedAt: string; raisedStage: string; resolved: boolean; piResponse?: string; }
interface BudgetRequest {
  id: string; requestNumber?: string; gpNumber: string; purpose: string;
  amount: number; actualExpenditure: number; status: string; currentStage: string;
  createdAt: string; headName?: string; invoiceNumber?: string;
  hasOpenQuery?: boolean; latestQuery?: QueryInfo; piResponse?: string;
  fileNumber?: string;
  rejectedBy?: string; rejectedAtStage?: string; rejectedAtStageLabel?: string;
  rejectionRemarks?: string; rejectedAt?: string;
  quotationFile?: string; quotationFileName?: string;
}
interface Project {
  id: string; gpNumber: string; projectName: string; department: string;
  projectStartDate: string; projectEndDate: string; totalSanctionedAmount: number;
  totalReleasedAmount: number; amountBookedByPI: number; actualExpenditure: number;
  expenditureComplete: boolean; approvedRequestCount: number;
  filledExpenditureCount: number; availableBalance: number; status: string;
}

const API = import.meta.env.VITE_API_URL;
const PI_EMAIL="pi@ifms.edu";
const PI_NAME="Dr. Suresh Patel";
const PI_DEPT="Research & Development";

const fmtINR=(n:number)=>"₹"+parseFloat(String(n||0)).toLocaleString("en-IN",{maximumFractionDigits:0});
const fmtINRFull=(n:number)=>{const v=parseFloat(String(n||0));if(v>=10000000)return`₹${(v/10000000).toFixed(2)} Cr`;if(v>=100000)return`₹${(v/100000).toFixed(2)} L`;return"₹"+v.toLocaleString("en-IN");};
const fmtDate=(d:string)=>d?new Date(d).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}):"—";

const stageConfig:Record<string,{label:string;dot:string;bg:string;text:string;border:string}>={
  da:{label:"Pending at DA",dot:"bg-sky-500",bg:"bg-sky-50",text:"text-sky-700",border:"border-sky-200"},
  ar:{label:"Pending at AR",dot:"bg-indigo-500",bg:"bg-indigo-50",text:"text-indigo-700",border:"border-indigo-200"},
  dr:{label:"Pending at DR",dot:"bg-violet-500",bg:"bg-violet-50",text:"text-violet-700",border:"border-violet-200"},
  drc_office:{label:"Pending at DRC Office",dot:"bg-blue-500",bg:"bg-blue-50",text:"text-blue-700",border:"border-blue-200"},
  drc_rc:{label:"Pending at DRC (R&C)",dot:"bg-purple-500",bg:"bg-purple-50",text:"text-purple-700",border:"border-purple-200"},
  drc:{label:"Pending at DRC",dot:"bg-fuchsia-500",bg:"bg-fuchsia-50",text:"text-fuchsia-700",border:"border-fuchsia-200"},
  director:{label:"Pending at Director",dot:"bg-rose-500",bg:"bg-rose-50",text:"text-rose-700",border:"border-rose-200"},
};

const StatusBadge=({status,stage,hasOpenQuery}:{status:string;stage:string;hasOpenQuery?:boolean})=>{
  if(hasOpenQuery)return(<span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-300 px-2.5 py-1 rounded"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0"/>Query Raised</span>);
  if(status==="approved")return(<span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded"><CheckCircle2 className="h-3 w-3 shrink-0"/>Approved</span>);
  if(status==="rejected")return(<span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2.5 py-1 rounded"><XCircle className="h-3 w-3 shrink-0"/>Rejected</span>);
  const s=stageConfig[stage];
  if(!s)return<span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-1 rounded">{stage}</span>;
  return(<span className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${s.text} ${s.bg} border ${s.border} px-2.5 py-1 rounded`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot} shrink-0`}/>{s.label}</span>);
};

const SegBar=({released,booked,actual,sanctioned}:{released:number;booked:number;actual:number;sanctioned:number})=>{
  const t=sanctioned||1;
  return(<div className="relative h-3 bg-slate-100 rounded-sm overflow-hidden"><div className="absolute left-0 top-0 h-full bg-blue-200 rounded-sm" style={{width:`${Math.min((released/t)*100,100)}%`}}/><div className="absolute left-0 top-0 h-full bg-blue-500 rounded-sm" style={{width:`${Math.min((booked/t)*100,100)}%`}}/><div className="absolute left-0 top-0 h-full bg-emerald-500 rounded-sm" style={{width:`${Math.min((actual/t)*100,100)}%`}}/></div>);
};

const PIDashboard=()=>{
  const navigate=useNavigate();
  const [projects,setProjects]=useState<Project[]>([]);
  const [requests,setRequests]=useState<BudgetRequest[]>([]);
  const [loadingP,setLoadingP]=useState(true);
  const [loadingR,setLoadingR]=useState(true);
  const [expanded,setExpanded]=useState<Set<string>>(new Set());
  const [rejExpanded,setRejExpanded]=useState<Set<string>>(new Set());
  const [projectSearch,setProjectSearch]=useState("");

  useEffect(()=>{fetchProjects();fetchRequests();},[]);

  const fetchProjects=async()=>{
    try{setLoadingP(true);const r=await fetch(`${API}/get-pi-projects.php?piEmail=${encodeURIComponent(PI_EMAIL)}`);const d=await r.json();
    if(d.success){setProjects(d.data||[]);setExpanded(new Set((d.data||[]).map((p:Project)=>p.id)));}else toast.error(d.message);}
    catch{toast.error("Failed to load projects");}finally{setLoadingP(false);}
  };

  const fetchRequests=async()=>{
    try{setLoadingR(true);const r=await fetch(`${API}/get-pi-budget-requests.php?piEmail=${encodeURIComponent(PI_EMAIL)}&withFile=0`);const d=await r.json();
    if(d.success)setRequests(d.data||[]);else toast.error(d.message);}
    catch{toast.error("Failed to load requests");}finally{setLoadingR(false);}
  };

  const toggle=(id:string)=>setExpanded(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});
  const toggleRej=(id:string)=>setRejExpanded(p=>{const n=new Set(p);n.has(id)?n.delete(id):n.add(id);return n;});

  const viewFile=async(req:BudgetRequest)=>{
    if(req.quotationFile){let u=req.quotationFile;if(!u.startsWith("data:"))u=`data:application/pdf;base64,${u}`;window.open(u,"_blank");return;}
    window.open(`${API}/download-file.php?requestId=${req.id}&type=quotation`,"_blank");
  };

  const filtered=projects.filter(p=>{const q=projectSearch.trim().toLowerCase();return !q||p.gpNumber?.toLowerCase().includes(q)||p.projectName?.toLowerCase().includes(q)||p.department?.toLowerCase().includes(q);});
  const totalReleased=projects.reduce((s,p)=>s+(p.totalReleasedAmount||0),0);
  const totalBooked=projects.reduce((s,p)=>s+(p.amountBookedByPI||0),0);
  const totalAvailable=projects.reduce((s,p)=>s+(p.availableBalance||0),0);
  const totalActual=projects.reduce((s,p)=>s+(p.actualExpenditure||0),0);
  const openQueries=requests.filter(r=>r.hasOpenQuery).length;
  const pendingReqs=requests.filter(r=>!["approved","rejected"].includes(r.status)&&!r.hasOpenQuery).length;
  const approvedReqs=requests.filter(r=>r.status==="approved").length;
  const rejectedReqs=requests.filter(r=>r.status==="rejected").length;
  const today=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  return(
    <Layout>
    <div className="min-h-screen" style={{background:"linear-gradient(160deg, #f0f4f8 0%, #e8ecf0 100%)"}}>

      {/* HEADER */}
      <div style={{background:"linear-gradient(135deg, #0f2044 0%, #1a3a6e 60%, #1e4080 100%)"}}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between py-2 border-b border-white/10">
            <p className="text-[11px] text-blue-200 font-medium tracking-wide uppercase">IFMS — Integrated Financial Management System</p>
            <p className="text-[11px] text-blue-300">{today}</p>
          </div>
          <div className="flex items-center justify-between py-5 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{background:"linear-gradient(135deg, #c9a227, #e8c547)"}}>
                <Building2 className="h-6 w-6 text-white"/>
              </div>
              <div>
                <h1 className="text-white text-xl font-bold tracking-tight leading-none">{PI_NAME}</h1>
                <p className="text-blue-300 text-xs mt-1 font-medium">Principal Investigator &nbsp;·&nbsp; {PI_DEPT}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {openQueries>0&&(<div className="flex items-center gap-2 bg-amber-500/20 border border-amber-400/40 rounded-lg px-3 py-1.5"><Bell className="h-3.5 w-3.5 text-amber-300 animate-pulse"/><span className="text-amber-200 text-xs font-semibold">{openQueries} pending {openQueries===1?"query":"queries"}</span></div>)}
              <Button onClick={()=>navigate("/pi/book-budget")} className="h-9 px-5 text-sm font-semibold rounded-lg border-0" style={{background:"linear-gradient(135deg, #c9a227, #e8c547)",color:"#0f2044"}}>
                <PlusCircle className="h-4 w-4 mr-2"/>Book Budget
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-px bg-white/10 rounded-t-xl overflow-hidden">
            {[
              {label:"Total Released",value:fmtINRFull(totalReleased),sub:`${projects.length} project${projects.length!==1?"s":""}`,icon:<IndianRupee className="h-4 w-4"/>,accent:"text-blue-200"},
              {label:"Amount Booked",value:fmtINRFull(totalBooked),sub:totalReleased>0?`${((totalBooked/totalReleased)*100).toFixed(0)}% utilised`:"—",icon:<FileText className="h-4 w-4"/>,accent:"text-purple-200"},
              {label:"Actual Expenditure",value:fmtINRFull(totalActual),sub:totalBooked>0?`${((totalActual/totalBooked)*100).toFixed(0)}% of booked`:"—",icon:<BarChart3 className="h-4 w-4"/>,accent:"text-green-200"},
              {label:"Available Balance",value:fmtINRFull(totalAvailable),sub:"Ready to book",icon:<TrendingUp className="h-4 w-4"/>,accent:"text-amber-200"},
            ].map(s=>(<div key={s.label} className="bg-white/5 px-5 py-4"><div className="flex items-center justify-between mb-2"><p className={`text-[10px] font-bold uppercase tracking-widest ${s.accent}`}>{s.label}</p><div className={`${s.accent} opacity-60`}>{s.icon}</div></div><p className="text-white text-2xl font-bold font-mono leading-none">{s.value}</p><p className={`text-[11px] mt-1 ${s.accent} opacity-80`}>{s.sub}</p></div>))}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-5">

        {openQueries>0&&(
          <div className="flex items-center gap-4 bg-white border-l-4 border-amber-500 rounded-r-xl shadow-sm px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0"/>
            <div className="flex-1"><p className="text-sm font-bold text-gray-900">Action Required — {openQueries} Query{openQueries>1?" Responses":" Response"} Pending</p><p className="text-xs text-gray-500 mt-0.5">Your budget request(s) are on hold. Respond to queries to proceed.</p></div>
          </div>
        )}

        {/* Activity strip */}
        <div className="grid grid-cols-4 gap-3">
          {[
            {label:"Pending Approval",value:pendingReqs,icon:<Clock className="h-4 w-4 text-blue-600"/>,bg:"bg-blue-50 border-blue-200",vcolor:"text-blue-700",desc:"In approval pipeline"},
            {label:"Fully Approved",value:approvedReqs,icon:<ShieldCheck className="h-4 w-4 text-emerald-600"/>,bg:"bg-emerald-50 border-emerald-200",vcolor:"text-emerald-700",desc:"Sanctioned requests"},
            {label:"Queries Pending",value:openQueries,icon:<MessageSquare className="h-4 w-4 text-amber-600"/>,bg:"bg-amber-50 border-amber-200",vcolor:"text-amber-700",desc:"Awaiting your response"},
            {label:"Rejected",value:rejectedReqs,icon:<XCircle className="h-4 w-4 text-red-600"/>,bg:"bg-red-50 border-red-200",vcolor:"text-red-700",desc:"Requests declined"},
          ].map(s=>(<div key={s.label} className={`bg-white border ${s.bg} rounded-xl p-4 shadow-sm flex items-center gap-4`}><div className={`p-2.5 rounded-lg ${s.bg} border`}>{s.icon}</div><div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{s.label}</p><p className={`text-2xl font-bold ${s.vcolor} leading-none mt-0.5`}>{s.value}</p><p className="text-[11px] text-gray-400 mt-0.5">{s.desc}</p></div></div>))}
        </div>

        {/* Section heading */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 rounded-full" style={{background:"linear-gradient(180deg, #c9a227, #e8c547)"}}/>
            <h2 className="text-base font-bold text-gray-900 tracking-tight">Research Projects & Fund Utilisation</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-medium">{filtered.length} projects</span>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none"/>
            <Input placeholder="Search by GP No. or project name…" value={projectSearch} onChange={e=>setProjectSearch(e.target.value)} className="pl-9 h-9 text-sm bg-white border-gray-200 rounded-lg shadow-sm"/>
          </div>
        </div>

        {loadingP?(
          <div className="flex flex-col items-center justify-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <Loader2 className="h-8 w-8 animate-spin text-blue-300 mb-3"/><p className="text-sm text-gray-400 font-medium">Loading project data…</p>
          </div>
        ):filtered.length===0?(
          <div className="flex flex-col items-center py-20 bg-white rounded-xl border border-gray-200 shadow-sm">
            <BookOpen className="h-12 w-12 text-gray-200 mb-4"/><p className="text-sm font-semibold text-gray-500">{projectSearch?`No projects matching "${projectSearch}"`:"No projects with released funds"}</p>
          </div>
        ):(
          <div className="space-y-5">
            {filtered.map(p=>{
              const sanctioned=p.totalSanctionedAmount||0,released=p.totalReleasedAmount||0,booked=p.amountBookedByPI||0,actual=p.actualExpenditure||0,available=p.availableBalance||0;
              const isOpen=expanded.has(p.id),rejOpen=rejExpanded.has(p.id);
              const projReqs=requests.filter(r=>r.gpNumber===p.gpNumber);
              const activeReqs=projReqs.filter(r=>r.status!=="rejected");
              const rejectedList=projReqs.filter(r=>r.status==="rejected");
              const approved=p.approvedRequestCount||0,filled=p.filledExpenditureCount||0,expDone=p.expenditureComplete;
              const projOpenQ=projReqs.filter(r=>r.hasOpenQuery).length;
              const utilPct=released>0?Math.min((booked/released)*100,100):0;
              const relPct=sanctioned>0?Math.min((released/sanctioned)*100,100):0;

              return(
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 pt-5 pb-0">
                    <div className="flex items-start justify-between gap-6 mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="font-mono text-xs font-bold text-white px-2 py-0.5 rounded" style={{background:"#0f2044"}}>{p.gpNumber}</span>
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded border ${p.status==="active"?"bg-emerald-50 text-emerald-700 border-emerald-300":"bg-gray-100 text-gray-500 border-gray-300"}`}>{p.status.charAt(0).toUpperCase()+p.status.slice(1)}</span>
                          {projOpenQ>0&&(<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"/>{projOpenQ} Query</span>)}
                          {rejectedList.length>0&&(<span className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded"><XCircle className="h-3 w-3"/>{rejectedList.length} Rejected</span>)}
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 leading-tight tracking-tight">{p.projectName}</h3>
                        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500"><Building2 className="h-3.5 w-3.5"/>{p.department}</span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500"><Calendar className="h-3.5 w-3.5"/>{fmtDate(p.projectStartDate)} — {fmtDate(p.projectEndDate)}</span>
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-500"><Layers className="h-3.5 w-3.5"/>{projReqs.length} booking{projReqs.length!==1?"s":""} submitted</span>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">Available Balance</p>
                        <p className="text-3xl font-bold leading-none" style={{color:available>0?"#1a7a4a":"#dc2626"}}>{fmtINR(available)}</p>
                        <p className="text-[11px] text-gray-400 mt-1">of {fmtINR(released)} released</p>
                      </div>
                    </div>

                    {/* Financial grid */}
                    <div className="grid grid-cols-4 gap-3 mb-4">
                      {[
                        {label:"Total Sanctioned",value:fmtINR(sanctioned),sub:"Project grant",bg:"bg-slate-50",border:"border-slate-200",vcolor:"text-slate-800"},
                        {label:"Total Released",value:fmtINR(released),sub:`${relPct.toFixed(0)}% of sanctioned`,bg:"bg-blue-50",border:"border-blue-200",vcolor:"text-blue-800"},
                        {label:"Amount Booked",value:fmtINR(booked),sub:`${utilPct.toFixed(0)}% of released`,bg:"bg-violet-50",border:"border-violet-200",vcolor:"text-violet-800"},
                        {label:"Actual Expenditure",value:fmtINR(actual),sub:approved>0?`${filled}/${approved} entries confirmed`:"No approvals yet",bg:actual>0?"bg-emerald-50":"bg-gray-50",border:actual>0?"border-emerald-200":"border-gray-200",vcolor:actual>0?"text-emerald-800":"text-gray-400"},
                      ].map(c=>(<div key={c.label} className={`${c.bg} border ${c.border} rounded-lg px-4 py-3`}><p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{c.label}</p><p className={`text-xl font-bold font-mono leading-none ${c.vcolor}`}>{c.value}</p><p className="text-[11px] text-gray-400 mt-1">{c.sub}</p></div>))}
                    </div>

                    <div className="mb-1">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-[11px] font-semibold text-gray-500">Fund Utilisation</p>
                        <div className="flex items-center gap-4">{[{dot:"bg-blue-200",l:"Released"},{dot:"bg-blue-500",l:"Booked"},{dot:"bg-emerald-500",l:"Actual Exp."}].map(x=>(<span key={x.l} className="inline-flex items-center gap-1 text-[10px] text-gray-400"><span className={`w-2 h-2 rounded-sm ${x.dot}`}/>{x.l}</span>))}</div>
                      </div>
                      <SegBar released={released} booked={booked} actual={actual} sanctioned={sanctioned}/>
                    </div>
                    {approved>0&&!expDone&&(<div className="mt-3 flex items-center gap-2.5 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-2.5 mb-1"><AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0"/><span><strong>Attention:</strong> Actual expenditure not yet confirmed for {approved-filled} of {approved} approved bookings.</span></div>)}
                  </div>

                  {/* Active requests toggle */}
                  <button onClick={()=>toggle(p.id)} className="w-full flex items-center justify-between px-6 py-3 mt-4 border-t border-gray-100 bg-gray-50/80 hover:bg-gray-100 transition-colors">
                    <span className="flex items-center gap-2.5 text-sm font-semibold text-gray-700">
                      <Wallet className="h-4 w-4 text-gray-400"/>Budget Booking Requests
                      <span className="text-[11px] font-bold text-white px-2 py-0.5 rounded" style={{background:"#1a3a6e"}}>{activeReqs.length}</span>
                      {projOpenQ>0&&<span className="text-[11px] font-bold text-white bg-amber-500 px-2 py-0.5 rounded animate-pulse">{projOpenQ} query</span>}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500"><span>{isOpen?"Collapse":"View all"}</span>{isOpen?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</div>
                  </button>

                  {/* Active requests table */}
                  {isOpen&&(
                    <div className="border-t border-gray-100">
                      {loadingR?(<div className="flex items-center justify-center py-10 gap-2"><Loader2 className="h-4 w-4 animate-spin text-gray-300"/></div>)
                      :activeReqs.length===0?(
                        <div className="text-center py-10"><p className="text-sm text-gray-500">No active requests for this project.</p><button onClick={()=>navigate("/pi/book-budget")} className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded"><PlusCircle className="h-3.5 w-3.5"/>Submit a Booking Request</button></div>
                      ):(
                        <div>
                          <div className="grid grid-cols-[1.5fr_2.5fr_1fr_1fr_1.2fr_1.8fr_110px] text-[10px] font-bold uppercase tracking-widest text-gray-400 bg-gray-50 border-b border-gray-100 px-6 py-2.5 gap-0">
                            <span>Head / File No.</span><span>Purpose</span><span>Date</span><span className="text-right">Booked (₹)</span><span className="text-right">Actual (₹)</span><span className="text-center">Status</span><span></span>
                          </div>
                          {activeReqs.map((req,i)=>{
                            const amount=parseFloat(String(req.amount||0)),reqActual=parseFloat(String(req.actualExpenditure||0));
                            const hasQuery=req.hasOpenQuery,isApproved=req.status==="approved",isLast=i===activeReqs.length-1;
                            return(
                              <div key={req.id}>
                                <div className={`grid grid-cols-[1.5fr_2.5fr_1fr_1fr_1.2fr_1.8fr_110px] px-6 py-4 items-center gap-0 ${!isLast?"border-b border-gray-100":""} ${hasQuery?"bg-amber-50/40":"hover:bg-gray-50/50"} transition-colors`}>
                                  <div><p className="text-sm font-semibold text-gray-800">{req.headName||"—"}</p>{req.fileNumber&&<p className="text-[11px] font-mono font-bold text-blue-600 mt-0.5">{req.fileNumber}</p>}{req.invoiceNumber&&<p className="text-[11px] font-mono text-gray-400 mt-0.5">{req.invoiceNumber}</p>}</div>
                                  <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">{req.purpose||"—"}</p>
                                  <p className="text-xs text-gray-500">{fmtDate(req.createdAt)}</p>
                                  <p className="text-sm font-bold text-gray-900 font-mono text-right">{fmtINR(amount)}</p>
                                  <div className="text-right">{!isApproved?<span className="text-xs text-gray-300">—</span>:reqActual>0?<p className="text-sm font-bold text-emerald-700 font-mono">{fmtINR(reqActual)}</p>:<span className="text-[11px] text-amber-600 font-semibold italic">Pending DA</span>}</div>
                                  <div className="flex justify-center"><StatusBadge status={req.status} stage={req.currentStage} hasOpenQuery={hasQuery}/></div>
                                  <div className="flex justify-end">{hasQuery?(<button onClick={()=>navigate(`/pi/query/${req.id}`)} className="inline-flex items-center gap-1.5 text-[11px] font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded"><MessageSquare className="h-3 w-3"/>Respond</button>):<span className="text-[11px] text-gray-300">—</span>}</div>
                                </div>
                                {hasQuery&&req.latestQuery&&(
                                  <div className="mx-6 mb-3 rounded-lg border border-amber-200 bg-amber-50 overflow-hidden">
                                    <div className="flex items-center gap-2 bg-amber-100 border-b border-amber-200 px-4 py-2"><AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0"/><p className="text-xs font-bold text-amber-800">Query from {req.latestQuery.raisedByLabel}</p><span className="text-[11px] text-amber-600 ml-auto">{fmtDate(req.latestQuery.raisedAt)}</span></div>
                                    <div className="px-4 py-3 flex items-start justify-between gap-4"><p className="text-xs text-amber-800 italic leading-relaxed flex-1">"{req.latestQuery.query}"</p><button onClick={()=>navigate(`/pi/query/${req.id}`)} className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-bold text-white bg-amber-500 hover:bg-amber-600 px-4 py-2 rounded"><ArrowRight className="h-3.5 w-3.5"/>Open & Respond</button></div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                          {activeReqs.length>1&&(<div className="grid grid-cols-[1.5fr_2.5fr_1fr_1fr_1.2fr_1.8fr_110px] px-6 py-3 bg-slate-50 border-t-2 border-slate-200 items-center gap-0"><div className="col-span-3 text-[11px] font-bold text-gray-500 uppercase tracking-widest">Project Total</div><div className="text-right"><p className="text-sm font-bold text-gray-900 font-mono">{fmtINR(activeReqs.reduce((s,r)=>s+parseFloat(String(r.amount||0)),0))}</p></div><div className="text-right"><p className="text-sm font-bold text-emerald-700 font-mono">{actual>0?fmtINR(actual):<span className="text-gray-300">—</span>}</p></div><div/><div/></div>)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── REJECTED REQUESTS SECTION ── */}
                  {rejectedList.length>0&&(
                    <>
                      <button onClick={()=>toggleRej(p.id)} className="w-full flex items-center justify-between px-6 py-3 border-t border-red-100 bg-red-50/40 hover:bg-red-50 transition-colors">
                        <span className="flex items-center gap-2.5 text-sm font-semibold text-red-700"><XCircle className="h-4 w-4 text-red-400"/>Rejected Requests<span className="text-[11px] font-bold text-white bg-red-500 px-2 py-0.5 rounded">{rejectedList.length}</span></span>
                        <div className="flex items-center gap-1.5 text-xs text-red-500"><span>{rejOpen?"Hide details":"View details"}</span>{rejOpen?<ChevronUp className="h-4 w-4"/>:<ChevronDown className="h-4 w-4"/>}</div>
                      </button>

                      {rejOpen&&(
                        <div className="border-t border-red-100">
                          {/* Rejected table header */}
                          <div className="grid grid-cols-[1.5fr_2fr_1.2fr_1fr_1.5fr_2fr_110px] text-[10px] font-bold uppercase tracking-widest text-red-400 bg-red-50/60 border-b border-red-100 px-6 py-2.5 gap-0">
                            <span>Head / File No.</span><span>Purpose</span><span>Rejected On</span><span className="text-right">Amount (₹)</span><span>Rejected By</span><span>Reason for Rejection</span><span className="text-center">Quotation</span>
                          </div>
                          {rejectedList.map((req,i)=>{
                            const amount=parseFloat(String(req.amount||0));
                            const isLast=i===rejectedList.length-1;
                            const reason=req.rejectionRemarks||req.daRemarks||req.arRemarks||req.drRemarks||req.drcOfficeRemarks||req.drcRcRemarks||req.drcRemarks||req.directorRemarks||"—";
                            return(
                              <div key={req.id} className={`grid grid-cols-[1.5fr_2fr_1.2fr_1fr_1.5fr_2fr_110px] px-6 py-4 items-start gap-0 ${!isLast?"border-b border-red-100":""} bg-red-50/10 hover:bg-red-50/30 transition-colors`}>
                                {/* Head + file number */}
                                <div>
                                  <p className="text-sm font-semibold text-gray-700 leading-snug">{req.headName||"—"}</p>
                                  {req.fileNumber
                                    ?<p className="text-[11px] font-mono font-bold text-red-600 mt-1 bg-red-100 border border-red-200 px-1.5 py-0.5 rounded inline-block">{req.fileNumber}</p>
                                    :<p className="text-[11px] text-gray-400 italic mt-0.5">No file number</p>}
                                  {req.invoiceNumber&&<p className="text-[11px] font-mono text-gray-400 mt-0.5">{req.invoiceNumber}</p>}
                                </div>

                                <p className="text-xs text-gray-600 leading-relaxed line-clamp-3 pt-0.5">{req.purpose||"—"}</p>

                                {/* Dates */}
                                <div>
                                  <p className="text-[11px] text-gray-400">Submitted:</p>
                                  <p className="text-xs text-gray-600 font-medium">{fmtDate(req.createdAt)}</p>
                                  {req.rejectedAt&&<><p className="text-[11px] text-red-400 mt-1">Rejected:</p><p className="text-xs text-red-600 font-medium">{fmtDate(req.rejectedAt)}</p></>}
                                </div>

                                <p className="text-sm font-bold text-gray-700 font-mono text-right pt-0.5">{fmtINR(amount)}</p>

                                {/* Rejected by */}
                                <div>
                                  <p className="text-xs font-bold text-red-700 leading-snug">{req.rejectedAtStageLabel||req.rejectedAtStage||"—"}</p>
                                  {req.rejectedBy&&<p className="text-[11px] text-gray-500 mt-0.5">{req.rejectedBy}</p>}
                                </div>

                                {/* Reason */}
                                <div className="pr-2">
                                  <p className="text-xs text-gray-700 italic leading-relaxed line-clamp-4">{reason}</p>
                                </div>

                                {/* View quotation file */}
                                <div className="flex justify-center pt-0.5">
                                  <button onClick={()=>viewFile(req)}
                                    className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded transition-colors whitespace-nowrap"
                                    title="View original quotation file">
                                    <Eye className="h-3.5 w-3.5"/>View File
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <p className="text-[11px] text-gray-400">IFMS Portal — Integrated Financial Management System</p>
          <p className="text-[11px] text-gray-400">All amounts in Indian Rupees (INR)</p>
        </div>
      </div>
    </div>
    </Layout>
  );
};

export default PIDashboard;
