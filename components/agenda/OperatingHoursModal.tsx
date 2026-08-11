// components/agenda/OperatingHoursModal.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { X, Clock, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { db } from '../../services/db';
import type { DayOperatingHours } from '../../types';
import { useToast } from '../ui/Toast';

interface OperatingHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyId: string;
  onSaved?: () => void;
}

export const OperatingHoursModal: React.FC<OperatingHoursModalProps> = ({
  isOpen,
  onClose,
  companyId,
  onSaved
}) => {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<DayOperatingHours[]>(() => {
    return companyId ? db.getOperatingHours(companyId) : [];
  });

  useEffect(() => {
    if (isOpen && companyId) {
      setSchedule(db.getOperatingHours(companyId));
    }
  }, [isOpen, companyId]);

  if (!isOpen) return null;

  const handleToggleDay = (index: number) => {
    setSchedule(prev => {
      const next = [...prev];
      next[index] = { ...next[index], active: !next[index].active };
      return next;
    });
  };

  const handleTimeChange = (
    index: number,
    field: 'openTime' | 'lunchStart' | 'lunchEnd' | 'closeTime',
    val: string
  ) => {
    setSchedule(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: val };
      return next;
    });
  };

  const handleSave = () => {
    if (!companyId) return;
    db.saveOperatingHours(companyId, schedule);
    toast(
      'Horários de atendimento e dias de funcionamento atualizados com sucesso!',
      'success',
      '🟢 Horários Salvos'
    );
    if (onSaved) onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-[#0E121B] border border-gray-800/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-left">
        
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-gray-800/80 bg-[#121622] flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white tracking-wide">Horário de Atendimento</h2>
              <p className="text-xs text-gray-400 mt-0.5">Defina os dias em que a agenda estará aberta e os horários de trabalho.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-800/60 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Days List Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 no-scrollbar">
          {schedule.map((day, i) => (
            <div key={day.dayKey} className="space-y-3">
              
              {/* Day Header Row */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-black tracking-wider text-gray-200 uppercase">
                  {day.dayName}
                </span>

                <div className="flex-1 h-px bg-gray-800/80 mx-3" />

                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[11px] font-extrabold tracking-wide uppercase transition-colors",
                    day.active ? "text-emerald-400" : "text-gray-500"
                  )}>
                    {day.active ? 'ATENDENDO' : 'NÃO ATENDENDO'}
                  </span>

                  {/* Switch Toggle */}
                  <button
                    type="button"
                    onClick={() => handleToggleDay(i)}
                    className={cn(
                      "w-12 h-6 rounded-full p-1 transition-all duration-300 flex items-center cursor-pointer select-none",
                      day.active ? "bg-emerald-500 justify-end shadow-md shadow-emerald-500/20" : "bg-[#2A303F] justify-start"
                    )}
                  >
                    <div className="w-4 h-4 rounded-full bg-white shadow-md transform transition-transform" />
                  </button>
                </div>
              </div>

              {/* Time Pickers Cards Row */}
              <div className={cn(
                "grid grid-cols-4 gap-2 transition-all duration-200",
                !day.active ? "opacity-30 pointer-events-none grayscale" : "opacity-100"
              )}>
                {/* INÍCIO */}
                <div className="bg-[#1A1E29] border border-gray-800/80 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center hover:border-amber-500/40 transition-colors">
                  <input
                    type="time"
                    value={day.openTime}
                    onChange={(e) => handleTimeChange(i, 'openTime', e.target.value)}
                    className="bg-transparent text-center font-extrabold text-sm sm:text-base text-white outline-none w-full cursor-pointer font-mono"
                  />
                  <span className="text-[9px] font-bold text-gray-400 block mt-1 uppercase tracking-wider">
                    INÍCIO
                  </span>
                </div>

                {/* ALMOÇO INÍCIO */}
                <div className="bg-[#1A1E29] border border-gray-800/80 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center hover:border-amber-500/40 transition-colors">
                  <input
                    type="time"
                    value={day.lunchStart}
                    onChange={(e) => handleTimeChange(i, 'lunchStart', e.target.value)}
                    className="bg-transparent text-center font-extrabold text-sm sm:text-base text-gray-300 outline-none w-full cursor-pointer font-mono"
                  />
                  <span className="text-[9px] font-bold text-gray-500 block mt-1 uppercase tracking-wider">
                    ALMOÇO
                  </span>
                </div>

                {/* ALMOÇO FIM */}
                <div className="bg-[#1A1E29] border border-gray-800/80 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center hover:border-amber-500/40 transition-colors">
                  <input
                    type="time"
                    value={day.lunchEnd}
                    onChange={(e) => handleTimeChange(i, 'lunchEnd', e.target.value)}
                    className="bg-transparent text-center font-extrabold text-sm sm:text-base text-gray-300 outline-none w-full cursor-pointer font-mono"
                  />
                  <span className="text-[9px] font-bold text-gray-500 block mt-1 uppercase tracking-wider">
                    RETORNO
                  </span>
                </div>

                {/* FIM */}
                <div className="bg-[#1A1E29] border border-gray-800/80 rounded-2xl p-2.5 flex flex-col items-center justify-center text-center hover:border-amber-500/40 transition-colors">
                  <input
                    type="time"
                    value={day.closeTime}
                    onChange={(e) => handleTimeChange(i, 'closeTime', e.target.value)}
                    className="bg-transparent text-center font-extrabold text-sm sm:text-base text-white outline-none w-full cursor-pointer font-mono"
                  />
                  <span className="text-[9px] font-bold text-gray-400 block mt-1 uppercase tracking-wider">
                    FIM
                  </span>
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Modal Footer / Save Button */}
        <div className="p-4 sm:p-5 border-t border-gray-800/80 bg-[#121622]">
          <button
            type="button"
            onClick={handleSave}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#D28859] via-[#B86D43] to-[#9E5732] hover:brightness-110 active:scale-[0.99] text-white font-black text-sm uppercase tracking-widest transition-all shadow-xl shadow-amber-900/30 cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" /> SALVAR
          </button>
        </div>

      </div>
    </div>
  );
};
export default OperatingHoursModal;
