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
          role: string;
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
