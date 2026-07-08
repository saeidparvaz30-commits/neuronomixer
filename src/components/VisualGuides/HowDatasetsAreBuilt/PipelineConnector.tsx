"use client";

import React from "react";
import { motion } from "framer-motion";

type Props = { activated: boolean; color: string };

function PipelineConnectorInner({ activated, color }: Props) {
  return (
    <div className="flex flex-col items-center my-1 relative" style={{ height: 44 }}>
      {/* Dashed base */}
      <svg width="2" height="44" className="absolute top-0">
        <line x1="1" y1="0" x2="1" y2="44" stroke="#1e293b" strokeWidth="2" strokeDasharray="6 3" />
      </svg>

      {/* Animated fill */}
      {activated && (
        <motion.div
          className="absolute top-0 rounded-full"
          initial={{ height: 0 }}
          animate={{ height: 38 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          style={{ width: 2, background: color }}
        />
      )}

      {/* Arrowhead */}
      <div className="absolute bottom-0">
        <svg width="8" height="6" viewBox="0 0 8 6">
          <path d="M4 6L0 0h8z" fill={activated ? color : "#1e293b"} />
        </svg>
      </div>

      {/* Traveling dot */}
      {activated && (
        <motion.div
          className="absolute rounded-full"
          style={{ width: 6, height: 6, background: color, left: "50%", x: "-50%" }}
          animate={{ top: ["0%", "80%"] }}
          transition={{ duration: 1.1, repeat: Infinity, ease: "linear", delay: 0.4 }}
        />
      )}
    </div>
  );
}

const PipelineConnector = React.memo(PipelineConnectorInner);
export default PipelineConnector;
