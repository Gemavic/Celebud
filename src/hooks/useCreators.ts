import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export interface CreatorApplication {
  id: string;
  user_id: string;
  display_name: string;
  email: string | null;
  bio: string | null;
  portfolio_url: string | null;
  sample_topics: string[] | null;
  status: 'pending' | 'approved' | 'rejected' | 'onboarded';
  revenue_share_pct: number;
  total_earnings: number;
  total_views: number;
  articles_count: number;
  last_article_at: string | null;
  admin_notes: string | null;
  onboarded_at: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface CreatorPayout {
  id: string;
  creator_id: string;
  amount: number;
  period_start: string;
  period_end: string;
  status: 'pending' | 'processing' | 'paid';
  payment_method: string;
  notes: string | null;
  created_at: string;
  paid_at: string | null;
  creator?: CreatorApplication;
}

export function useCreators(statusFilter?: string) {
  return useQuery({
    queryKey: ['creators', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('creator_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CreatorApplication[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreatorPayouts(creatorId?: string) {
  return useQuery({
    queryKey: ['creator-payouts', creatorId],
    queryFn: async () => {
      let query = supabase
        .from('creator_payouts')
        .select('*, creator:creator_applications(id, display_name, email, revenue_share_pct)')
        .order('created_at', { ascending: false });

      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as (CreatorPayout & { creator: Pick<CreatorApplication, 'id' | 'display_name' | 'email' | 'revenue_share_pct'> })[];
    },
    staleTime: 1000 * 60 * 5,
  });
}

export function useUpdateCreatorStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, admin_notes, revenue_share_pct }: {
      id: string;
      status: CreatorApplication['status'];
      admin_notes?: string;
      revenue_share_pct?: number;
    }) => {
      const updates: Record<string, unknown> = { status, reviewed_at: new Date().toISOString() };
      if (admin_notes !== undefined) updates.admin_notes = admin_notes;
      if (revenue_share_pct !== undefined) updates.revenue_share_pct = revenue_share_pct;
      if (status === 'onboarded') updates.onboarded_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('creator_applications')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creators'] });
    },
  });
}

export function useCreatePayout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payout: {
      creator_id: string;
      amount: number;
      period_start: string;
      period_end: string;
      payment_method?: string;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('creator_payouts')
        .insert(payout)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-payouts'] });
    },
  });
}

export function useUpdatePayoutStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CreatorPayout['status'] }) => {
      const updates: Record<string, unknown> = { status };
      if (status === 'paid') updates.paid_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('creator_payouts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-payouts'] });
    },
  });
}
