export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string;
          color: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
      };
      authors: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          bio: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['authors']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['authors']['Insert']>;
      };
      media_content: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string;
          content: string;
          category_id: string | null;
          author_id: string | null;
          media_type: string;
          media_url: string | null;
          thumbnail_url: string | null;
          external_url: string | null;
          source_id: string | null;
          source_published_at: string | null;
          duration: number;
          is_featured: boolean;
          is_trending: boolean;
          views_count: number;
          comments_count: number;
          published_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['media_content']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['media_content']['Insert']>;
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tags']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['tags']['Insert']>;
      };
      content_tags: {
        Row: {
          content_id: string;
          tag_id: string;
        };
        Insert: Database['public']['Tables']['content_tags']['Row'];
        Update: Partial<Database['public']['Tables']['content_tags']['Insert']>;
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      comments: {
        Row: {
          id: string;
          content_id: string;
          user_id: string;
          parent_id: string | null;
          content: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['comments']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['comments']['Insert']>;
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          name: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['newsletter_subscribers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>;
      };
      advertisements: {
        Row: {
          id: string;
          title: string;
          ad_type: string;
          placement: string;
          image_url: string;
          link_url: string;
          advertiser_name: string;
          start_date: string;
          end_date: string;
          is_active: boolean;
          impression_count: number;
          click_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['advertisements']['Row'], 'id' | 'impression_count' | 'click_count' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['advertisements']['Insert']>;
      };
      ad_impressions: {
        Row: {
          id: string;
          ad_id: string;
          user_agent: string;
          clicked: boolean;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['ad_impressions']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['ad_impressions']['Insert']>;
      };
      subscription_tiers: {
        Row: {
          id: string;
          name: string;
          description: string;
          price: number;
          billing_period: string;
          features: string[];
          is_active: boolean;
          stripe_price_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['subscription_tiers']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['subscription_tiers']['Insert']>;
      };
      view_events: {
        Row: {
          id: string;
          article_id: string;
          viewed_at: string;
          referrer: string | null;
          user_agent: string | null;
          country: string | null;
        };
        Insert: Omit<Database['public']['Tables']['view_events']['Row'], 'id' | 'viewed_at'>;
        Update: Partial<Database['public']['Tables']['view_events']['Insert']>;
      };
      ad_clicks: {
        Row: {
          id: string;
          article_id: string | null;
          ad_position: string;
          ad_type: string;
          clicked_at: string;
          referrer: string | null;
          user_agent: string | null;
          page_url: string | null;
        };
        Insert: Omit<Database['public']['Tables']['ad_clicks']['Row'], 'id' | 'clicked_at'>;
        Update: Partial<Database['public']['Tables']['ad_clicks']['Insert']>;
      };
    };
    Functions: {
      get_total_views: {
        Args: Record<string, never>;
        Returns: number;
      };
      get_daily_views: {
        Args: { days_back?: number };
        Returns: { date: string; count: number }[];
      };
      get_category_views_breakdown: {
        Args: Record<string, never>;
        Returns: { name: string; color: string; views: number; articles: number }[];
      };
      increment_article_views: {
        Args: { article_id: string };
        Returns: void;
      };
      increment_article_views_with_meta: {
        Args: { p_article_id: string; p_referrer?: string | null; p_user_agent?: string | null };
        Returns: void;
      };
      get_ad_click_stats: {
        Args: { days_back?: number };
        Returns: { total_clicks: number; clicks_today: number; clicks_this_week: number; top_position: string; top_position_clicks: number }[];
      };
      get_recent_activity: {
        Args: { activity_limit?: number };
        Returns: { activity_type: string; article_id: string; article_title: string; occurred_at: string; extra_info: string }[];
      };
      get_hourly_views: {
        Args: { days_back?: number };
        Returns: { hour_of_day: number; view_count: number }[];
      };
      get_top_referrers: {
        Args: { ref_limit?: number };
        Returns: { referrer_source: string; visit_count: number }[];
      };
    };
  };
}

export type Category = Database['public']['Tables']['categories']['Row'];
export type Author = Database['public']['Tables']['authors']['Row'];
export type MediaContent = Database['public']['Tables']['media_content']['Row'];
export type Tag = Database['public']['Tables']['tags']['Row'];

export interface MediaContentWithRelations extends MediaContent {
  categories: Category | null;
  authors: Author | null;
}
