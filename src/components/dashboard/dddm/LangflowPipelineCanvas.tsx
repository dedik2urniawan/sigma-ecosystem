"use client";

import React, { useState } from "react";
import { LangflowAgentNode, ExecutionLogItem } from "@/lib/dddm/dddmTypes";
import { Play, RotateCcw, Activity, CheckCircle2, Clock, AlertTriangle, Terminal, ChevronDown, ChevronUp } from "lucide-react";

interface LangflowPipelineCanvasProps {
  nodes: LangflowAgentNode[];
  activeNodeId: string | null;
  isRunning: boolean;
  logs: ExecutionLogItem[];
  onRunFullPipeline: () => void;
  onResetPipeline: () => void;
  onSelectNode: (nodeId: string) => void;
}

export default function LangflowPipelineCanvas({
  nodes,
  activeNodeId,
  isRunning,
  logs,
  onRunFullPipeline,
  onResetPipeline,
  onSelectNode,
}: LangflowPipelineCanvasProps) {
  const [showLogs, setShowLogs] = useState(false);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden mb-6">
      {/* Canvas Top Bar */}
      <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
            <span className="material-icons-round text-xl">account_tree</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-slate-900 text-base">Agentic Pipeline Orchestrator</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-indigo-100 text-indigo-700">
                Langflow Engine
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Orkestrasi alur perencanaan kesehatan berbasis bukti OOPP secara multi-agen dan deterministik.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLogs(!showLogs)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              showLogs ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            Live Logs ({logs.length})
            {showLogs ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={onResetPipeline}
            disabled={isRunning}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>

          <button
            onClick={onRunFullPipeline}
            disabled={isRunning}
            className="flex items-center gap-2 px-4 py-1.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 shadow-sm shadow-teal-200 disabled:opacity-60 transition-all cursor-pointer"
          >
            {isRunning ? (
              <>
                <span className="material-icons-round text-sm animate-spin">refresh</span>
                Orkestrasi Berjalan...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Jalankan Pipeline Penuh
              </>
            )}
          </button>
        </div>
      </div>

      {/* Visual Canvas - Flow Nodes */}
      <div className="p-6 overflow-x-auto bg-gradient-to-b from-slate-50/30 to-white">
        <div className="min-w-[980px] flex items-center justify-between gap-3 relative py-4">
          {nodes.map((node, index) => {
            const isSelected = activeNodeId === node.id;
            const isCompleted = node.status === "completed";
            const isNodeRunning = node.status === "running";

            let borderStyle = "border-slate-200 bg-white";
            let badgeBg = "bg-slate-100 text-slate-600";
            if (isCompleted) {
              borderStyle = "border-emerald-300 bg-emerald-50/40 shadow-sm shadow-emerald-100";
              badgeBg = "bg-emerald-100 text-emerald-700";
            } else if (isNodeRunning) {
              borderStyle = "border-teal-500 bg-teal-50/60 ring-2 ring-teal-200 animate-pulse";
              badgeBg = "bg-teal-600 text-white";
            }

            return (
              <React.Fragment key={node.id}>
                {/* Single Agent Node */}
                <div
                  onClick={() => onSelectNode(node.id)}
                  className={`flex-1 max-w-[170px] min-w-[140px] p-3 rounded-2xl border transition-all cursor-pointer select-none hover:shadow-md ${borderStyle} ${
                    isSelected ? "ring-2 ring-indigo-500 shadow-md" : ""
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[10px] flex items-center justify-center">
                      {node.node_number}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${badgeBg}`}>
                      {node.status}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-800 line-clamp-1 mb-0.5" title={node.title}>
                    {node.title}
                  </h3>
                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-tight">
                    {node.agent_role}
                  </p>

                  <div className="mt-2 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[10px] text-slate-400">
                    <div className="flex items-center gap-1">
                      {isCompleted ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : isNodeRunning ? (
                        <Activity className="w-3 h-3 text-teal-600 animate-spin" />
                      ) : (
                        <Clock className="w-3 h-3 text-slate-400" />
                      )}
                      <span>{isCompleted ? "Siap" : isNodeRunning ? "Aktif" : "Antrean"}</span>
                    </div>
                  </div>
                </div>

                {/* Connecting arrow / pulse line */}
                {index < nodes.length - 1 && (
                  <div className="flex items-center justify-center px-0.5">
                    <div className={`h-0.5 w-5 ${isCompleted ? "bg-emerald-400" : "bg-slate-200"} relative`}>
                      <div
                        className={`absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 transform rotate-45 ${
                          isCompleted ? "border-emerald-400" : "border-slate-300"
                        }`}
                      />
                    </div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Terminal / Live Logs Viewer */}
      {showLogs && (
        <div className="bg-slate-900 border-t border-slate-800 p-4 text-xs font-mono text-slate-300 max-h-56 overflow-y-auto">
          <div className="flex items-center justify-between text-[11px] text-slate-400 pb-2 mb-2 border-b border-slate-800">
            <span className="flex items-center gap-1.5 text-teal-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              SIGMA Langflow Execution Stream
            </span>
            <span>Total: {logs.length} entri log</span>
          </div>

          {logs.length === 0 ? (
            <p className="text-slate-500 italic">Belum ada eksekusi pipeline yang tercatat. Klik "Jalankan Pipeline Penuh".</p>
          ) : (
            <div className="space-y-1.5">
              {logs.map((log) => {
                let color = "text-slate-300";
                if (log.level === "success") color = "text-emerald-400 font-medium";
                if (log.level === "warn") color = "text-amber-300";
                if (log.level === "error") color = "text-rose-400 font-bold";

                return (
                  <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                    <span className="text-slate-500 shrink-0">[{log.timestamp}]</span>
                    <span className="px-1 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400 font-bold shrink-0">
                      {log.node_id}
                    </span>
                    <span className={color}>{log.message}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
