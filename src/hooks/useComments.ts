import { useQuery, useMutation, useQueryClient } from '@tantml:react-query';
import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export function useComments(contentId: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['comments', contentId],
    queryFn: async () => {
      const { data: comments, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          ),
          comment_reactions (
            id,
            reaction_type,
            user_id
          )
        `)
        .eq('content_id', contentId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return comments || [];
    },
    enabled: !!contentId,
    staleTime: 15 * 60 * 1000,
  });

  const handleRealtimeUpdate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['comments', contentId] });
  }, [contentId, queryClient]);

  useEffect(() => {
    if (!contentId) return;

    const channel = supabase
      .channel(`comments-${contentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `content_id=eq.${contentId}`,
        },
        handleRealtimeUpdate
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
        },
        handleRealtimeUpdate
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [contentId, handleRealtimeUpdate]);

  return query;
}

export function useAddComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contentId,
      content,
      parentId,
    }: {
      contentId: string;
      content: string;
      parentId?: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const { data, error } = await supabase
        .from('comments')
        .insert({
          content_id: contentId,
          user_id: user.id,
          content: content.trim(),
          parent_id: parentId || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', variables.contentId],
      });
    },
  });
}

export function useToggleReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      commentId,
      reactionType,
      contentId,
    }: {
      commentId: string;
      reactionType: string;
      contentId: string;
    }) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Must be logged in');

      const { data: existing } = await supabase
        .from('comment_reactions')
        .select('id')
        .eq('comment_id', commentId)
        .eq('user_id', user.id)
        .eq('reaction_type', reactionType)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('id', existing.id);
        if (error) throw error;
        return { action: 'removed' };
      } else {
        const { error } = await supabase.from('comment_reactions').insert({
          comment_id: commentId,
          user_id: user.id,
          reaction_type: reactionType,
        });
        if (error) throw error;
        return { action: 'added' };
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['comments', variables.contentId],
      });
    },
  });
}
