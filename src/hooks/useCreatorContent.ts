import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { Json } from '../lib/database.types';

export type ContentType = 'video' | 'audio' | 'livestream' | 'clip' | 'social_post';
export type ContentStatus = 'draft' | 'published' | 'scheduled' | 'archived' | 'live';
export type Platform = 'youtube' | 'tiktok' | 'instagram' | 'twitter' | 'facebook' | 'twitch' | 'custom' | null;

export interface CreatorContentItem {
  id: string;
  creator_id: string;
  content_type: ContentType;
  title: string;
  description: string | null;
  thumbnail_url: string | null;
  media_url: string | null;
  external_url: string | null;
  platform: Platform;
  category: string;
  tags: string[];
  status: ContentStatus;
  scheduled_at: string | null;
  published_at: string | null;
  duration_seconds: number | null;
  view_count: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  is_featured: boolean;
  is_pinned: boolean;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

export interface ContentCategory {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  color: string | null;
  display_order: number;
  is_active: boolean;
}

export function useCreatorContentList(creatorId?: string, filters?: {
  contentType?: ContentType;
  status?: ContentStatus;
  category?: string;
}) {
  return useQuery({
    queryKey: ['creator-content', creatorId, filters],
    queryFn: async () => {
      let query = supabase
        .from('creator_content')
        .select('*')
        .order('created_at', { ascending: false });

      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }
      if (filters?.contentType) {
        query = query.eq('content_type', filters.contentType);
      }
      if (filters?.status && filters.status !== 'all' as unknown) {
        query = query.eq('status', filters.status);
      }
      if (filters?.category) {
        query = query.eq('category', filters.category);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as CreatorContentItem[];
    },
    enabled: creatorId !== 'none',
    staleTime: 1000 * 60 * 2,
  });
}

export function useContentCategories() {
  return useQuery({
    queryKey: ['content-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('content_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');

      if (error) throw error;
      return data as ContentCategory[];
    },
    staleTime: 1000 * 60 * 30,
  });
}

export function useCreateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: {
      creator_id: string;
      content_type: ContentType;
      title: string;
      description?: string;
      thumbnail_url?: string;
      media_url?: string;
      external_url?: string;
      platform?: Platform;
      category?: string;
      tags?: string[];
      status?: ContentStatus;
      scheduled_at?: string;
      duration_seconds?: number;
      metadata?: Json;
    }) => {
      const insertData = {
        ...content,
        published_at: content.status === 'published' ? new Date().toISOString() : undefined,
      };

      const { data, error } = await supabase
        .from('creator_content')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-content'] });
    },
  });
}

export function useUpdateContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<CreatorContentItem> & { id: string }) => {
      if (updates.status === 'published' && !updates.published_at) {
        updates.published_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('creator_content')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-content'] });
    },
  });
}

export function useDeleteContent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('creator_content')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-content'] });
    },
  });
}

export function useContentStats(creatorId?: string) {
  return useQuery({
    queryKey: ['creator-content-stats', creatorId],
    queryFn: async () => {
      let query = supabase
        .from('creator_content')
        .select('content_type, status, view_count, like_count, share_count');

      if (creatorId) {
        query = query.eq('creator_id', creatorId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const items = data || [];
      return {
        total: items.length,
        videos: items.filter(i => i.content_type === 'video').length,
        audios: items.filter(i => i.content_type === 'audio').length,
        livestreams: items.filter(i => i.content_type === 'livestream').length,
        clips: items.filter(i => i.content_type === 'clip').length,
        socialPosts: items.filter(i => i.content_type === 'social_post').length,
        published: items.filter(i => i.status === 'published').length,
        drafts: items.filter(i => i.status === 'draft').length,
        scheduled: items.filter(i => i.status === 'scheduled').length,
        totalViews: items.reduce((sum, i) => sum + (i.view_count || 0), 0),
        totalLikes: items.reduce((sum, i) => sum + (i.like_count || 0), 0),
        totalShares: items.reduce((sum, i) => sum + (i.share_count || 0), 0),
      };
    },
    enabled: creatorId !== 'none',
    staleTime: 1000 * 60 * 5,
  });
}
