import { useState, useEffect } from 'react';
import { MessageCircle, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from '../utils/date';

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
  };
}

interface CommentsSectionProps {
  contentId: string;
}

export default function CommentsSection({ contentId }: CommentsSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [contentId]);

  async function loadComments() {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (username, display_name)
        `)
        .eq('content_id', contentId)
        .is('parent_id', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setComments(data || []);
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

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
      <div className="flex items-center mb-6">
        <MessageCircle className="w-6 h-6 text-blue-600 mr-2" />
        <h3 className="text-2xl font-bold text-gray-900">
          Comments ({comments.length})
        </h3>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="mb-8">
          <div className="flex items-start space-x-4">
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
          <p className="text-gray-600">Please sign in to leave a comment</p>
        </div>
      )}

      <div className="space-y-6">
        {comments.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="border-b border-gray-200 pb-6 last:border-0">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="font-semibold text-gray-900">
                    {comment.profiles?.display_name || comment.profiles?.username || 'Anonymous'}
                  </span>
                  <span className="text-gray-500 text-sm ml-2">
                    {formatDistanceToNow(comment.created_at)}
                  </span>
                </div>
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
              <p className="text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
