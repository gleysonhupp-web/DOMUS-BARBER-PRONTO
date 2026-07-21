"use client";

import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import Card from '../ui/Card';
import { formatCurrency } from '../../lib/utils';
import { SectionHeader } from '../ui/DashboardWidgets';

interface ChartProps {
  title: string;
  description?: string;
  data: any[];
}

// Global colors based on Domus Design Language
const COLORS = {
  primary: '#D97706', // Amber/Bronze
  secondary: '#3B82F6', // Blue
  success: '#10B981', // Green
  destructive: '#EF4444', // Red
  muted: '#94A3B8', // Slate
  cardBg: '#161D2E',
  grid: '#334155'
};

const CustomTooltip = ({ active, payload, label, formatter }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1E293B] border border-border/40 p-3 rounded-lg shadow-xl text-xs">
        <p className="font-bold text-foreground mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-muted-foreground">{entry.name}:</span>
            <span className="font-extrabold" style={{ color: entry.color }}>
              {formatter ? formatter(entry.value) : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

// 1. Revenue by Day (Bar)
export function RevenueChart({ title, description, data }: ChartProps) {
  return (
    <Card className="p-4 border border-border/40 flex flex-col h-[350px]">
      <SectionHeader title={title} description={description} />
      <div className="flex-1 mt-4">
        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} opacity={0.3} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.muted }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.muted }} tickFormatter={(val) => `R$ ${val}`} />
            <Tooltip content={<CustomTooltip formatter={(val: number) => formatCurrency(val)} />} cursor={{ fill: 'rgba(255,255,255,0.02)' }} />
            <Bar dataKey="revenue" name="Faturamento" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={32} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// 2. Cashflow (Composed/Area)
export function CashflowChart({ title, description, data }: ChartProps) {
  return (
    <Card className="p-4 border border-border/40 flex flex-col h-[350px]">
      <SectionHeader title={title} description={description} />
      <div className="flex-1 mt-4">
        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.success} stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.destructive} stopOpacity={0.3}/>
                <stop offset="95%" stopColor={COLORS.destructive} stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} opacity={0.3} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.muted }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.muted }} tickFormatter={(val) => `R$ ${val}`} />
            <Tooltip content={<CustomTooltip formatter={(val: number) => formatCurrency(val)} />} />
            <Area type="monotone" dataKey="income" name="Entradas" stroke={COLORS.success} fillOpacity={1} fill="url(#colorIncome)" strokeWidth={2} />
            <Area type="monotone" dataKey="expense" name="Saídas" stroke={COLORS.destructive} fillOpacity={1} fill="url(#colorExpense)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// 3. Appointments by Day (Line)
export function AppointmentsChart({ title, description, data }: ChartProps) {
  return (
    <Card className="p-4 border border-border/40 flex flex-col h-[350px]">
      <SectionHeader title={title} description={description} />
      <div className="flex-1 mt-4">
        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={COLORS.grid} opacity={0.3} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.muted }} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: COLORS.muted }} />
            <Tooltip content={<CustomTooltip />} />
            <Line type="monotone" dataKey="appointments" name="Agendamentos" stroke={COLORS.secondary} strokeWidth={3} dot={{ r: 4, fill: COLORS.cardBg, strokeWidth: 2 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// 4. Top Services (Pie)
export function TopServicesChart({ title, description, data }: ChartProps) {
  const PIE_COLORS = [COLORS.primary, COLORS.secondary, COLORS.success, '#F59E0B', '#8B5CF6', '#EC4899'];
  
  return (
    <Card className="p-4 border border-border/40 flex flex-col h-[350px]">
      <SectionHeader title={title} description={description} />
      <div className="flex-1 mt-4 flex items-center justify-center">
        <ResponsiveContainer width="99%" height="100%" minWidth={0}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} cursor={false} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-2">
        {data.slice(0,4).map((entry, index) => (
          <div key={index} className="flex items-center gap-1.5 text-[10px]">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }} />
            <span className="text-muted-foreground truncate">{entry.name}</span>
            <span className="font-bold ml-auto">{entry.value}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}
