import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDistanceToNow } from '../utils/date';
import { 
  MessageSquare, 
  TrendingUp, 
  AlertCircle,
  Users,
  ArrowRight
} from 'lucide-react';

interface EditorialFeature {
  id: string;
  content_id: string | null;
  title: string | null;
  editorial_description: string | null;
  feature_type: string;
  priority: number;
  call_to_action: string;
  discussion_enabled: boolean;
  engagement_goal: string | null;
  days_remaining: number | null;
  discussion_count: number;
  media_content: {
    title: string;
    slug: string;
    thumbnail_url: string | null;
    description: string | null;
    published_at: string;
    authors: {
      name: string;
      avatar_url: string | null;
    } | null;
    categories: {
      name: string;
      color: string | null;
    } | null;
  } | null;
}

export function EditorialSection() {
  const [features, setFeatures] = useState<EditorialFeature[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEditorialFeatures();
  }, []);

  async function loadEditorialFeatures() {
    try {
      const { data, error } = await supabase
        .from('editorial_features')
        .select(`
          *,
          media_content:content_id (
            title,
            slug,
            thumbnail_url,
            description,
            published_at,
            authors (*),
            categories (*)
          ),
          editorial_discussions (id)
        `)
        .eq('is_active', true)
        .gte('end_date', new Date().toISOString())
        .order('priority')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      const featuresWithCounts = data.map(feature => ({
        ...feature,
        discussion_count: feature.editorial_discussions?.length || 0,
        days_remaining: feature.end_date 
          ? Math.ceil((new Date(feature.end_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
          : null
      }));

      setFeatures(featuresWithCounts);
    } catch (error) {
      console.error('Error loading editorial features:', error);
    } finally {
      setLoading(false);
    }
  }

  const getFeatureIcon = (type: string) => {
    switch (type) {
      case 'breaking': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'trending': return <TrendingUp className="w-5 h-5 text-orange-500" />;
      case 'discussion': return <MessageSquare className="w-5 h-5 text-blue-500" />;
      case 'interview_spotlight': return <Users className="w-5 h-5 text-purple-500" />;
      case 'hot_topic': return <TrendingUp className="w-5 h-5 text-pink-500" />;
      default: return <TrendingUp className="w-5 h-5 text-gray-500" />;
    }
  };

  const getFeatureLabel = (type: string) => {
    switch (type) {
      case 'breaking': return 'Breaking';
      case 'trending': return 'Trending';
      case 'discussion': return 'Discussion';
      case 'interview_spotlight': return 'Interview';
      case 'hot_topic': return 'Hot Topic';
      default: return 'Featured';
    }
  };

  if (loading || features.length === 0) {
    return null;
  }

  return (
    <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto mb-16">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Editorial Spotlight</h2>
          <p className="text-gray-600 mt-2">Hot topics and featured discussions driving the conversation</p>
        </div>
        <Link 
          to="/editorial" 
          className="text-blue-600 hover:text-blue-700 font-medium flex items-center space-x-1"
        >
          <span>View All</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Primary Feature */}
        {features[0] && (
          <div className="lg:col-span-2">
            <div className="relative bg-gradient-to-br from-blue-50 to-purple-50 rounded-2xl overflow-hidden shadow-xl">
              <div className="absolute top-4 left-4 z-20 flex items-center space-x-2">
                {getFeatureIcon(features[0].feature_type)}
                <span className="bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-bold text-gray-900">
                  {getFeatureLabel(features[0].feature_type)}
                </span>
                {features[0].days_remaining !== null && features[0].days_remaining <= 7 && (
                  <span className="bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                    {features[0].days_remaining}d left
                  </span>
                )}
              </div>

              <Link to={`/article/${features[0].content_id}`} className="block">
                <img
                  src={features[0].media_content?.thumbnail_url || ''}
                  alt={features[0].title || features[0].media_content?.title || ''}
                  className="w-full h-64 lg:h-80 object-cover"
                />
                
                <div className="p-6">
                  <h3 className="text-2xl font-bold text-gray-900 mb-3 line-clamp-2">
                    {features[0].title || features[0].media_content?.title}
                  </h3>
                  
                  {features[0].editorial_description && (
                    <p className="text-gray-700 mb-4 line-clamp-3 leading-relaxed">
                      {features[0].editorial_description}
                    </p>
                  )}

                  {features[0].engagement_goal && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 p-3 mb-4">
                      <p className="text-blue-800 text-sm font-medium">
                        🎯 {features[0].engagement_goal}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <div className="flex items-center space-x-4">
                      {features[0].media_content?.authors && (
                        <span>{features[0].media_content.authors.name}</span>
                      )}
                      {features[0].media_content?.published_at && (
                        <span>{formatDistanceToNow(features[0].media_content.published_at)}</span>
                      )}
                    </div>
                    
                    {features[0].discussion_enabled && (
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-4 h-4" />
                        <span>{features[0].discussion_count} comments</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>

              {features[0].discussion_enabled && (
                <div className="px-6 pb-6">
                  <Link
                    to={`/article/${features[0].content_id}#discussions`}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span>{features[0].call_to_action}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Secondary Features */}
        <div className="space-y-6">
          {features.slice(1, 5).map((feature) => (
            <div key={feature.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <Link to={`/article/${feature.content_id}`} className="block">
                <div className="relative h-32">
                  <img
                    src={feature.media_content?.thumbnail_url || ''}
                    alt={feature.title || feature.media_content?.title || ''}
                    className="w-full h-full object-cover"
                  />
                  
                  <div className="absolute top-2 left-2">
                    {getFeatureIcon(feature.feature_type)}
                  </div>

                  {feature.days_remaining !== null && feature.days_remaining <= 3 && (
                    <div className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                      {feature.days_remaining}d
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <span className="text-xs font-bold text-gray-500 uppercase tracking-wide">
                    {getFeatureLabel(feature.feature_type)}
                  </span>
                  
                  <h4 className="text-lg font-bold text-gray-900 mt-1 mb-2 line-clamp-2">
                    {feature.title || feature.media_content?.title}
                  </h4>

                  {feature.editorial_description && (
                    <p className="text-gray-600 text-sm line-clamp-2 mb-3">
                      {feature.editorial_description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    {feature.media_content?.published_at && (
                      <span>{formatDistanceToNow(feature.media_content.published_at)}</span>
                    )}

                    {feature.discussion_enabled && (
                      <div className="flex items-center space-x-1">
                        <MessageSquare className="w-3 h-3" />
                        <span>{feature.discussion_count}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="mt-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 text-white text-center">
        <h3 className="text-2xl font-bold mb-4">Join the Conversation</h3>
        <p className="text-blue-100 mb-6 max-w-2xl mx-auto">
          These featured stories are driving important discussions. Share your thoughts, 
          engage with the community, and help shape the narrative.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/editorial"
            className="bg-white text-blue-600 font-bold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors"
          >
            View All Editorial Content
          </Link>
          <button className="border-2 border-white text-white font-bold px-6 py-3 rounded-lg hover:bg-white hover:text-blue-600 transition-colors">
            Subscribe for Updates
          </button>
        </div>
      </div>
    </section>
  );
}