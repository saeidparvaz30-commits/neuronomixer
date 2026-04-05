"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "next-auth/react";

const RANKS = [1, 2, 4, 8, 16, 32, 64];
const D = 4096;
const FULL = D * D;
const fmt = (n: number) => n >= 1e6 ? `${(n/1e6).toFixed(2)}M` : n >= 1e3 ? `${(n/1e3).toFixed(1)}K` : String(n);

const SCATTER = [
  { label: "Full FT", x: 100, y: 100, color: "#ef4444", diamond: false },
  { label: "LoRA r=64", x: 0.8, y: 97, color: "#3bb4a4", diamond: false },
  { label: "LoRA r=16", x: 0.2, y: 94, color: "#3bb4a4", diamond: false },
  { label: "LoRA r=4", x: 0.05, y: 88, color: "#3bb4a4", diamond: false },
  { label: "QLoRA r=16", x: 0.2, y: 91, color: "#a855f7", diamond: true },
  { label: "Adapters", x: 0.5, y: 93, color: "#d4af37", diamond: false },
];

const TABLE = [
  { method: "Full Fine-Tune", params: "100%", vram: "~80 GB", quality: "Baseline", c: "#ef4444" },
  { method: "LoRA (r=16)", params: "~0.2%", vram: "~16 GB", quality: "~94%", c: "#3bb4a4" },
  { method: "QLoRA (r=16)", params: "~0.2%", vram: "~8 GB", quality: "~92%", c: "#a855f7" },
  { method: "Adapters", params: "~0.5%", vram: "~20 GB", quality: "~93%", c: "#d4af37" },
];

// svg scatter helpers
const SL = 52, SR = 20, ST = 16, SB = 44, SW = 480, SH = 260;
const xS = (v: number) => { const mn = Math.log10(0.04), mx = Math.log10(110); return SL + ((Math.log10(Math.max(v,0.04))-mn)/(mx-mn))*(SW-SL-SR); };
const yS = (v: number) => ST + ((100-v)/20)*(SH-ST-SB);

export default function LoRAAdaptersClient() {
  const { data: session } = useSession();
  const [matMode, setMatMode] = useState<"full"|"lora">("full");
  const [rankIdx, setRankIdx] = useState(4);
  const [loraOn, setLoraOn] = useState(true);
  const [sliderDone, setSliderDone] = useState(false);
  const [plotDone, setPlotDone] = useState(false);
  const completionFired = useRef(false);
  const sliderRef = useRef(false);
  const plotRef = useRef(false);

  const r = RANKS[rankIdx];
  const loraP = 2*D*r;
  const barPct = Math.max(0.4, (loraP/FULL)*100);

  const allComplete = sliderDone && plotDone;

  useEffect(() => {
    if (allComplete && !completionFired.current && session?.user) {
      completionFired.current = true;
      fetch("/api/visual-guides/complete", { method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ guideSlug:"lora-adapters", score:100 }) }).catch(()=>{});
    }
  }, [allComplete, session?.user]);

  // mark plot viewed on mount of that section (via IntersectionObserver-like effect)
  useEffect(() => {
    if (!plotRef.current) { plotRef.current = true; setPlotDone(true); }
  }, []);

  return (
    <div className="min-h-screen pb-20">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 lg:px-10 py-8">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-[12px] text-[#94a3b8] mb-6">
          <Link href="/visual-guides" className="hover:text-white transition-colors">Visual Guides</Link>
          <span className="text-white/20">/</span>
          <span className="text-[#ec4899]">Applied AI</span>
          <span className="text-white/20">/</span>
          <span className="text-white">LoRA &amp; Adapters: Efficient Fine-Tuning</span>
        </nav>

        {/* Hero */}
        <section className="mb-10">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-6 h-px bg-[#ec4899]"/><span className="text-[11px] font-semibold uppercase tracking-[2.5px] text-[#ec4899]">Applied AI</span><span className="w-6 h-px bg-[#ec4899]"/>
          </div>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">LoRA &amp; <span className="text-[#ec4899]">Adapters</span></h1>
          <p className="text-[15px] text-[#94a3b8] leading-relaxed max-w-[640px]">
            Fine-tuning a 7B model requires updating all 7 billion weights — expensive and slow. LoRA learns two tiny matrices whose product approximates the full weight update. Same quality, a fraction of the cost.
          </p>
        </section>

        {/* Progress */}
        <div className="flex items-center gap-3 mb-10 flex-wrap">
          {[{label:"Rank slider",done:sliderDone},{label:"Quality plot viewed",done:plotDone}].map(({label,done})=>(
            <div key={label} className="flex items-center gap-1.5">
              <motion.div className="w-2 h-2 rounded-full" animate={{backgroundColor:done?"#ec4899":"#1e293b"}} transition={{duration:0.4}}/>
              <span className={`text-[11px] transition-colors ${done?"text-white":"text-[#475569]"}`}>{label}</span>
            </div>
          ))}
          {!session?.user && <p className="text-[11px] text-[#475569] ml-auto">Sign in to save progress</p>}
          <AnimatePresence>
            {allComplete && (
              <motion.span initial={{opacity:0}} animate={{opacity:1}} className="ml-auto text-[11px] font-semibold text-[#ec4899] flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                Guide complete!
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* S1: Weight Matrix */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 1 — The Weight Matrix Problem</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Toggle between full fine-tuning and LoRA to see how the weight update changes.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <div className="flex gap-2 mb-5">
              {(["full","lora"] as const).map(m=>(
                <button key={m} onClick={()=>setMatMode(m)} className={`px-4 py-2 rounded-xl text-[13px] font-semibold border transition-all ${matMode===m?"bg-[#ec4899] border-[#ec4899] text-white":"border-[#1e293b] text-[#94a3b8] hover:border-[#334155] hover:text-white"}`}>
                  {m==="full"?"Full Fine-Tuning":"LoRA"}
                </button>
              ))}
            </div>
            <AnimatePresence mode="wait">
              {matMode==="full" ? (
                <motion.div key="full" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
                  <p className="text-[12px] text-[#94a3b8] mb-4">Full fine-tuning updates every weight in W (4096×4096 = 16.7M params per layer).</p>
                  <div className="flex items-center gap-4 flex-wrap">
                    <div>
                      <p className="text-[10px] text-[#475569] mb-2 font-semibold uppercase tracking-wider">W (8×8 scaled)</p>
                      <div className="grid gap-0.5" style={{gridTemplateColumns:"repeat(8,1fr)",width:128}}>
                        {Array.from({length:64}).map((_,i)=>(
                          <motion.div key={i} initial={{opacity:0,scale:0.6}} animate={{opacity:1,scale:1}} transition={{delay:i*0.008}} className="w-4 h-4 rounded-[2px] bg-[#1e5d8a]"/>
                        ))}
                      </div>
                    </div>
                    <div className="text-[#475569] text-[20px]">→</div>
                    <div className="rounded-xl border border-[#ef4444]/30 bg-[#ef4444]/5 p-4">
                      <p className="text-[11px] font-bold text-[#ef4444]">Update all 64 values</p>
                      <p className="text-[10px] text-[#94a3b8] mt-1">Real: 16,777,216 per layer</p>
                      <p className="text-[10px] text-[#94a3b8]">7B model: 7 billion total</p>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div key="lora" initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>
                  <p className="text-[12px] text-[#94a3b8] mb-4">LoRA freezes W and learns two thin matrices A and B. W_new = W_frozen + B·A.</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <div>
                      <p className="text-[10px] text-[#475569] mb-2 font-semibold uppercase tracking-wider">W frozen</p>
                      <div className="grid gap-0.5" style={{gridTemplateColumns:"repeat(8,1fr)",width:128}}>
                        {Array.from({length:64}).map((_,i)=><div key={i} className="w-4 h-4 rounded-[2px] bg-[#1e293b]"/>)}
                      </div>
                    </div>
                    <span className="text-[#475569] text-[16px] font-bold">+</span>
                    <div>
                      <p className="text-[10px] text-[#3bb4a4] mb-2 font-semibold uppercase tracking-wider">B (8×2)</p>
                      <div className="grid gap-0.5" style={{gridTemplateColumns:"repeat(2,1fr)",width:36}}>
                        {Array.from({length:16}).map((_,i)=>(
                          <motion.div key={i} initial={{opacity:0,scale:0.6}} animate={{opacity:1,scale:1}} transition={{delay:i*0.04}} className="w-4 h-4 rounded-[2px] bg-[#3bb4a4]"/>
                        ))}
                      </div>
                    </div>
                    <span className="text-[#475569] text-[16px] font-bold">·</span>
                    <div>
                      <p className="text-[10px] text-[#3bb4a4] mb-2 font-semibold uppercase tracking-wider">A (2×8)</p>
                      <div className="grid gap-0.5" style={{gridTemplateColumns:"repeat(8,1fr)",width:128}}>
                        {Array.from({length:16}).map((_,i)=>(
                          <motion.div key={i} initial={{opacity:0,scale:0.6}} animate={{opacity:1,scale:1}} transition={{delay:i*0.04+0.3}} className="w-4 h-4 rounded-[2px] bg-[#3bb4a4] opacity-70"/>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-[#3bb4a4]/20 bg-[#3bb4a4]/5 p-3 font-mono text-[11px]">
                    <span className="text-white">W_new</span><span className="text-[#475569]"> = </span><span className="text-[#94a3b8]">W_frozen</span><span className="text-[#475569]"> + </span><span className="text-[#3bb4a4]">B · A</span><span className="text-[#475569] ml-4">← only B and A are trained</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* S2: Rank Slider */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 2 — Rank Slider</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Drag the slider to see how rank r controls trainable parameters and memory usage.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[13px] font-bold text-white">Rank r = <span className="text-[#ec4899]">{r}</span></p>
              <p className="text-[11px] text-[#475569]">d = {D.toLocaleString()} (fixed)</p>
            </div>
            <input type="range" min={0} max={RANKS.length-1} value={rankIdx} onChange={e=>{setRankIdx(Number(e.target.value));if(!sliderRef.current){sliderRef.current=true;setSliderDone(true);}}} className="w-full accent-[#ec4899] cursor-pointer mb-1"/>
            <div className="flex justify-between mb-5">
              {RANKS.map(rv=><span key={rv} className={`text-[10px] ${RANKS[rankIdx]===rv?"text-[#ec4899] font-bold":"text-[#334155]"}`}>{rv}</span>)}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[{label:"LoRA params",val:fmt(loraP),color:"#3bb4a4"},{label:"Full layer",val:fmt(FULL),color:"#ef4444"},{label:"Param savings",val:`${((1-loraP/FULL)*100).toFixed(2)}%`,color:"#d4af37"},{label:"LoRA mem (fp32)",val:`${((loraP*4)/1048576).toFixed(2)} MB`,color:"#ec4899"}].map(({label,val,color})=>(
                <div key={label} className="rounded-xl border border-[#1e293b] p-3">
                  <p className="text-[10px] text-[#475569] mb-1">{label}</p>
                  <p className="text-[16px] font-black" style={{color}}>{val}</p>
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1"><span className="text-[11px] text-[#94a3b8]">Full layer ({((FULL*4)/1048576).toFixed(1)} MB)</span><span className="text-[11px] text-[#ef4444] font-semibold">{fmt(FULL)}</span></div>
                <div className="h-5 rounded-full bg-[#1e293b] overflow-hidden"><div className="h-full rounded-full bg-[#ef4444]/40 w-full"/></div>
              </div>
              <div>
                <div className="flex justify-between mb-1"><span className="text-[11px] text-[#94a3b8]">LoRA r={r}</span><span className="text-[11px] text-[#3bb4a4] font-semibold">{fmt(loraP)}</span></div>
                <div className="h-5 rounded-full bg-[#1e293b] overflow-hidden">
                  <motion.div className="h-full rounded-full bg-[#3bb4a4]" animate={{width:`${barPct}%`}} transition={{duration:0.4,ease:"easeOut"}}/>
                </div>
              </div>
            </div>
            <p className="text-[11px] text-[#475569] mt-3 font-mono">2 × {D} × {r} = {loraP.toLocaleString()} params</p>
          </div>
        </section>

        {/* S3: Quality Scatter */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 3 — Quality vs Efficiency</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Low-rank fine-tuning achieves near full-fine-tuning quality while training a fraction of parameters.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 overflow-x-auto">
            <svg viewBox={`0 0 ${SW} ${SH}`} className="w-full max-w-[480px] mx-auto block">
              {[80,85,90,95,100].map(y=><line key={y} x1={SL} y1={yS(y)} x2={SW-SR} y2={yS(y)} stroke="#1e293b" strokeWidth={1}/>)}
              <line x1={SL} y1={ST} x2={SL} y2={SH-SB} stroke="#334155" strokeWidth={1.5}/>
              <line x1={SL} y1={SH-SB} x2={SW-SR} y2={SH-SB} stroke="#334155" strokeWidth={1.5}/>
              {[80,85,90,95,100].map(y=><text key={y} x={SL-6} y={yS(y)+4} textAnchor="end" fontSize={9} fill="#475569">{y}%</text>)}
              {[0.05,0.2,0.5,1,5,25,100].map(x=><text key={x} x={xS(x)} y={SH-SB+14} textAnchor="middle" fontSize={9} fill="#475569">{x<1?x:`${x}%`}</text>)}
              <text x={(SL+SW-SR)/2} y={SH-4} textAnchor="middle" fontSize={9} fill="#94a3b8">% of original params trained (log scale)</text>
              <text x={10} y={(ST+SH-SB)/2} textAnchor="middle" fontSize={9} fill="#94a3b8" transform={`rotate(-90,10,${(ST+SH-SB)/2})`}>Performance vs full FT (%)</text>
              {SCATTER.map((pt,i)=>{
                const cx=xS(pt.x), cy=yS(pt.y);
                return (
                  <motion.g key={pt.label} initial={{opacity:0,scale:0}} animate={{opacity:1,scale:1}} transition={{delay:i*0.12,duration:0.35,type:"spring"}} style={{originX:cx,originY:cy}}>
                    {pt.diamond?<rect x={cx-6} y={cy-6} width={12} height={12} fill={pt.color} opacity={0.85} transform={`rotate(45,${cx},${cy})`} rx={1}/>:<circle cx={cx} cy={cy} r={6} fill={pt.color} opacity={0.85}/>}
                    <text x={cx+10} y={cy+4} fontSize={9} fill={pt.color} fontWeight="600">{pt.label}</text>
                  </motion.g>
                );
              })}
            </svg>
            <div className="flex items-center gap-4 mt-3 flex-wrap justify-center">
              {[{shape:"c",color:"#ef4444",label:"Full FT"},{shape:"c",color:"#3bb4a4",label:"LoRA"},{shape:"d",color:"#a855f7",label:"QLoRA"},{shape:"c",color:"#d4af37",label:"Adapters"}].map(({shape,color,label})=>(
                <div key={label} className="flex items-center gap-1.5">
                  {shape==="d"?<svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" fill={color} transform="rotate(45,5,5)"/></svg>:<div className="w-2.5 h-2.5 rounded-full" style={{background:color}}/>}
                  <span className="text-[10px] text-[#94a3b8]">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* S4: Transformer Diagram */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 4 — Where LoRA Is Applied</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">LoRA adapters are inserted into specific weight matrices inside each transformer block.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6">
            <div className="flex items-center gap-3 mb-5">
              <p className="text-[13px] text-[#94a3b8]">LoRA enabled</p>
              <button onClick={()=>setLoraOn(v=>!v)} className={`relative w-10 h-5 rounded-full transition-colors ${loraOn?"bg-[#ec4899]":"bg-[#1e293b]"}`}>
                <motion.div className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow" animate={{left:loraOn?"calc(100% - 18px)":"2px"}} transition={{duration:0.2}}/>
              </button>
            </div>
            <div className="flex flex-col items-center gap-2">
              <div className="rounded-lg border border-[#334155] bg-[#1e293b] px-4 py-2 text-[11px] text-[#94a3b8] w-full max-w-[360px] text-center">Input Embedding</div>
              <div className="w-px h-3 bg-[#334155]"/>
              <div className="rounded-xl border border-[#1e5d8a]/50 bg-[#1e5d8a]/10 p-4 w-full max-w-[360px]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#1e5d8a] mb-3">Multi-Head Attention</p>
                <div className="grid grid-cols-3 gap-2">
                  {[{id:"Q",active:true},{id:"K",active:true},{id:"V",active:true}].map(m=>(
                    <div key={m.id} className="relative">
                      <div className={`rounded-lg border p-2 text-center transition-colors ${m.active&&loraOn?"border-[#ec4899]/50 bg-[#ec4899]/10":"border-[#334155] bg-[#1e293b]"}`}>
                        <p className={`text-[13px] font-black ${m.active&&loraOn?"text-[#ec4899]":"text-[#94a3b8]"}`}>{m.id}</p>
                        <p className="text-[9px] text-[#475569] mt-0.5">{m.id} projection</p>
                      </div>
                      {m.active&&loraOn&&<motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#ec4899] flex items-center justify-center"><span className="text-[8px] font-black text-white">L</span></motion.div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-px h-3 bg-[#334155]"/>
              <div className="rounded-xl border border-[#334155]/50 bg-[#1e293b]/30 p-4 w-full max-w-[360px]">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-[#475569] mb-3">Feed-Forward Network</p>
                <div className="grid grid-cols-2 gap-2">
                  {[{id:"Up",active:true},{id:"Down",active:true}].map(m=>(
                    <div key={m.id} className="relative">
                      <div className={`rounded-lg border p-2 text-center transition-colors ${m.active&&loraOn?"border-[#d4af37]/50 bg-[#d4af37]/10":"border-[#334155] bg-[#1e293b]"}`}>
                        <p className={`text-[13px] font-black ${m.active&&loraOn?"text-[#d4af37]":"text-[#94a3b8]"}`}>{m.id}</p>
                        <p className="text-[9px] text-[#475569] mt-0.5">{m.id}-projection</p>
                      </div>
                      {m.active&&loraOn&&<motion.div initial={{opacity:0,scale:0.5}} animate={{opacity:1,scale:1}} className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-[#d4af37] flex items-center justify-center"><span className="text-[8px] font-black text-[#0a0e1a]">L</span></motion.div>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-px h-3 bg-[#334155]"/>
              <div className="rounded-lg border border-[#334155] bg-[#1e293b] px-4 py-2 text-[11px] text-[#94a3b8] w-full max-w-[360px] text-center">Output</div>
            </div>
            {loraOn&&<motion.div initial={{opacity:0}} animate={{opacity:1}} className="mt-4 flex gap-4 flex-wrap">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#ec4899]"/><span className="text-[10px] text-[#94a3b8]">Q/K/V — most impactful</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-[#d4af37]"/><span className="text-[10px] text-[#94a3b8]">FFN projections — also common</span></div>
            </motion.div>}
          </div>
        </section>

        {/* S5: Comparison Table */}
        <section className="mb-12">
          <h2 className="text-[18px] font-bold text-white mb-1">Section 5 — Method Comparison</h2>
          <p className="text-[12px] text-[#94a3b8] mb-5">Numbers are for a 7B parameter model on a typical fine-tuning workload.</p>
          <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px]">
                <thead><tr className="border-b border-[#1e293b]">{["Method","Trainable Params","VRAM (7B model)","Quality"].map(h=><th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-[#475569]">{h}</th>)}</tr></thead>
                <tbody>{TABLE.map((row,i)=>(
                  <motion.tr key={row.method} initial={{opacity:0,x:-12}} animate={{opacity:1,x:0}} transition={{delay:i*0.08}} className="border-b border-[#1e293b]/50 last:border-0">
                    <td className="px-5 py-3"><span className="text-[13px] font-semibold" style={{color:row.c}}>{row.method}</span></td>
                    <td className="px-5 py-3 text-[12px] text-white font-mono">{row.params}</td>
                    <td className="px-5 py-3 text-[12px] text-[#94a3b8] font-mono">{row.vram}</td>
                    <td className="px-5 py-3 text-[12px] text-[#94a3b8]">{row.quality}</td>
                  </motion.tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Gold insight */}
        <div className="rounded-2xl border border-[#d4af37]/30 bg-[#d4af37]/5 p-6 mb-12">
          <div className="flex items-start gap-3">
            <span className="text-[#d4af37] text-xl mt-0.5">💡</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#d4af37] mb-2">Key Insight</p>
              <p className="text-[13px] text-white leading-relaxed">
                QLoRA enabled fine-tuning LLaMA 65B on a single 48 GB GPU — previously requiring 780 GB. This democratized LLM fine-tuning for researchers and small teams. Most open-source fine-tuned models (Alpaca, Vicuna) use LoRA. The underlying reason it works: weight updates during fine-tuning tend to be inherently low-rank — most task-specific information lives in a small subspace.
              </p>
            </div>
          </div>
        </div>

        {/* Summary card */}
        <div className="rounded-2xl border border-[#1e293b] bg-[#0f172a] p-6 mb-10 flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#94a3b8] mb-1">Up Next</p>
            <p className="text-[15px] font-bold text-white">AI Safety</p>
            <p className="text-[12px] text-[#94a3b8] mt-1">Continue the Applied AI section — explore alignment and safety techniques.</p>
          </div>
          <Link href="/visual-guides/ai-safety" className="px-5 py-2.5 rounded-xl text-[13px] font-semibold bg-[#ec4899] text-white hover:opacity-90 transition-opacity whitespace-nowrap">Next Guide →</Link>
        </div>

        {/* Nav */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6 border-t border-white/[0.06]">
          <Link href="/visual-guides/fine-tuning-vs-prompting" className="px-4 py-2 rounded-xl text-sm font-semibold border border-[#1e293b] text-white hover:border-[#d4af37] hover:text-[#d4af37] transition-colors">← Fine-Tuning vs Prompting</Link>
          <Link href="/visual-guides/ai-safety" className="px-5 py-2 rounded-xl text-sm font-semibold bg-[var(--color-accent)] text-[#0a0e1a] hover:opacity-90 transition-opacity">AI Safety →</Link>
        </div>

      </div>
    </div>
  );
}
