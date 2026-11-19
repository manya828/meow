import React, { useState, useEffect } from 'react';
import { Database } from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const DbStatusBadge: React.FC = () => {
  const { openSqlWorkbench, canAccessDbmsStudio } = useAuth();
  const [status, setStatus] = useState<{ isConnectedToMysql: boolean; activeEngine: string } | null>(null);

  useEffect(() => {
    if (!canAccessDbmsStudio) {
      setStatus(null);
      return;
    }

    api.getDbStatus()
      .then((data) => {
        setStatus({
          isConnectedToMysql: data.isConnectedToMysql,
          activeEngine: data.activeEngine,
        });
      })
      .catch(() => {});
  }, [canAccessDbmsStudio]);

  if (!canAccessDbmsStudio) {
    return null;
  }

  return (
    <button
      onClick={openSqlWorkbench}
      title={
        status?.isConnectedToMysql
          ? 'Open CarpoolX DBMS Studio (Connected: MySQL carpoolx)'
          : 'Open CarpoolX DBMS Studio (ACID Relational Engine)'
      }
      className="group flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#0D1628] border border-cyan-500/30 hover:border-cyan-400/60 hover:bg-[#111D35] text-xs font-semibold text-cyan-200 hover:text-white transition-all shadow-sm cursor-pointer whitespace-nowrap shrink-0"
    >
      <Database className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-110 transition-transform" />
      <span>DBMS Studio</span>
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          status?.isConnectedToMysql ? 'bg-emerald-400' : 'bg-cyan-400'
        }`}
      />
    </button>
  );
};
