import { useState, useEffect } from 'react';
import { CreditCard as Edit2, Check, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Article {
  id: string;
  title: string;
  category_id: string;
  categories: {
    id: string;
    name: string;
    slug: string;
  } | null;
}

interface RecategorizeArticleProps {
  articleId: string;
  currentCategoryId: string;
  currentCategoryName: string;
  onRecategorize?: () => void;
}

export function RecategorizeArticle({
  articleId,
  currentCategoryId,
  currentCategoryName,
  onRecategorize,
}: RecategorizeArticleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(currentCategoryId);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setError('Failed to load categories');
    }
  };

  const handleRecategorize = async () => {
    if (selectedCategoryId === currentCategoryId) {
      setIsEditing(false);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recategorize-article`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          article_id: articleId,
          category_id: selectedCategoryId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to recategorize article');
      }

      const result = await response.json();
      setSuccess(true);
      setIsEditing(false);

      setTimeout(() => {
        setSuccess(false);
        if (onRecategorize) {
          onRecategorize();
        }
      }, 2000);
    } catch (err) {
      console.error('Error recategorizing:', err);
      setError(err instanceof Error ? err.message : 'Failed to recategorize article');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setSelectedCategoryId(currentCategoryId);
    setIsEditing(false);
    setError(null);
  };

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{currentCategoryName}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          title="Change category"
        >
          <Edit2 className="w-4 h-4" />
        </button>
        {success && (
          <span className="text-sm text-green-600 flex items-center gap-1">
            <Check className="w-4 h-4" />
            Updated
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <select
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
        <button
          onClick={handleRecategorize}
          disabled={loading || selectedCategoryId === currentCategoryId}
          className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title="Save"
        >
          <Check className="w-4 h-4" />
        </button>
        <button
          onClick={handleCancel}
          disabled={loading}
          className="p-1.5 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          title="Cancel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
