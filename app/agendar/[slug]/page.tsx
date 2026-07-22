'use client';

import React, { useState, useEffect, useCallback, useMemo, use } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ScissorsLineDashed,
  Clock,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  Calendar,
  CalendarPlus,
  Phone,
  Mail,
  FileText,
  Sparkles,
  Users,
  AlertCircle,
} from 'lucide-react';
import {
  format,
  addDays,
  startOfDay,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  addMinutes,
  isSameDay,
  parseISO,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { db } from '../../../services/db';
import { formatCurrency } from '../../../lib/utils';
import type {
  Company,
  Service,
  Professional,
  Appointment,
  Client,
} from '../../../types';

// ─── Constants ───────────────────────────────────────────────────────
const STEPS = [
  'Início',
  'Serviço',
  'Profissional',
  'Data & Hora',
  'Seus Dados',
  'Confirmação',
];

const TIME_SLOT_START = 8; // 08:00
const TIME_SLOT_END = 20; // 20:00
const TIME_SLOT_INTERVAL = 30; // minutes
const DAYS_AHEAD = 14;

// ─── Slide variants ──────────────────────────────────────────────────
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 300 : -300,
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({
    x: direction > 0 ? -300 : 300,
    opacity: 0,
  }),
};

// ─── Phone mask helper ───────────────────────────────────────────────
function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7)
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

function stripPhone(value: string): string {
  return value.replace(/\D/g, '');
}

// ─── .ics helper ─────────────────────────────────────────────────────
function generateICS(
  companyName: string,
  serviceName: string,
  professionalName: string,
  startTime: Date,
  endTime: Date,
): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const toICS = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}00Z`;

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Domus Barber//Agendamento//PT',
    'BEGIN:VEVENT',
    `DTSTART:${toICS(startTime)}`,
    `DTEND:${toICS(endTime)}`,
    `SUMMARY:${serviceName} - ${companyName}`,
    `DESCRIPTION:Profissional: ${professionalName}\\nServiço: ${serviceName}\\nLocal: ${companyName}`,
    `LOCATION:${companyName}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

function downloadICS(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Step Indicator ──────────────────────────────────────────────────
function StepIndicator({
  currentStep,
  totalSteps,
}: {
  currentStep: number;
  totalSteps: number;
}) {
  return (
    <div className="flex items-center justify-center gap-2 py-4">
      {Array.from({ length: totalSteps }).map((_, i) => (
        <motion.div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === currentStep
              ? 'h-3 w-8 bg-gradient-to-r from-amber-500 to-amber-600'
              : i < currentStep
                ? 'h-3 w-3 bg-amber-500/60'
                : 'h-3 w-3 bg-white/10'
          }`}
          layout
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════
export default function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  // ── State ────────────────────────────────────────────────────────
  // ── State ────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState<Company | null>(() => db.getCompanyBySlug(slug));
  const [services, setServices] = useState<Service[]>(() => {
    const comp = db.getCompanyBySlug(slug);
    return comp ? db.getServices(comp.id).filter((s) => s.is_active) : [];
  });
  const [professionals, setProfessionals] = useState<Professional[]>(() => {
    const comp = db.getCompanyBySlug(slug);
    return comp ? db.getProfessionals(comp.id).filter((p) => p.is_active) : [];
  });
  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const comp = db.getCompanyBySlug(slug);
    return comp ? db.getAppointments(comp.id) : [];
  });

  // Wizard
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Selections
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] =
    useState<Professional | null>(null);
  const [anyProfessional, setAnyProfessional] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(
    startOfDay(new Date()),
  );
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  // Customer form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');

  // Submission
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [confirmedAppointment, setConfirmedAppointment] =
    useState<Appointment | null>(null);

  // ── Data loading ─────────────────────────────────────────────────
  useEffect(() => {
    const comp = db.getCompanyBySlug(slug);
    if (comp) {
      setCompany(comp);
      setServices(db.getServices(comp.id).filter((s) => s.is_active));
      setProfessionals(
        db.getProfessionals(comp.id).filter((p) => p.is_active),
      );
      setAppointments(db.getAppointments(comp.id));
    }
  }, [slug]);

  // ── Navigation ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    setDirection(1);
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setStep((s) => Math.max(s - 1, 0));
  }, []);

  // ── Date range (next 14 days) ────────────────────────────────────
  const dateRange = useMemo(() => {
    const today = startOfDay(new Date());
    return Array.from({ length: DAYS_AHEAD }, (_, i) => addDays(today, i));
  }, []);

  // ── Time slots ───────────────────────────────────────────────────
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let h = TIME_SLOT_START; h < TIME_SLOT_END; h++) {
      for (let m = 0; m < 60; m += TIME_SLOT_INTERVAL) {
        slots.push(
          `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`,
        );
      }
    }
    return slots;
  }, []);

  // ── Slot availability check ──────────────────────────────────────
  const isSlotOccupied = useCallback(
    (date: Date, timeStr: string, profId: string | null): boolean => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const slotStart = setMinutes(setHours(new Date(date), hours), minutes);
      const duration = selectedService?.duration_minutes ?? 30;
      const slotEnd = addMinutes(slotStart, duration);

      // Block past times
      if (isBefore(slotStart, new Date())) return true;

      // Check conflicting appointments
      const relevantAppts = appointments.filter(
        (apt) =>
          apt.status !== 'cancelled' && apt.status !== 'no_show',
      );

      if (anyProfessional && profId === null) {
        // "Any professional" — slot is occupied only if ALL professionals are busy
        const activePros = professionals;
        return activePros.every((pro) => {
          return relevantAppts.some((apt) => {
            if (apt.professional_id !== pro.id) return false;
            const aptStart = parseISO(apt.start_time);
            const aptEnd = parseISO(apt.end_time);
            return isBefore(slotStart, aptEnd) && isAfter(slotEnd, aptStart);
          });
        });
      } else {
        // Specific professional
        return relevantAppts.some((apt) => {
          if (apt.professional_id !== profId) return false;
          const aptStart = parseISO(apt.start_time);
          const aptEnd = parseISO(apt.end_time);
          return isBefore(slotStart, aptEnd) && isAfter(slotEnd, aptStart);
        });
      }
    },
    [appointments, selectedService, anyProfessional, professionals],
  );

  // ── Determine the professional for an "any" booking ──────────────
  const findAvailableProfessional = useCallback(
    (date: Date, timeStr: string): Professional | null => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const slotStart = setMinutes(setHours(new Date(date), hours), minutes);
      const duration = selectedService?.duration_minutes ?? 30;
      const slotEnd = addMinutes(slotStart, duration);

      const relevantAppts = appointments.filter(
        (apt) =>
          apt.status !== 'cancelled' && apt.status !== 'no_show',
      );

      for (const pro of professionals) {
        const hasConflict = relevantAppts.some((apt) => {
          if (apt.professional_id !== pro.id) return false;
          const aptStart = parseISO(apt.start_time);
          const aptEnd = parseISO(apt.end_time);
          return isBefore(slotStart, aptEnd) && isAfter(slotEnd, aptStart);
        });
        if (!hasConflict) return pro;
      }
      return null;
    },
    [appointments, selectedService, professionals],
  );

  // ── Confirm booking ─────────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!company || !selectedService || !selectedTime) return;
    setIsSubmitting(true);

    try {
      // Resolve professional
      let finalProfessional = selectedProfessional;
      if (anyProfessional) {
        finalProfessional = findAvailableProfessional(
          selectedDate,
          selectedTime,
        );
      }
      if (!finalProfessional) {
        alert('Nenhum profissional disponível para este horário.');
        setIsSubmitting(false);
        return;
      }

      // Build start/end times
      const [h, m] = selectedTime.split(':').map(Number);
      const startTime = setMinutes(
        setHours(new Date(selectedDate), h),
        m,
      );
      const endTime = addMinutes(
        startTime,
        selectedService.duration_minutes,
      );

      // Check / create client
      const cleanPhone = stripPhone(customerPhone);
      let client = db.getClientByPhone(company.id, cleanPhone);
      if (!client) {
        client = db.addClient({
          id: `cli-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          company_id: company.id,
          name: customerName,
          email: customerEmail || null,
          phone: cleanPhone,
          document: null,
          birth_date: null,
          notes: customerNotes || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }

      // Create appointment
      const appointment = db.addAppointment({
        id: `apt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        company_id: company.id,
        client_id: client.id,
        professional_id: finalProfessional.id,
        service_id: selectedService.id,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        status: 'scheduled',
        notes: customerNotes || null,
        total_price: selectedService.price,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        professional: finalProfessional,
        service: selectedService,
        client,
      });

      setConfirmedAppointment(appointment);
      setIsConfirmed(true);
    } catch {
      alert('Erro ao confirmar agendamento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    company,
    selectedService,
    selectedTime,
    selectedProfessional,
    anyProfessional,
    selectedDate,
    customerName,
    customerPhone,
    customerEmail,
    customerNotes,
    findAvailableProfessional,
  ]);

  // ── Download calendar ────────────────────────────────────────────
  const handleDownloadICS = useCallback(() => {
    if (!confirmedAppointment || !company) return;
    const start = parseISO(confirmedAppointment.start_time);
    const end = parseISO(confirmedAppointment.end_time);
    const ics = generateICS(
      company.name,
      confirmedAppointment.service?.name ?? 'Serviço',
      confirmedAppointment.professional?.name ?? 'Profissional',
      start,
      end,
    );
    downloadICS(ics, `agendamento-${company.slug}.ics`);
  }, [confirmedAppointment, company]);

  // ── Can proceed checks ──────────────────────────────────────────
  const canProceed = useMemo(() => {
    switch (step) {
      case 0:
        return true;
      case 1:
        return !!selectedService;
      case 2:
        return !!selectedProfessional || anyProfessional;
      case 3:
        return !!selectedTime;
      case 4:
        return customerName.trim().length >= 2 && stripPhone(customerPhone).length >= 10;
      case 5:
        return true;
      default:
        return false;
    }
  }, [
    step,
    selectedService,
    selectedProfessional,
    anyProfessional,
    selectedTime,
    customerName,
    customerPhone,
  ]);

  // ═══════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
        >
          <ScissorsLineDashed className="w-10 h-10 text-amber-500" />
        </motion.div>
      </div>
    );
  }

  // 404
  if (!company) {
    return (
      <div className="min-h-screen bg-[#0B0F19] flex flex-col items-center justify-center gap-6 p-6">
        <div className="rounded-full bg-[#161D2E] p-6">
          <AlertCircle className="w-12 h-12 text-amber-500" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          Barbearia não encontrada
        </h1>
        <p className="text-white/50 text-center max-w-md">
          O link que você acessou não corresponde a nenhuma barbearia cadastrada.
          Verifique o endereço e tente novamente.
        </p>
      </div>
    );
  }

  // ─── Step renderers ──────────────────────────────────────────────

  const renderStep0_Welcome = () => (
    <motion.div
      key="step-0"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="flex flex-col items-center justify-center text-center gap-8 py-12 px-4"
    >
      {/* Hero logo */}
      <div className="relative">
        <div className="absolute inset-0 rounded-full bg-amber-500/20 blur-3xl scale-150" />
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', delay: 0.2 }}
          className="relative rounded-2xl bg-black border-2 border-amber-500/40 p-2 shadow-2xl shadow-amber-500/20 w-32 h-32 overflow-hidden flex items-center justify-center"
        >
          <img src="/logo.jpg" alt="DOMUS BARBER CLUB" className="w-full h-full object-cover rounded-xl" />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <h1 className="text-3xl sm:text-4xl font-bold text-white">
          {company.name}
        </h1>
        <p className="text-lg text-amber-500/80 font-medium">
          Agende seu horário online
        </p>
        <p className="text-sm text-white/40 max-w-sm">
          Escolha o serviço, profissional, data e horário para garantir seu
          atendimento.
        </p>
      </motion.div>

      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        whileHover={{ scale: 1.03, y: -2 }}
        whileTap={{ scale: 0.97 }}
        onClick={goNext}
        className="px-10 py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl shadow-xl shadow-amber-500/25 text-lg transition-all hover:shadow-amber-500/40"
      >
        <span className="flex items-center gap-3">
          <Sparkles className="w-5 h-5" />
          Agendar Agora
        </span>
      </motion.button>
    </motion.div>
  );

  const renderStep1_Services = () => (
    <motion.div
      key="step-1"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-6 px-4 py-6"
    >
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white">Escolha o Serviço</h2>
        <p className="text-sm text-white/40">
          Selecione o serviço desejado
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {services.map((service) => {
          const isSelected = selectedService?.id === service.id;
          return (
            <motion.button
              key={service.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelectedService(service)}
              className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                  : 'border-[#1E293B] bg-[#161D2E] hover:border-white/20'
              }`}
            >
              {isSelected && (
                <motion.div
                  layoutId="service-check"
                  className="absolute top-3 right-3 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"
                >
                  <Check className="w-4 h-4 text-white" />
                </motion.div>
              )}
              <h3 className="font-semibold text-white pr-8">
                {service.name}
              </h3>
              {service.description && (
                <p className="text-xs text-white/40 mt-1 line-clamp-2">
                  {service.description}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <span className="flex items-center gap-1 text-xs text-white/50">
                  <Clock className="w-3.5 h-3.5" />
                  {service.duration_minutes} min
                </span>
                <span className="text-sm font-bold text-amber-500">
                  {formatCurrency(service.price)}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {services.length === 0 && (
        <div className="text-center py-12 text-white/30">
          <ScissorsLineDashed className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>Nenhum serviço disponível no momento.</p>
        </div>
      )}
    </motion.div>
  );

  const renderStep2_Professionals = () => (
    <motion.div
      key="step-2"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-6 px-4 py-6"
    >
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white">
          Escolha o Profissional
        </h2>
        <p className="text-sm text-white/40">
          Quem você prefere para o atendimento?
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* "Any professional" option */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => {
            setAnyProfessional(true);
            setSelectedProfessional(null);
          }}
          className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 sm:col-span-2 ${
            anyProfessional
              ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
              : 'border-[#1E293B] bg-[#161D2E] hover:border-white/20'
          }`}
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
              <Users className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                Qualquer Profissional Disponível
              </h3>
              <p className="text-xs text-white/40 mt-0.5">
                Vamos selecionar o primeiro profissional livre
              </p>
            </div>
            {anyProfessional && (
              <motion.div
                layoutId="pro-check"
                className="ml-auto w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0"
              >
                <Check className="w-4 h-4 text-white" />
              </motion.div>
            )}
          </div>
        </motion.button>

        {professionals.map((pro) => {
          const isSelected =
            !anyProfessional && selectedProfessional?.id === pro.id;
          return (
            <motion.button
              key={pro.id}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setAnyProfessional(false);
                setSelectedProfessional(pro);
              }}
              className={`relative text-left p-5 rounded-xl border-2 transition-all duration-200 ${
                isSelected
                  ? 'border-amber-500 bg-amber-500/10 shadow-lg shadow-amber-500/10'
                  : 'border-[#1E293B] bg-[#161D2E] hover:border-white/20'
              }`}
            >
              <div className="flex items-center gap-4">
                {pro.avatar_url ? (
                  <img
                    src={pro.avatar_url}
                    alt={pro.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-[#1E293B]"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                      (
                        e.target as HTMLImageElement
                      ).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                <div
                  className={`w-14 h-14 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/20 flex items-center justify-center text-amber-500 font-bold text-lg border-2 border-[#1E293B] ${pro.avatar_url ? 'hidden' : ''}`}
                >
                  {pro.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-white truncate">
                    {pro.name}
                  </h3>
                  {pro.bio && (
                    <p className="text-xs text-white/40 mt-0.5 line-clamp-2">
                      {pro.bio}
                    </p>
                  )}
                </div>
                {isSelected && (
                  <motion.div
                    layoutId="pro-check"
                    className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0"
                  >
                    <Check className="w-4 h-4 text-white" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );

  const renderStep3_DateTime = () => (
    <motion.div
      key="step-3"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-6 px-4 py-6"
    >
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white">Data & Horário</h2>
        <p className="text-sm text-white/40">
          Escolha quando deseja ser atendido
        </p>
      </div>

      {/* Date pills - horizontal scroll */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/60 flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Dia
        </label>
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {dateRange.map((date) => {
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, new Date());
            return (
              <motion.button
                key={date.toISOString()}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setSelectedDate(date);
                  setSelectedTime(null);
                }}
                className={`flex-shrink-0 flex flex-col items-center min-w-[64px] px-3 py-3 rounded-xl border-2 transition-all duration-200 ${
                  isSelected
                    ? 'border-amber-500 bg-amber-500/15 text-white'
                    : 'border-[#1E293B] bg-[#161D2E] text-white/60 hover:border-white/20'
                }`}
              >
                <span className="text-[10px] uppercase font-medium tracking-wider">
                  {format(date, 'EEE', { locale: ptBR })}
                </span>
                <span className="text-lg font-bold mt-0.5">
                  {format(date, 'dd')}
                </span>
                <span className="text-[10px] opacity-60">
                  {format(date, 'MMM', { locale: ptBR })}
                </span>
                {isToday && (
                  <span className="text-[8px] mt-1 px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 font-semibold">
                    HOJE
                  </span>
                )}
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Time grid */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-white/60 flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Horário
        </label>
        <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
          {timeSlots.map((slot) => {
            const occupied = isSlotOccupied(
              selectedDate,
              slot,
              anyProfessional ? null : selectedProfessional?.id ?? null,
            );
            const isSelected = selectedTime === slot;
            return (
              <motion.button
                key={slot}
                whileTap={!occupied ? { scale: 0.95 } : undefined}
                disabled={occupied}
                onClick={() => setSelectedTime(slot)}
                className={`py-2.5 px-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  occupied
                    ? 'bg-[#161D2E]/50 text-white/15 cursor-not-allowed line-through'
                    : isSelected
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 border-2 border-amber-400'
                      : 'bg-[#161D2E] text-white/70 border-2 border-[#1E293B] hover:border-amber-500/40 hover:text-white'
                }`}
              >
                {slot}
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.div>
  );

  const renderStep4_CustomerInfo = () => (
    <motion.div
      key="step-4"
      custom={direction}
      variants={slideVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="space-y-6 px-4 py-6"
    >
      <div className="text-center space-y-1">
        <h2 className="text-xl font-bold text-white">Seus Dados</h2>
        <p className="text-sm text-white/40">
          Precisamos de algumas informações para confirmar
        </p>
      </div>

      <div className="space-y-4 max-w-md mx-auto">
        {/* Name */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/60 flex items-center gap-2">
            <User className="w-4 h-4" />
            Nome completo *
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="Seu nome"
            className="w-full px-4 py-3 rounded-xl bg-[#161D2E] border-2 border-[#1E293B] text-white placeholder-white/20 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* WhatsApp */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/60 flex items-center gap-2">
            <Phone className="w-4 h-4" />
            WhatsApp *
          </label>
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) =>
              setCustomerPhone(applyPhoneMask(e.target.value))
            }
            placeholder="(11) 99999-9999"
            className="w-full px-4 py-3 rounded-xl bg-[#161D2E] border-2 border-[#1E293B] text-white placeholder-white/20 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/60 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            E-mail (opcional)
          </label>
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            placeholder="seuemail@exemplo.com"
            className="w-full px-4 py-3 rounded-xl bg-[#161D2E] border-2 border-[#1E293B] text-white placeholder-white/20 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-white/60 flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Observação (opcional)
          </label>
          <textarea
            value={customerNotes}
            onChange={(e) => setCustomerNotes(e.target.value)}
            placeholder="Alguma preferência ou observação?"
            rows={3}
            className="w-full px-4 py-3 rounded-xl bg-[#161D2E] border-2 border-[#1E293B] text-white placeholder-white/20 focus:outline-none focus:border-amber-500 transition-colors resize-none"
          />
        </div>
      </div>
    </motion.div>
  );

  const renderStep5_Confirmation = () => {
    // Success screen
    if (isConfirmed && confirmedAppointment) {
      return (
        <motion.div
          key="step-5-success"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="flex flex-col items-center justify-center text-center gap-6 py-12 px-4"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              delay: 0.2,
              stiffness: 200,
              damping: 15,
            }}
            className="relative"
          >
            <div className="absolute inset-0 rounded-full bg-green-500/20 blur-2xl scale-150" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-2xl shadow-green-500/30">
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5, duration: 0.5 }}
              >
                <Check className="w-12 h-12 text-white" strokeWidth={3} />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="space-y-2"
          >
            <h2 className="text-2xl font-bold text-white">
              Agendamento Confirmado!
            </h2>
            <p className="text-sm text-white/40">
              Você receberá uma confirmação no seu WhatsApp
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="w-full max-w-sm bg-[#161D2E] rounded-xl border border-[#1E293B] p-5 space-y-3"
          >
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Serviço</span>
              <span className="text-white font-medium">
                {confirmedAppointment.service?.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Profissional</span>
              <span className="text-white font-medium">
                {confirmedAppointment.professional?.name}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Data</span>
              <span className="text-white font-medium">
                {format(
                  parseISO(confirmedAppointment.start_time),
                  "dd 'de' MMMM",
                  { locale: ptBR },
                )}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/40">Horário</span>
              <span className="text-white font-medium">
                {format(parseISO(confirmedAppointment.start_time), 'HH:mm')}
              </span>
            </div>
            <div className="border-t border-[#1E293B] pt-3 flex justify-between text-sm">
              <span className="text-white/40">Valor</span>
              <span className="text-amber-500 font-bold">
                {formatCurrency(confirmedAppointment.total_price)}
              </span>
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleDownloadICS}
            className="flex items-center gap-2 px-6 py-3 bg-[#161D2E] border-2 border-amber-500/40 text-amber-500 font-semibold rounded-xl hover:bg-amber-500/10 transition-all"
          >
            <CalendarPlus className="w-5 h-5" />
            Adicionar ao Calendário
          </motion.button>
        </motion.div>
      );
    }

    // Summary card before confirm
    const displayProfessional = anyProfessional
      ? 'Qualquer Disponível'
      : selectedProfessional?.name ?? '—';

    const displayDate = format(selectedDate, "EEEE, dd 'de' MMMM", {
      locale: ptBR,
    });

    return (
      <motion.div
        key="step-5"
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="space-y-6 px-4 py-6"
      >
        <div className="text-center space-y-1">
          <h2 className="text-xl font-bold text-white">Confirmar Agendamento</h2>
          <p className="text-sm text-white/40">Revise os detalhes abaixo</p>
        </div>

        <div className="max-w-md mx-auto bg-[#161D2E] rounded-2xl border border-[#1E293B] overflow-hidden">
          {/* Header with gradient */}
          <div className="bg-gradient-to-r from-amber-500/10 to-amber-600/5 p-5 border-b border-[#1E293B]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                <ScissorsLineDashed className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-bold text-white">
                  {selectedService?.name}
                </h3>
                <p className="text-xs text-white/40">
                  {selectedService?.duration_minutes} min
                </p>
              </div>
              <span className="ml-auto text-lg font-bold text-amber-500">
                {formatCurrency(selectedService?.price ?? 0)}
              </span>
            </div>
          </div>

          {/* Details */}
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <User className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <p className="text-xs text-white/40">Profissional</p>
                <p className="text-sm text-white font-medium">
                  {displayProfessional}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Calendar className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <p className="text-xs text-white/40">Data</p>
                <p className="text-sm text-white font-medium capitalize">
                  {displayDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <Clock className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <p className="text-xs text-white/40">Horário</p>
                <p className="text-sm text-white font-medium">
                  {selectedTime}
                </p>
              </div>
            </div>

            <div className="border-t border-[#1E293B] my-2" />

            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center">
                <User className="w-4 h-4 text-white/40" />
              </div>
              <div>
                <p className="text-xs text-white/40">Cliente</p>
                <p className="text-sm text-white font-medium">
                  {customerName}
                </p>
                <p className="text-xs text-white/30">{customerPhone}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-md mx-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white font-bold rounded-xl shadow-xl shadow-amber-500/25 text-base transition-all hover:shadow-amber-500/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{
                    repeat: Infinity,
                    duration: 1,
                    ease: 'linear',
                  }}
                >
                  <ScissorsLineDashed className="w-5 h-5" />
                </motion.div>
                Confirmando...
              </>
            ) : (
              <>
                <Check className="w-5 h-5" />
                Confirmar Agendamento
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    );
  };

  // Step render map
  const stepRenderers = [
    renderStep0_Welcome,
    renderStep1_Services,
    renderStep2_Professionals,
    renderStep3_DateTime,
    renderStep4_CustomerInfo,
    renderStep5_Confirmation,
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19]">
      {/* Ambient background glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-amber-500/[0.03] blur-[100px] rounded-full" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-[#1E293B]/50">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center">
              <ScissorsLineDashed className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white text-sm">
              {company.name}
            </span>
          </div>
          {step > 0 && !isConfirmed && (
            <span className="text-xs text-white/30">
              {step} de {STEPS.length - 1}
            </span>
          )}
        </div>
      </header>

      {/* Step indicator */}
      {step > 0 && !isConfirmed && (
        <div className="max-w-2xl mx-auto">
          <StepIndicator currentStep={step} totalSteps={STEPS.length} />
        </div>
      )}

      {/* Main content */}
      <main className="relative max-w-2xl mx-auto pb-32 overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          {stepRenderers[step]()}
        </AnimatePresence>
      </main>

      {/* Bottom navigation bar */}
      {step > 0 && !isConfirmed && (
        <motion.div
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          className="fixed bottom-0 left-0 right-0 bg-[#0B0F19]/90 backdrop-blur-xl border-t border-[#1E293B]/50"
        >
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={goBack}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-white/60 hover:text-white rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </motion.button>

            {step < STEPS.length - 1 && (
              <motion.button
                whileHover={canProceed ? { scale: 1.03 } : undefined}
                whileTap={canProceed ? { scale: 0.97 } : undefined}
                onClick={goNext}
                disabled={!canProceed}
                className={`flex items-center gap-1.5 px-6 py-2.5 text-sm font-semibold rounded-xl transition-all ${
                  canProceed
                    ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40'
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </motion.div>
      )}

      {/* Hide scrollbar utility */}
      <style jsx global>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
