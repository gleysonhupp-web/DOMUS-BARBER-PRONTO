// types/index.ts

export type UserRole = 'owner' | 'admin' | 'professional' | 'receptionist';
export type MemberStatus = 'active' | 'suspended' | 'pending';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
export type TransactionType = 'income' | 'expense';
export type TransactionCategory = 'sale_product' | 'service_appointment' | 'rent' | 'wage' | 'supplies' | 'marketing' | 'commission' | 'other';
export type PaymentMethod = 'cash' | 'credit_card' | 'debit_card' | 'pix' | 'bank_slip';
export type StockMovementType = 'in' | 'out';
export type StockMovementReason = 'purchase' | 'sale' | 'adjustment' | 'damage' | 'use';
export type WhatsAppConnectionStatus = 'connected' | 'disconnected' | 'connecting' | 'qr_ready';
export type AIConversationStatus = 'active' | 'paused' | 'closed';
export type SubscriptionStatus = 'trial' | 'active' | 'past_due' | 'canceled' | 'unpaid';

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string | null;
  theme_config?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string | null;
  phone?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role_id: UserRole;
  status: MemberStatus;
  created_at: string;
  updated_at: string;
  user?: UserProfile;
}

export interface Service {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  duration_minutes: number;
  price: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Professional {
  id: string;
  company_id: string;
  user_id?: string | null;
  name: string;
  bio?: string | null;
  avatar_url?: string | null;
  commission_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  document?: string | null;
  birth_date?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  company_id: string;
  client_id: string;
  professional_id: string;
  service_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string | null;
  total_price: number;
  created_at: string;
  updated_at: string;
  client?: Client;
  professional?: Professional;
  service?: Service;
}

export interface Product {
  id: string;
  company_id: string;
  name: string;
  description?: string | null;
  price: number;
  cost_price?: number | null;
  sku?: string | null;
  stock_qty: number;
  min_stock_qty: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  company_id: string;
  product_id: string;
  type: StockMovementType;
  quantity: number;
  reason: StockMovementReason;
  unit_cost?: number | null;
  created_at: string;
  created_by?: string | null;
  product?: Product;
}

export interface FinancialTransaction {
  id: string;
  company_id: string;
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description?: string | null;
  date: string;
  payment_method?: PaymentMethod | null;
  appointment_id?: string | null;
  created_at: string;
  updated_at: string;
  appointment?: Appointment;
}

export interface WhatsAppConnection {
  id: string;
  company_id: string;
  status: WhatsAppConnectionStatus;
  phone_number?: string | null;
  instance_name?: string | null;
  qr_code?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AIConversation {
  id: string;
  company_id: string;
  whatsapp_connection_id: string;
  client_phone: string;
  status: AIConversationStatus;
  summary?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  is_active: boolean;
  created_at: string;
}

export interface CompanySubscription {
  id: string;
  company_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  current_period_start: string;
  current_period_end: string;
  created_at: string;
  updated_at: string;
  plan?: SubscriptionPlan;
}

export interface AuditLog {
  id: string;
  company_id?: string | null;
  user_id?: string | null;
  action: string;
  details: Record<string, any>;
  ip_address?: string | null;
  created_at: string;
  user?: UserProfile;
}
