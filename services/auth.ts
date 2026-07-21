// services/auth.ts
// Authentication and Onboarding Service supporting Supabase and Mock Mode

import { supabase, isMockMode } from '../lib/supabase';
import { db } from './db';
import { UserProfile, Company } from '../types';

export const authService = {
  // Sign up user
  signUp: async (email: string, fullName: string, phone: string = '', password?: string): Promise<{ success: boolean; error?: string; user?: UserProfile }> => {
    if (isMockMode) {
      // Simulate network latency

      const profiles = db.getProfiles();
      if (profiles.some(p => p.email === email)) {
        return { success: false, error: 'Email já cadastrado.' };
      }

      if (typeof window !== 'undefined' && password) {
        const storedPasswords: Record<string, string> = JSON.parse(localStorage.getItem('domus_passwords') || '{}');
        storedPasswords[email.toLowerCase()] = password;
        localStorage.setItem('domus_passwords', JSON.stringify(storedPasswords));
      }

      const newUser: UserProfile = {
        id: `u-${Math.random().toString(36).substr(2, 9)}`,
        email,
        full_name: fullName,
        phone,
        avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(fullName)}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      profiles.push(newUser);
      db.saveProfiles(profiles);
      db.setCurrentUser(newUser);
      db.setCurrentCompany(null); // Force onboarding for new user

      db.logAudit(null, newUser.id, 'user_signup', { email, fullName });
      return { success: true, user: newUser };
    } else {
      // Supabase implementation...
      try {
        const { data, error } = await supabase!.auth.signUp({
          email,
          password: 'tempPassword123!', // Simple dummy password as auth requires it, or pass password in param
          options: {
            data: {
              full_name: fullName,
              phone: phone
            }
          }
        });

        if (error) throw error;
        
        const profile: UserProfile = {
          id: data.user!.id,
          email: data.user!.email!,
          full_name: fullName,
          phone,
          avatar_url: null,
          created_at: data.user!.created_at,
          updated_at: new Date().toISOString()
        };

        // Write profile to database (assuming trigger does it, but we can call upsert to be safe)
        const { error: profileErr } = await supabase!
          .from('users_profile')
          .upsert(profile);
          
        if (profileErr) throw profileErr;

        return { success: true, user: profile };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  },

  // Sign in user
  signIn: async (email: string, password?: string): Promise<{ success: boolean; error?: string; user?: UserProfile; company?: Company | null }> => {
    if (isMockMode) {

      const profiles = db.getProfiles();
      const user = profiles.find(p => p.email.toLowerCase() === email.toLowerCase());

      if (!user) {
        return { success: false, error: 'E-mail ou senha incorretos.' };
      }

      // In mock mode, we store a simple password in localStorage keyed by email.
      // Default password for the demo account is '123456'
      if (typeof window !== 'undefined') {
        const storedPasswords: Record<string, string> = JSON.parse(localStorage.getItem('domus_passwords') || '{}');
        // Default password for existing demo user if not set
        if (!storedPasswords[email.toLowerCase()]) {
          storedPasswords[email.toLowerCase()] = '123456';
          localStorage.setItem('domus_passwords', JSON.stringify(storedPasswords));
        }
        const correctPassword = storedPasswords[email.toLowerCase()];
        if (password && correctPassword && password !== correctPassword) {
          return { success: false, error: 'E-mail ou senha incorretos.' };
        }
      }

      db.setCurrentUser(user);

      // Find company for this user
      const members = db.getMembers();
      const member = members.find(m => m.user_id === user.id && m.status === 'active');
      let company: Company | null = null;

      if (member) {
        const companies = db.getCompanies();
        company = companies.find(c => c.id === member.company_id) || null;
        db.setCurrentCompany(company);
      } else {
        db.setCurrentCompany(null);
      }

      db.logAudit(company?.id || null, user.id, 'user_signin', { email });
      return { success: true, user, company };
    } else {
      // Supabase implementation...
      try {
        const { data, error } = await supabase!.auth.signInWithPassword({
          email,
          password: password || ''
        });

        if (error) throw error;

        const { data: profile, error: profileErr } = await supabase!
          .from('users_profile')
          .select('*')
          .eq('id', data.user!.id)
          .single();

        if (profileErr) throw profileErr;

        const { data: member } = await supabase!
          .from('company_members')
          .select('company_id')
          .eq('user_id', data.user!.id)
          .eq('status', 'active')
          .maybeSingle();

        let company: Company | null = null;
        if (member) {
          const { data: comp } = await supabase!
            .from('companies')
            .select('*')
            .eq('id', member.company_id)
            .single();
          company = comp;
        }

        return { success: true, user: profile, company };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  },


  // Onboard new company
  onboardCompany: async (userId: string, companyName: string, slug: string): Promise<{ success: boolean; error?: string; company?: Company }> => {
    if (isMockMode) {

      const companies = db.getCompanies();
      if (companies.some(c => c.slug.toLowerCase() === slug.toLowerCase())) {
        return { success: false, error: 'Este link de agendamento (slug) já está em uso.' };
      }

      const user = db.getProfiles().find(p => p.id === userId);
      if (!user) return { success: false, error: 'Usuário não encontrado.' };

      const newCompany: Company = {
        id: `c-${Math.random().toString(36).substr(2, 9)}`,
        name: companyName,
        slug: slug.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
        logo_url: null,
        theme_config: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      db.addCompany(newCompany, user);
      db.setCurrentCompany(newCompany);

      db.logAudit(newCompany.id, userId, 'company_onboarding', { companyName, slug });
      return { success: true, company: newCompany };
    } else {
      // Supabase implementation...
      try {
        const newCompany = {
          id: crypto.randomUUID(),
          name: companyName,
          slug: slug.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
          logo_url: null,
          theme_config: {}
        };

        const { error: companyErr } = await supabase!
          .from('companies')
          .insert(newCompany);

        if (companyErr) throw companyErr;

        // Insert membership as owner
        const { error: memberErr } = await supabase!
          .from('company_members')
          .insert({
            company_id: newCompany.id,
            user_id: userId,
            role_id: 'owner',
            status: 'active'
          });

        if (memberErr) throw memberErr;

        return { success: true, company: newCompany as any };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  },

  // Sign out user
  signOut: async (): Promise<void> => {
    if (isMockMode) {
      const user = db.getCurrentUser();
      const company = db.getCurrentCompany();
      if (user) {
        db.logAudit(company?.id || null, user.id, 'user_signout', {});
      }
      db.setCurrentUser(null);
      db.setCurrentCompany(null);
    } else {
      await supabase!.auth.signOut();
    }
  },

  // Check auth session
  isAuthenticated: (): boolean => {
    if (isMockMode) {
      return db.getCurrentUser() !== null;
    } else {
      if (typeof window !== 'undefined') {
        // Simple client checking
        return supabase!.auth.getSession() !== null;
      }
      return false;
    }
  }
};
