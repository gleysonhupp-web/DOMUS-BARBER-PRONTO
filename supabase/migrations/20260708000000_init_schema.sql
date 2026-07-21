-- 20260708000000_init_schema.sql
-- DOMUS BARBER Initial Database Schema Configuration

-- Create extension for gen_random_uuid if not active
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Define Roles
CREATE TABLE IF NOT EXISTS public.roles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed basic roles
INSERT INTO public.roles (id, name, description) VALUES
('owner', 'Proprietário', 'Acesso total ao estabelecimento e configurações do SaaS.'),
('admin', 'Administrador', 'Gerenciamento operacional da barbearia, estoque e financeiro.'),
('professional', 'Profissional', 'Acesso à própria agenda, serviços realizados e comissões.'),
('receptionist', 'Recepcionista', 'Gerenciamento de agenda de todos os profissionais, clientes e vendas.')
ON CONFLICT (id) DO NOTHING;

-- Define Permissions
CREATE TABLE IF NOT EXISTS public.permissions (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define Companies (Tenants)
CREATE TABLE IF NOT EXISTS public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    theme_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define Users Profile (references auth.users)
CREATE TABLE IF NOT EXISTS public.users_profile (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define Company Members (Tenant association & Role mapping)
CREATE TABLE IF NOT EXISTS public.company_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users_profile(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES public.roles(id),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'pending')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id, user_id)
);

-- Define Services Catalog
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define Professionals
CREATE TABLE IF NOT EXISTS public.professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    bio TEXT,
    avatar_url TEXT,
    commission_rate NUMERIC(5, 2) DEFAULT 0.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define Clients CRM
CREATE TABLE IF NOT EXISTS public.clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    document TEXT,
    birth_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define Appointments (Scheduling)
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'no_show')),
    notes TEXT,
    total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define Products Catalog
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    cost_price NUMERIC(10, 2) CHECK (cost_price >= 0),
    sku TEXT,
    stock_qty INTEGER DEFAULT 0 CHECK (stock_qty >= 0),
    min_stock_qty INTEGER DEFAULT 0 CHECK (min_stock_qty >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define Stock Movements
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('in', 'out')),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    reason TEXT NOT NULL CHECK (reason IN ('purchase', 'sale', 'adjustment', 'damage', 'use')),
    unit_cost NUMERIC(10, 2) CHECK (unit_cost >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.users_profile(id) ON DELETE SET NULL
);

-- Define Financial Transactions
CREATE TABLE IF NOT EXISTS public.financial_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category TEXT NOT NULL CHECK (category IN ('sale_product', 'service_appointment', 'rent', 'wage', 'supplies', 'marketing', 'commission', 'other')),
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    date DATE DEFAULT CURRENT_DATE NOT NULL,
    payment_method TEXT CHECK (payment_method IN ('cash', 'credit_card', 'debit_card', 'pix', 'bank_slip')),
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define WhatsApp Connections
CREATE TABLE IF NOT EXISTS public.whatsapp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'connecting', 'qr_ready')),
    phone_number TEXT,
    instance_name TEXT,
    qr_code TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id)
);

-- Define AI Conversations
CREATE TABLE IF NOT EXISTS public.ai_conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    whatsapp_connection_id UUID NOT NULL REFERENCES public.whatsapp_connections(id) ON DELETE CASCADE,
    client_phone TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'closed')),
    summary TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Define Subscription Plans (Global config)
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    interval TEXT NOT NULL DEFAULT 'month' CHECK (interval IN ('month', 'year')),
    features JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Seed default plans
INSERT INTO public.subscription_plans (id, name, description, price, interval, features) VALUES
('a3f9e9d1-d22f-410a-9d93-123456789abc', 'Classic', 'Ideal para profissionais autônomos.', 49.90, 'month', '["Agenda Online", "Link Público de Agendamento", "Cadastro de até 150 clientes", "Relatórios Financeiros Básicos"]'),
('b4e8e8c2-e31f-420b-bd82-23456789abcd', 'Premium', 'Ideal para barbearias de médio e grande porte.', 99.90, 'month', '["Tudo no Classic", "IA de Atendimento no WhatsApp", "Controle de Estoque Inteligente", "Até 10 Profissionais", "Gestão de Comissões"]'),
('c5d7d7b3-f40e-430c-cd71-3456789abcde', 'Elite', 'Solução completa com consultoria e suporte VIP.', 199.90, 'month', '["Tudo no Premium", "Número de Profissionais Ilimitado", "IA no WhatsApp Avançada (Configurável)", "Suporte Prioritário", "Personalização Visual Completa"]')
ON CONFLICT (id) DO NOTHING;

-- Define Company Subscriptions (Tenant subscriptions)
CREATE TABLE IF NOT EXISTS public.company_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES public.subscription_plans(id),
    status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial', 'active', 'past_due', 'canceled', 'unpaid')),
    current_period_start TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    current_period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(company_id)
);

-- Define Audit Logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.users_profile(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    ip_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add Updated At Trigger Function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers
CREATE OR REPLACE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_users_profile_updated_at BEFORE UPDATE ON public.users_profile FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_company_members_updated_at BEFORE UPDATE ON public.company_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_services_updated_at BEFORE UPDATE ON public.services FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_professionals_updated_at BEFORE UPDATE ON public.professionals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_appointments_updated_at BEFORE UPDATE ON public.appointments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_whatsapp_connections_updated_at BEFORE UPDATE ON public.whatsapp_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_ai_conversations_updated_at BEFORE UPDATE ON public.ai_conversations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER update_company_subscriptions_updated_at BEFORE UPDATE ON public.company_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


-- ROW LEVEL SECURITY (RLS) & POLICIES
-- Enable RLS on all tables (except global plan tables if appropriate, but enable on subscription configurations)
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Auxiliary functions to check user membership
CREATE OR REPLACE FUNCTION public.is_company_member(company_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.company_members 
        WHERE company_members.company_id = is_company_member.company_id 
          AND company_members.user_id = is_company_member.user_id
          AND company_members.status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 1. Users Profile Policies
CREATE POLICY "Users can read all profiles" ON public.users_profile
    FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.users_profile
    FOR UPDATE USING (auth.uid() = id);

-- 2. Companies Policies
CREATE POLICY "Users can see companies they belong to" ON public.companies
    FOR SELECT USING (
        public.is_company_member(id, auth.uid())
    );

CREATE POLICY "Owners can update their company" ON public.companies
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_members.company_id = companies.id 
              AND company_members.user_id = auth.uid() 
              AND company_members.role_id = 'owner'
        )
    );

-- 3. Company Members Policies
CREATE POLICY "Members can view other members of their company" ON public.company_members
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

-- 4. Services Policies
CREATE POLICY "Members can view services" ON public.services
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

CREATE POLICY "Admins or owners can manage services" ON public.services
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_members.company_id = services.company_id 
              AND company_members.user_id = auth.uid() 
              AND company_members.role_id IN ('owner', 'admin')
        )
    );

-- 5. Professionals Policies
CREATE POLICY "Members can view professionals" ON public.professionals
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

CREATE POLICY "Admins/owners can manage professionals" ON public.professionals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_members.company_id = professionals.company_id 
              AND company_members.user_id = auth.uid() 
              AND company_members.role_id IN ('owner', 'admin')
        )
    );

-- 6. Clients Policies
CREATE POLICY "Members can view clients" ON public.clients
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

CREATE POLICY "Members can manage clients" ON public.clients
    FOR ALL USING (
        public.is_company_member(company_id, auth.uid())
    );

-- 7. Appointments Policies
CREATE POLICY "Members can view appointments" ON public.appointments
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

CREATE POLICY "Members can manage appointments" ON public.appointments
    FOR ALL USING (
        public.is_company_member(company_id, auth.uid())
    );

-- 8. Products Policies
CREATE POLICY "Members can view products" ON public.products
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

CREATE POLICY "Admins/owners can manage products" ON public.products
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_members.company_id = products.company_id 
              AND company_members.user_id = auth.uid() 
              AND company_members.role_id IN ('owner', 'admin')
        )
    );

-- 9. Stock Movements Policies
CREATE POLICY "Members can view stock movements" ON public.stock_movements
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

CREATE POLICY "Admins/owners can add stock movements" ON public.stock_movements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_members.company_id = stock_movements.company_id 
              AND company_members.user_id = auth.uid() 
              AND company_members.role_id IN ('owner', 'admin')
        )
    );

-- 10. Financial Transactions Policies
CREATE POLICY "Members can view financial logs" ON public.financial_transactions
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

CREATE POLICY "Admins/owners can manage finances" ON public.financial_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_members.company_id = financial_transactions.company_id 
              AND company_members.user_id = auth.uid() 
              AND company_members.role_id IN ('owner', 'admin')
        )
    );

-- 11. WhatsApp Connections Policies
CREATE POLICY "Members can view WhatsApp status" ON public.whatsapp_connections
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

CREATE POLICY "Admins/owners can manage WhatsApp connections" ON public.whatsapp_connections
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_members.company_id = whatsapp_connections.company_id 
              AND company_members.user_id = auth.uid() 
              AND company_members.role_id IN ('owner', 'admin')
        )
    );

-- 12. AI Conversations Policies
CREATE POLICY "Members can view AI conversations" ON public.ai_conversations
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

CREATE POLICY "Members can update AI conversations" ON public.ai_conversations
    FOR ALL USING (
        public.is_company_member(company_id, auth.uid())
    );

-- 13. Subscription Plans Policies (Global configuration: anyone logged in can read)
CREATE POLICY "Allow read access to active plans" ON public.subscription_plans
    FOR SELECT USING (is_active = true);

-- 14. Company Subscriptions Policies
CREATE POLICY "Members can view company subscriptions" ON public.company_subscriptions
    FOR SELECT USING (
        public.is_company_member(company_id, auth.uid())
    );

-- 15. Audit Logs Policies
CREATE POLICY "Owners can view audit logs" ON public.audit_logs
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.company_members 
            WHERE company_members.company_id = audit_logs.company_id 
              AND company_members.user_id = auth.uid() 
              AND company_members.role_id = 'owner'
        )
    );
