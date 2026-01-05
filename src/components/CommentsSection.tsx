import { useState, useEffect } from 'react';
import { MessageCircle, Send, Trash2, Reply, Smile } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from '../utils/date';
import AuthModal from './AuthModal';

interface CommentReactions {
  [emoji: string]: {
    count: number;
    userReacted: boolean;
  };
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
  profiles: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  replies?: Comment[];
  reactions: CommentReactions;
}

interface CommentsSectionProps {
  contentId: string;
  initialCount?: number;
}

const EMOJI_OPTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '👏', '🎉'];

export default function CommentsSection({ contentId, initialCount = 0 }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsCount, setCommentsCount] = useState(initialCount);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);

  useEffect(() => {
    loadComments();

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
        () => {
          loadComments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comment_reactions',
        },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [contentId]);

  async function loadComments() {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('content_id', contentId)
        .order('created_at', { ascending: false });

      if (commentsError) throw commentsError;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, username, display_name, avatar_url')
          .in('id', userIds);

        const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

        const { data: reactionsData } = await supabase
          .from('comment_reactions')
          .select('*')
          .in('comment_id', commentsData.map(c => c.id));

        const reactionsMap = new Map<string, CommentReactions>();
        reactionsData?.forEach(reaction => {
          if (!reactionsMap.has(reaction.comment_id)) {
            reactionsMap.set(reaction.comment_id, {});
          }
          const commentReactions = reactionsMap.get(reaction.comment_id)!;
          if (!commentReactions[reaction.emoji]) {
            commentReactions[reaction.emoji] = { count: 0, userReacted: false };
          }
          commentReactions[reaction.emoji].count++;
          if (user && reaction.user_id === user.id) {
            commentReactions[reaction.emoji].userReacted = true;
          }
        });

        const enrichedComments = commentsData.map(comment => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || { username: null, display_name: null, avatar_url: null },
          reactions: reactionsMap.get(comment.id) || {}
        }));

        const topLevelComments = enrichedComments
          .filter(c => !c.parent_id)
          .map(comment => ({
            ...comment,
            replies: enrichedComments.filter(c => c.parent_id === comment.id)
          }));

        setComments(topLevelComments);
      } else {
        setComments([]);
      }

      const { data: contentData } = await supabase
        .from('media_content')
        .select('comments_count')
        .eq('id', contentId)
        .maybeSingle();

      if (contentData) {
        setCommentsCount(contentData.comments_count || 0);
      }
    } catch (err) {
      console.error('Error loading comments:', err);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!user) {
      setError('Please sign in to comment');
      return;
    }

    if (!newComment.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('comments')
        .insert({
          content_id: contentId,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (insertError) throw insertError;

      setNewComment('');
      await loadComments();
    } catch (err: any) {
      setError(err.message || 'Failed to post comment');
    } finally {
      setLoading(false);
    }
  }

  async function handleReply(parentId: string) {
    if (!user) {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
      return;
    }

    const content = replyContent[parentId]?.trim();
    if (!content) return;

    setLoading(true);

    try {
      const { error: insertError } = await supabase
        .from('comments')
        .insert({
          content_id: contentId,
          user_id: user.id,
          content: content,
          parent_id: parentId,
        });

      if (insertError) throw insertError;

      setReplyContent({ ...replyContent, [parentId]: '' });
      setReplyingTo(null);
      await loadComments();
    } catch (err: any) {
      setError(err.message || 'Failed to post reply');
    } finally {
      setLoading(false);
    }
  }

  async function handleReaction(commentId: string, emoji: string) {
    if (!user) {
      setAuthMode('signin');
      setIsAuthModalOpen(true);
      return;
    }

    try {
      const comment = comments.find(c => c.id === commentId || c.replies?.some(r => r.id === commentId));
      let targetComment: Comment | undefined;

      if (comment?.id === commentId) {
        targetComment = comment;
      } else {
        targetComment = comment?.replies?.find(r => r.id === commentId);
      }

      const hasReacted = targetComment?.reactions[emoji]?.userReacted;

      if (hasReacted) {
        const { error } = await supabase
          .from('comment_reactions')
          .delete()
          .eq('comment_id', commentId)
          .eq('user_id', user.id)
          .eq('emoji', emoji);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('comment_reactions')
          .insert({
            comment_id: commentId,
            user_id: user.id,
            emoji: emoji,
          });

        if (error) throw error;
      }

      await loadComments();
      setShowEmojiPicker(null);
    } catch (err) {
      console.error('Error handling reaction:', err);
    }
  }

  async function handleDelete(commentId: string) {
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      await loadComments();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  }

  function renderComment(comment: Comment, isReply = false) {
    const displayName = comment.profiles?.display_name || comment.profiles?.username || 'Anonymous';
    const avatarUrl = comment.profiles?.avatar_url;

    return (
      <div key={comment.id} className={`${isReply ? 'ml-12' : ''} mb-6`}>
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                loading="lazy"
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="bg-gray-50 rounded-2xl px-4 py-3">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-gray-900">{displayName}</span>
                {user && user.id === comment.user_id && (
                  deleteConfirm === comment.id ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-xs px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="text-xs px-2 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(comment.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )
                )}
              </div>
              <p className="text-gray-700 whitespace-pre-wrap break-words">{comment.content}</p>
            </div>

            <div className="flex items-center space-x-4 mt-2 ml-2">
              <span className="text-xs text-gray-500">
                {formatDistanceToNow(comment.created_at)}
              </span>

              {!isReply && (
                <button
                  onClick={() => {
                    if (user) {
                      setReplyingTo(replyingTo === comment.id ? null : comment.id);
                    } else {
                      setAuthMode('signin');
                      setIsAuthModalOpen(true);
                    }
                  }}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700 flex items-center transition-colors"
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </button>
              )}

              <div className="relative">
                <button
                  onClick={() => setShowEmojiPicker(showEmojiPicker === comment.id ? null : comment.id)}
                  className="text-xs font-medium text-gray-600 hover:text-gray-700 flex items-center transition-colors"
                >
                  <Smile className="w-3 h-3 mr-1" />
                  React
                </button>

                {showEmojiPicker === comment.id && (
                  <div className="absolute left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-2 z-10 flex space-x-1">
                    {EMOJI_OPTIONS.map(emoji => (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(comment.id, emoji)}
                        className="w-8 h-8 hover:bg-gray-100 rounded transition-colors text-lg"
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {Object.keys(comment.reactions).length > 0 && (
                <div className="flex items-center space-x-1">
                  {Object.entries(comment.reactions).map(([emoji, data]) => (
                    <button
                      key={emoji}
                      onClick={() => handleReaction(comment.id, emoji)}
                      className={`px-2 py-1 rounded-full text-xs flex items-center space-x-1 transition-colors ${
                        data.userReacted
                          ? 'bg-blue-100 border border-blue-300'
                          : 'bg-gray-100 hover:bg-gray-200 border border-gray-200'
                      }`}
                    >
                      <span>{emoji}</span>
                      <span className="font-medium">{data.count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {replyingTo === comment.id && user && (
              <div className="mt-3 flex items-start space-x-2">
                <textarea
                  value={replyContent[comment.id] || ''}
                  onChange={(e) => setReplyContent({ ...replyContent, [comment.id]: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm"
                  rows={2}
                  placeholder="Write a reply..."
                  maxLength={5000}
                />
                <button
                  onClick={() => handleReply(comment.id)}
                  disabled={loading || !replyContent[comment.id]?.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            )}

            {comment.replies && comment.replies.length > 0 && (
              <div className="mt-4 space-y-4">
                {comment.replies.map(reply => renderComment(reply, true))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
      <div className="flex items-center mb-6">
        <MessageCircle className="w-6 h-6 text-blue-600 mr-2" />
        <h3 className="text-2xl font-bold text-gray-900">
          Comments ({commentsCount})
        </h3>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt="Your avatar"
                  loading="lazy"
                  className="w-10 h-10 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                  {(user.user_metadata?.display_name || user.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Share your thoughts..."
                maxLength={5000}
              />
              {error && (
                <p className="text-red-500 text-sm mt-2">{error}</p>
              )}
            </div>
            <button
              type="submit"
              disabled={loading || !newComment.trim()}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </form>
      ) : (
        <div className="bg-gray-50 p-6 rounded-lg mb-8 text-center">
          <p className="text-gray-600 mb-4">Please sign in to leave a comment</p>
          <div className="flex items-center justify-center space-x-3">
            <button
              onClick={() => {
                setAuthMode('signin');
                setIsAuthModalOpen(true);
              }}
              className="px-6 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium"
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode('signup');
                setIsAuthModalOpen(true);
              }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign Up
            </button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map(comment => renderComment(comment))
        )}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        mode={authMode}
      />
    </div>
  );
}
