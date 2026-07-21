// services/db.ts
// Stateful mock database with localStorage persistence for local previewing

import { 
  Company, UserProfile, CompanyMember, Service, Professional, 
  Client, Appointment, Product, StockMovement, FinancialTransaction, 
  WhatsAppConnection, AIConversation, SubscriptionPlan, CompanySubscription, AuditLog 
} from '../types';
import { isMockMode } from '../lib/supabase';

// Key names for localStorage
const KEYS = {
  CURRENT_USER: 'domus_current_user',
  CURRENT_COMPANY: 'domus_current_company',
  COMPANIES: 'domus_companies',
  USER_PROFILES: 'domus_user_profiles',
  MEMBERS: 'domus_members',
  SERVICES: 'domus_services',
  PROFESSIONALS: 'domus_professionals',
  CLIENTS: 'domus_clients',
  APPOINTMENTS: 'domus_appointments',
  PRODUCTS: 'domus_products',
  STOCK_MOVEMENTS: 'domus_stock_movements',
  FINANCIALS: 'domus_financials',
  WHATSAPP: 'domus_whatsapp',
  CONVERSATIONS: 'domus_conversations',
  SUBSCRIPTIONS: 'domus_subscriptions',
  AUDIT_LOGS: 'domus_audit_logs',
};

// Default seed data
const DEFAULT_COMPANY_ID = 'c1111111-1111-1111-1111-111111111111';
const DEFAULT_USER_ID = 'u2222222-2222-2222-2222-222222222222';

const defaultPlans: SubscriptionPlan[] = [
  {
    id: 'plan-domus-199',
    name: 'Plano Único DOMUS',
    description: 'Acesso total a todas as ferramentas do sistema (Agenda, Estoque, Financeiro, WhatsApp IA).',
    price: 199.97,
    interval: 'month',
    features: [
      "Agenda Online Ilimitada", 
      "Link Público de Agendamento", 
      "Atendimento Automático no WhatsApp", 
      "Controle de Estoque e Finanças", 
      "Profissionais Ilimitados"
    ],
    is_active: true,
    created_at: new Date().toISOString()
  }
];

const defaultCompanies: Company[] = [
  {
    id: DEFAULT_COMPANY_ID,
    name: 'Domus Barber Club',
    slug: 'domus-barbershop',
    logo_url: '/logo.jpg',
    theme_config: {},
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultProfiles: UserProfile[] = [
  {
    id: DEFAULT_USER_ID,
    email: 'admin@domusbarber.com.br',
    full_name: 'Arthur Pendragon',
    avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    phone: '11999998888',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultMembers: CompanyMember[] = [
  {
    id: 'm3333333-3333-3333-3333-333333333333',
    company_id: DEFAULT_COMPANY_ID,
    user_id: DEFAULT_USER_ID,
    role_id: 'owner',
    status: 'active',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultServices: Service[] = [
  {
    id: 's1',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Corte Clássico',
    description: 'Corte com tesoura e máquina, acabamento premium com navalha.',
    duration_minutes: 30,
    price: 50.00,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 's2',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Barba Toalha Quente',
    description: 'Barba desenhada com uso de toalha quente e massagem facial.',
    duration_minutes: 30,
    price: 40.00,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 's3',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Combo Domus (Corte + Barba)',
    description: 'O combo supremo para o cavalheiro moderno. Inclui bebida grátis.',
    duration_minutes: 60,
    price: 80.00,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 's4',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Cabelo e Pigmentação',
    description: 'Corte de cabelo seguido por pigmentação capilar ou de barba.',
    duration_minutes: 45,
    price: 70.00,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultProfessionals: Professional[] = [
  {
    id: 'p1',
    company_id: DEFAULT_COMPANY_ID,
    user_id: DEFAULT_USER_ID,
    name: 'Enzo Romano',
    bio: 'Especialista em cortes degradê (fade) e designs modernos.',
    avatar_url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150',
    commission_rate: 50.00,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p2',
    company_id: DEFAULT_COMPANY_ID,
    user_id: null,
    name: 'Gustavo Santos',
    bio: 'Mestre da barboterapia e cortes clássicos com tesoura.',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    commission_rate: 45.00,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'p3',
    company_id: DEFAULT_COMPANY_ID,
    user_id: null,
    name: 'Thiago Silva',
    bio: 'Especialista em cortes infantis e estilização capilar.',
    avatar_url: 'https://images.unsplash.com/photo-1628157582853-a796fa650a6a?w=150',
    commission_rate: 40.00,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultClients: Client[] = [
  {
    id: 'c1',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Rodrigo Oliveira',
    email: 'rodrigo@gmail.com',
    phone: '11999999999',
    document: '123.456.789-00',
    birth_date: '1990-05-15',
    notes: 'Prefere corte degradê navalhado. Gosta de café expresso.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'c2',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Felipe Melo',
    email: 'felipe@melo.dev',
    phone: '11988888888',
    document: '987.654.321-11',
    birth_date: '1988-10-22',
    notes: 'Usa barba cheia, faz barboterapia a cada 15 dias.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'c3',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Marcelo Vieira',
    email: 'marcelo@outlook.com',
    phone: '11977777777',
    document: '456.789.123-22',
    birth_date: '1993-01-08',
    notes: 'Cabelo cacheado, faz apenas tesoura nas laterais.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'c4',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Bruno Henrique',
    email: 'bruno.h@bh.com',
    phone: '21966666666',
    document: '147.258.369-33',
    birth_date: '1995-12-30',
    notes: 'Gosta de cerveja IPA. Sempre faz o Combo Domus.',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Seed appointments relative to current date so it always looks updated!
const todayStr = new Date().toISOString().split('T')[0];

const defaultAppointments: Appointment[] = [
  {
    id: 'ap1',
    company_id: DEFAULT_COMPANY_ID,
    client_id: 'c1',
    professional_id: 'p1',
    service_id: 's1',
    start_time: `${todayStr}T09:00:00.000Z`,
    end_time: `${todayStr}T09:30:00.000Z`,
    status: 'completed',
    notes: 'Finalizado com pomada matte.',
    total_price: 50.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'ap2',
    company_id: DEFAULT_COMPANY_ID,
    client_id: 'c2',
    professional_id: 'p2',
    service_id: 's2',
    start_time: `${todayStr}T10:00:00.000Z`,
    end_time: `${todayStr}T10:30:00.000Z`,
    status: 'confirmed',
    notes: 'Cliente ligou confirmando atraso de 5 min.',
    total_price: 40.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'ap3',
    company_id: DEFAULT_COMPANY_ID,
    client_id: 'c3',
    professional_id: 'p1',
    service_id: 's3',
    start_time: `${todayStr}T14:30:00.000Z`,
    end_time: `${todayStr}T15:30:00.000Z`,
    status: 'scheduled',
    notes: '',
    total_price: 80.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'ap4',
    company_id: DEFAULT_COMPANY_ID,
    client_id: 'c4',
    professional_id: 'p3',
    service_id: 's1',
    start_time: `${todayStr}T17:00:00.000Z`,
    end_time: `${todayStr}T17:30:00.000Z`,
    status: 'scheduled',
    notes: 'Primeira vez na casa.',
    total_price: 50.00,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultProducts: Product[] = [
  {
    id: 'pr1',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Pomada Modeladora Efeito Matte Domus',
    description: 'Fixação forte e efeito seco matte. 150g.',
    price: 60.00,
    cost_price: 25.00,
    sku: 'POM-MAT-DOM',
    stock_qty: 32,
    min_stock_qty: 10,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pr2',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Óleo para Barba Wood & Spice',
    description: 'Nutrição e perfume para barbas longas. 30ml.',
    price: 45.00,
    cost_price: 18.00,
    sku: 'OIL-WOD-SPI',
    stock_qty: 18,
    min_stock_qty: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'pr3',
    company_id: DEFAULT_COMPANY_ID,
    name: 'Shampoo Refresh Mentol',
    description: 'Shampoo refrescante para cabelos oleosos. 250ml.',
    price: 35.00,
    cost_price: 15.00,
    sku: 'SHM-REF-MEN',
    stock_qty: 3,
    min_stock_qty: 8,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultFinancials: FinancialTransaction[] = [
  {
    id: 't1',
    company_id: DEFAULT_COMPANY_ID,
    type: 'income',
    category: 'service_appointment',
    amount: 130.00,
    description: 'Serviço Combo Domus + Venda de Pomada (Rodrigo Oliveira)',
    date: todayStr,
    payment_method: 'pix',
    appointment_id: 'ap1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 't2',
    company_id: DEFAULT_COMPANY_ID,
    type: 'expense',
    category: 'supplies',
    amount: 180.00,
    description: 'Compra de toalhas e golas higiênicas descartáveis',
    date: todayStr,
    payment_method: 'credit_card',
    appointment_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 't3',
    company_id: DEFAULT_COMPANY_ID,
    type: 'income',
    category: 'sale_product',
    amount: 45.00,
    description: 'Venda avulsa de Óleo Wood & Spice',
    date: todayStr,
    payment_method: 'cash',
    appointment_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 't4',
    company_id: DEFAULT_COMPANY_ID,
    type: 'expense',
    category: 'rent',
    amount: 1500.00,
    description: 'Aluguel do imóvel comercial',
    date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
    payment_method: 'pix',
    appointment_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultWhatsApp: WhatsAppConnection[] = [
  {
    id: 'w1',
    company_id: DEFAULT_COMPANY_ID,
    status: 'disconnected',
    phone_number: null,
    instance_name: 'Domus Bot',
    qr_code: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const defaultSubscriptions: CompanySubscription[] = [
  {
    id: 'sub1',
    company_id: DEFAULT_COMPANY_ID,
    plan_id: 'plan-domus-199',
    status: 'trial',
    current_period_start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    current_period_end: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // Expired 2 days ago
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

// Helper to fetch data safely from LocalStorage (browser check)
function get<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaultValue));
    return defaultValue;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return defaultValue;
  }
}

function set<T>(key: string, value: T): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

// Stateful Database Operations Manager
export const db = {
  getCurrentUser: (): UserProfile | null => {
    return get<UserProfile | null>(KEYS.CURRENT_USER, defaultProfiles[0]);
  },
  
  setCurrentUser: (user: UserProfile | null) => {
    set(KEYS.CURRENT_USER, user);
  },

  getCurrentCompany: (): Company | null => {
    return get<Company | null>(KEYS.CURRENT_COMPANY, defaultCompanies[0]);
  },
  
  setCurrentCompany: (company: Company | null) => {
    set(KEYS.CURRENT_COMPANY, company);
  },

  getCompanies: (): Company[] => get(KEYS.COMPANIES, defaultCompanies),
  saveCompanies: (items: Company[]) => set(KEYS.COMPANIES, items),
  
  getProfiles: (): UserProfile[] => get(KEYS.USER_PROFILES, defaultProfiles),
  saveProfiles: (items: UserProfile[]) => set(KEYS.USER_PROFILES, items),

  getMembers: (): CompanyMember[] => get(KEYS.MEMBERS, defaultMembers),
  saveMembers: (items: CompanyMember[]) => set(KEYS.MEMBERS, items),

  getServices: (companyId: string): Service[] => {
    const list = get<Service[]>(KEYS.SERVICES, defaultServices);
    return list.filter(item => item.company_id === companyId);
  },
  saveServices: (items: Service[]) => set(KEYS.SERVICES, items),

  getProfessionals: (companyId: string): Professional[] => {
    const list = get<Professional[]>(KEYS.PROFESSIONALS, defaultProfessionals);
    return list.filter(item => item.company_id === companyId);
  },
  saveProfessionals: (items: Professional[]) => set(KEYS.PROFESSIONALS, items),

  getClients: (companyId: string): Client[] => {
    const list = get<Client[]>(KEYS.CLIENTS, defaultClients);
    return list.filter(item => item.company_id === companyId);
  },
  saveClients: (items: Client[]) => set(KEYS.CLIENTS, items),

  getAppointments: (companyId: string): Appointment[] => {
    const list = get<Appointment[]>(KEYS.APPOINTMENTS, defaultAppointments);
    const clients = get<Client[]>(KEYS.CLIENTS, defaultClients);
    const professionals = get<Professional[]>(KEYS.PROFESSIONALS, defaultProfessionals);
    const services = get<Service[]>(KEYS.SERVICES, defaultServices);

    return list
      .filter(item => item.company_id === companyId)
      .map(apt => ({
        ...apt,
        client: clients.find(c => c.id === apt.client_id),
        professional: professionals.find(p => p.id === apt.professional_id),
        service: services.find(s => s.id === apt.service_id),
      }));
  },
  saveAppointments: (items: Appointment[]) => set(KEYS.APPOINTMENTS, items),

  getProducts: (companyId: string): Product[] => {
    const list = get<Product[]>(KEYS.PRODUCTS, defaultProducts);
    return list.filter(item => item.company_id === companyId);
  },
  saveProducts: (items: Product[]) => set(KEYS.PRODUCTS, items),

  getStockMovements: (companyId: string): StockMovement[] => {
    const list = get<StockMovement[]>(KEYS.STOCK_MOVEMENTS, []);
    const products = get<Product[]>(KEYS.PRODUCTS, defaultProducts);
    return list
      .filter(item => item.company_id === companyId)
      .map(mov => ({
        ...mov,
        product: products.find(p => p.id === mov.product_id)
      }));
  },
  saveStockMovements: (items: StockMovement[]) => set(KEYS.STOCK_MOVEMENTS, items),

  getFinancialTransactions: (companyId: string): FinancialTransaction[] => {
    const list = get<FinancialTransaction[]>(KEYS.FINANCIALS, defaultFinancials);
    return list.filter(item => item.company_id === companyId);
  },
  saveFinancialTransactions: (items: FinancialTransaction[]) => set(KEYS.FINANCIALS, items),

  getWhatsAppConnections: (companyId: string): WhatsAppConnection[] => {
    const list = get<WhatsAppConnection[]>(KEYS.WHATSAPP, defaultWhatsApp);
    return list.filter(item => item.company_id === companyId);
  },
  saveWhatsAppConnections: (items: WhatsAppConnection[]) => set(KEYS.WHATSAPP, items),

  getSubscriptionPlans: (): SubscriptionPlan[] => {
    return defaultPlans;
  },

  getCompanySubscription: (companyId: string): CompanySubscription | null => {
    const list = get<CompanySubscription[]>(KEYS.SUBSCRIPTIONS, defaultSubscriptions);
    const sub = list.find(item => item.company_id === companyId) || null;
    if (sub) {
      sub.plan = defaultPlans.find(p => p.id === sub.plan_id);
    }
    return sub;
  },
  saveSubscriptions: (items: CompanySubscription[]) => set(KEYS.SUBSCRIPTIONS, items),

  getAuditLogs: (companyId: string): AuditLog[] => {
    const list = get<AuditLog[]>(KEYS.AUDIT_LOGS, []);
    const profiles = get<UserProfile[]>(KEYS.USER_PROFILES, defaultProfiles);
    return list
      .filter(item => item.company_id === companyId)
      .map(log => ({
        ...log,
        user: profiles.find(p => p.id === log.user_id) || undefined
      }));
  },
  saveAuditLogs: (items: AuditLog[]) => set(KEYS.AUDIT_LOGS, items),

  // Insert methods
  addCompany: (company: Company, ownerProfile: UserProfile): void => {
    const companies = db.getCompanies();
    const profiles = db.getProfiles();
    const members = db.getMembers();

    companies.push(company);
    db.saveCompanies(companies);

    if (!profiles.some(p => p.id === ownerProfile.id)) {
      profiles.push(ownerProfile);
      db.saveProfiles(profiles);
    }

    const member: CompanyMember = {
      id: `m-${Math.random().toString(36).substr(2, 9)}`,
      company_id: company.id,
      user_id: ownerProfile.id,
      role_id: 'owner',
      status: 'active',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    members.push(member);
    db.saveMembers(members);

    // Seed default services for the new company
    const currentServices = get<Service[]>(KEYS.SERVICES, defaultServices);
    const newServices: Service[] = [
      {
        id: `s-${Math.random().toString(36).substr(2, 9)}`,
        company_id: company.id,
        name: 'Corte Tradicional',
        description: 'Corte simples com finalização.',
        duration_minutes: 30,
        price: 45.00,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: `s-${Math.random().toString(36).substr(2, 9)}`,
        company_id: company.id,
        name: 'Barba Alinhada',
        description: 'Alinhamento com navalha.',
        duration_minutes: 25,
        price: 30.00,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ];
    set(KEYS.SERVICES, [...currentServices, ...newServices]);

    // Seed default professional for new company
    const currentProfessionals = get<Professional[]>(KEYS.PROFESSIONALS, defaultProfessionals);
    const newProf: Professional = {
      id: `p-${Math.random().toString(36).substr(2, 9)}`,
      company_id: company.id,
      user_id: ownerProfile.id,
      name: ownerProfile.full_name,
      bio: 'Proprietário e Barbeiro Master.',
      avatar_url: ownerProfile.avatar_url,
      commission_rate: 100.00,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set(KEYS.PROFESSIONALS, [...currentProfessionals, newProf]);

    // Seed default sub for new company (trial)
    const currentSubs = get<CompanySubscription[]>(KEYS.SUBSCRIPTIONS, defaultSubscriptions);
    const newSub: CompanySubscription = {
      id: `sub-${Math.random().toString(36).substr(2, 9)}`,
      company_id: company.id,
      plan_id: 'plan-domus-199', // Plano Único
      status: 'trial',
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days trial
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set(KEYS.SUBSCRIPTIONS, [...currentSubs, newSub]);

    // Seed WhatsApp connection
    const currentWA = get<WhatsAppConnection[]>(KEYS.WHATSAPP, defaultWhatsApp);
    const newWA: WhatsAppConnection = {
      id: `wa-${Math.random().toString(36).substr(2, 9)}`,
      company_id: company.id,
      status: 'disconnected',
      instance_name: 'WhatsBot',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    set(KEYS.WHATSAPP, [...currentWA, newWA]);
  },

  logAudit: (companyId: string | null, userId: string | null, action: string, details: Record<string, any>): void => {
    const list = get<AuditLog[]>(KEYS.AUDIT_LOGS, []);
    const log: AuditLog = {
      id: `log-${Math.random().toString(36).substr(2, 9)}`,
      company_id: companyId,
      user_id: userId,
      action,
      details,
      ip_address: '127.0.0.1',
      created_at: new Date().toISOString(),
    };
    list.unshift(log);
    set(KEYS.AUDIT_LOGS, list);
  },

  // Public booking helpers
  getCompanyBySlug: (slug: string): Company | null => {
    const companies = get<Company[]>(KEYS.COMPANIES, defaultCompanies);
    return companies.find(c => c.slug === slug) || null;
  },

  addClient: (client: Client): Client => {
    const list = get<Client[]>(KEYS.CLIENTS, defaultClients);
    list.push(client);
    set(KEYS.CLIENTS, list);
    return client;
  },

  addAppointment: (appointment: Appointment): Appointment => {
    const list = get<Appointment[]>(KEYS.APPOINTMENTS, defaultAppointments);
    list.push(appointment);
    set(KEYS.APPOINTMENTS, list);
    return appointment;
  },

  addFinancialTransaction: (transaction: FinancialTransaction): FinancialTransaction => {
    const list = get<FinancialTransaction[]>(KEYS.FINANCIALS, defaultFinancials);
    list.push(transaction);
    set(KEYS.FINANCIALS, list);
    return transaction;
  },

  addStockMovement: (movement: StockMovement): StockMovement => {
    const list = get<StockMovement[]>(KEYS.STOCK_MOVEMENTS, []);
    list.push(movement);
    set(KEYS.STOCK_MOVEMENTS, list);
    return movement;
  },

  updateProduct: (product: Product): void => {
    const list = get<Product[]>(KEYS.PRODUCTS, defaultProducts);
    const idx = list.findIndex(p => p.id === product.id);
    if (idx !== -1) {
      list[idx] = product;
      set(KEYS.PRODUCTS, list);
    }
  },

  getClientByPhone: (companyId: string, phone: string): Client | null => {
    const list = get<Client[]>(KEYS.CLIENTS, defaultClients);
    return list.find(c => c.company_id === companyId && c.phone === phone) || null;
  },

  getAllAppointmentsRaw: (): Appointment[] => {
    return get<Appointment[]>(KEYS.APPOINTMENTS, defaultAppointments);
  },

  getAllClientsRaw: (): Client[] => {
    return get<Client[]>(KEYS.CLIENTS, defaultClients);
  },

  getAllProductsRaw: (): Product[] => {
    return get<Product[]>(KEYS.PRODUCTS, defaultProducts);
  },

  getAllFinancialsRaw: (): FinancialTransaction[] => {
    return get<FinancialTransaction[]>(KEYS.FINANCIALS, defaultFinancials);
  }
};

