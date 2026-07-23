// Hand-maintained mirror of the live Supabase schema (project bwtrtzvlqvykobmlfjcl).
// Kept in the shape @supabase/supabase-js expects from `supabase gen types typescript`
// (Row/Insert/Update/Relationships per table, plus Views/Functions/Enums/CompositeTypes) —
// postgrest-js needs the `Relationships` array to type embedded joins like
// `.select('*, authors(*), categories(*)')`; without it every joined select resolves to `never`.
// When the schema changes, update this file (or regenerate via `supabase gen types typescript`).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          color: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          color?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Insert']>;
        Relationships: [];
      };
      authors: {
        Row: {
          id: string;
          name: string;
          avatar_url: string | null;
          bio: string | null;
          disclaimer: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          avatar_url?: string | null;
          bio?: string | null;
          disclaimer?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['authors']['Insert']>;
        Relationships: [];
      };
      media_content: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          content: string | null;
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
          is_manual: boolean | null;
          views_count: number;
          comments_count: number;
          seo_title: string | null;
          seo_keywords: string | null;
          published_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          slug: string;
          description?: string | null;
          content?: string | null;
          category_id?: string | null;
          author_id?: string | null;
          media_type?: string;
          media_url?: string | null;
          thumbnail_url?: string | null;
          external_url?: string | null;
          source_id?: string | null;
          source_published_at?: string | null;
          duration?: number;
          is_featured?: boolean;
          is_trending?: boolean;
          is_manual?: boolean | null;
          views_count?: number;
          comments_count?: number;
          seo_title?: string | null;
          seo_keywords?: string | null;
          published_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['media_content']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'media_content_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'media_content_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'authors';
            referencedColumns: ['id'];
          },
        ];
      };
      media_content_archive: {
        Row: {
          id: string;
          title: string;
          slug: string;
          description: string | null;
          content: string | null;
          category_id: string | null;
          author_id: string | null;
          media_type: string | null;
          media_url: string | null;
          thumbnail_url: string | null;
          external_url: string | null;
          source_id: string | null;
          source_published_at: string | null;
          duration: number | null;
          is_featured: boolean | null;
          is_trending: boolean | null;
          views_count: number | null;
          comments_count: number | null;
          published_at: string | null;
          created_at: string | null;
          updated_at: string | null;
          archived_at: string | null;
        };
        Insert: Partial<Database['public']['Tables']['media_content_archive']['Row']> & { id: string };
        Update: Partial<Database['public']['Tables']['media_content_archive']['Row']>;
        Relationships: [];
      };
      tags: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tags']['Insert']>;
        Relationships: [];
      };
      content_tags: {
        Row: {
          content_id: string;
          tag_id: string;
        };
        Insert: {
          content_id: string;
          tag_id: string;
        };
        Update: Partial<Database['public']['Tables']['content_tags']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'content_tags_content_id_fkey';
            columns: ['content_id'];
            isOneToOne: false;
            referencedRelation: 'media_content';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'content_tags_tag_id_fkey';
            columns: ['tag_id'];
            isOneToOne: false;
            referencedRelation: 'tags';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string | null;
          display_name: string | null;
          full_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          is_admin: boolean;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_tier_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username?: string | null;
          display_name?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          is_admin?: boolean;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_tier_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
        Relationships: [];
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
        Insert: {
          id?: string;
          content_id: string;
          user_id: string;
          parent_id?: string | null;
          content: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['comments']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'comments_content_id_fkey';
            columns: ['content_id'];
            isOneToOne: false;
            referencedRelation: 'media_content';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'comments_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
        ];
      };
      comment_reactions: {
        Row: {
          id: string;
          comment_id: string;
          user_id: string;
          reaction_type: string | null;
          emoji: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          comment_id: string;
          user_id: string;
          reaction_type?: string | null;
          emoji: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['comment_reactions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'comment_reactions_comment_id_fkey';
            columns: ['comment_id'];
            isOneToOne: false;
            referencedRelation: 'comments';
            referencedColumns: ['id'];
          },
        ];
      };
      newsletter_subscribers: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          is_active: boolean;
          preferences: Json;
          subscribed_at: string;
          unsubscribed_at: string | null;
        };
        Insert: {
          id?: string;
          email: string;
          name?: string | null;
          is_active?: boolean;
          preferences?: Json;
          subscribed_at?: string;
          unsubscribed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['newsletter_subscribers']['Insert']>;
        Relationships: [];
      };
      advertisements: {
        Row: {
          id: string;
          title: string;
          ad_type: string;
          placement: string;
          image_url: string | null;
          link_url: string | null;
          advertiser_name: string | null;
          cpm_rate: number;
          start_date: string;
          end_date: string;
          is_active: boolean;
          impression_count: number;
          click_count: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          ad_type?: string;
          placement?: string;
          image_url?: string | null;
          link_url?: string | null;
          advertiser_name?: string | null;
          cpm_rate?: number;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
          impression_count?: number;
          click_count?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['advertisements']['Insert']>;
        Relationships: [];
      };
      ad_impressions: {
        Row: {
          id: string;
          ad_id: string;
          user_agent: string | null;
          user_ip: string | null;
          clicked: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          ad_id: string;
          user_agent?: string | null;
          user_ip?: string | null;
          clicked?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['ad_impressions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'ad_impressions_ad_id_fkey';
            columns: ['ad_id'];
            isOneToOne: false;
            referencedRelation: 'advertisements';
            referencedColumns: ['id'];
          },
        ];
      };
      subscription_tiers: {
        Row: {
          id: string;
          name: string;
          description: string;
          price_monthly: number;
          price_yearly: number;
          features: Json;
          ad_free: boolean;
          early_access: boolean;
          is_active: boolean;
          stripe_price_id: string | null;
          stripe_price_id_monthly: string | null;
          stripe_price_id_yearly: string | null;
          display_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string;
          price_monthly?: number;
          price_yearly?: number;
          features?: Json;
          ad_free?: boolean;
          early_access?: boolean;
          is_active?: boolean;
          stripe_price_id?: string | null;
          stripe_price_id_monthly?: string | null;
          stripe_price_id_yearly?: string | null;
          display_order?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['subscription_tiers']['Insert']>;
        Relationships: [];
      };
      view_events: {
        Row: {
          id: string;
          article_id: string | null;
          viewed_at: string;
          referrer: string | null;
          user_agent: string | null;
          country: string | null;
        };
        Insert: {
          id?: string;
          article_id?: string | null;
          viewed_at?: string;
          referrer?: string | null;
          user_agent?: string | null;
          country?: string | null;
        };
        Update: Partial<Database['public']['Tables']['view_events']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'view_events_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'media_content';
            referencedColumns: ['id'];
          },
        ];
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
        Insert: {
          id?: string;
          article_id?: string | null;
          ad_position: string;
          ad_type?: string;
          clicked_at?: string;
          referrer?: string | null;
          user_agent?: string | null;
          page_url?: string | null;
        };
        Update: Partial<Database['public']['Tables']['ad_clicks']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'ad_clicks_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'media_content';
            referencedColumns: ['id'];
          },
        ];
      };
      push_subscriptions: {
        Row: {
          id: string;
          user_id: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          category_id: string | null;
          created_at: string;
          last_seen_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          endpoint: string;
          p256dh: string;
          auth: string;
          category_id?: string | null;
          created_at?: string;
          last_seen_at?: string;
        };
        Update: Partial<Database['public']['Tables']['push_subscriptions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'push_subscriptions_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'categories';
            referencedColumns: ['id'];
          },
        ];
      };
      admin_users: {
        Row: {
          id: string;
          user_id: string;
          role: string | null;
          title: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          role?: string | null;
          title?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['admin_users']['Insert']>;
        Relationships: [];
      };
      user_roles: {
        Row: {
          user_id: string;
          role_label: string | null;
          is_ceo: boolean;
          is_chief_admin: boolean;
          is_editor: boolean;
          is_admin: boolean;
          is_writer: boolean;
          is_creator: boolean;
          can_onboard: boolean;
          can_approve_payments: boolean;
          can_apportion_articles: boolean;
          can_edit_editorial: boolean;
          can_executive: boolean;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          role_label?: string | null;
          is_ceo?: boolean;
          is_chief_admin?: boolean;
          is_editor?: boolean;
          is_admin?: boolean;
          is_writer?: boolean;
          is_creator?: boolean;
          can_onboard?: boolean;
          can_approve_payments?: boolean;
          can_apportion_articles?: boolean;
          can_edit_editorial?: boolean;
          can_executive?: boolean;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_roles']['Insert']>;
        Relationships: [];
      };
      reporter_applications: {
        Row: {
          id: string;
          user_id: string | null;
          full_name: string;
          email: string;
          phone_number: string | null;
          bio: string | null;
          coverage_areas: string | null;
          portfolio_url: string | null;
          status: string;
          review_comment: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          author_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          full_name: string;
          email: string;
          phone_number?: string | null;
          bio?: string | null;
          coverage_areas?: string | null;
          portfolio_url?: string | null;
          status?: string;
          review_comment?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          author_id?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['reporter_applications']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'reporter_applications_author_id_fkey';
            columns: ['author_id'];
            isOneToOne: false;
            referencedRelation: 'authors';
            referencedColumns: ['id'];
          },
        ];
      };
      creator_applications: {
        Row: {
          id: string;
          user_id: string | null;
          display_name: string;
          email: string | null;
          phone_number: string | null;
          bio: string | null;
          portfolio_url: string | null;
          sample_topics: string[] | null;
          instagram_handle: string | null;
          tiktok_handle: string | null;
          twitter_handle: string | null;
          youtube_channel: string | null;
          facebook_url: string | null;
          status: string;
          revenue_share_pct: number;
          total_earnings: number;
          total_views: number;
          articles_count: number;
          last_article_at: string | null;
          admin_notes: string | null;
          reviewed_at: string | null;
          onboarded_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          display_name: string;
          email?: string | null;
          phone_number?: string | null;
          bio?: string | null;
          portfolio_url?: string | null;
          sample_topics?: string[] | null;
          instagram_handle?: string | null;
          tiktok_handle?: string | null;
          twitter_handle?: string | null;
          youtube_channel?: string | null;
          facebook_url?: string | null;
          status?: string;
          revenue_share_pct?: number;
          total_earnings?: number;
          total_views?: number;
          articles_count?: number;
          last_article_at?: string | null;
          admin_notes?: string | null;
          reviewed_at?: string | null;
          onboarded_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['creator_applications']['Insert']>;
        Relationships: [];
      };
      creator_content: {
        Row: {
          id: string;
          creator_id: string;
          content_type: string;
          title: string;
          description: string | null;
          thumbnail_url: string | null;
          media_url: string | null;
          external_url: string | null;
          platform: string | null;
          category: string;
          tags: string[] | null;
          status: string;
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
        };
        Insert: {
          id?: string;
          creator_id: string;
          content_type: string;
          title: string;
          description?: string | null;
          thumbnail_url?: string | null;
          media_url?: string | null;
          external_url?: string | null;
          platform?: string | null;
          category?: string;
          tags?: string[] | null;
          status?: string;
          scheduled_at?: string | null;
          published_at?: string | null;
          duration_seconds?: number | null;
          view_count?: number;
          like_count?: number;
          comment_count?: number;
          share_count?: number;
          is_featured?: boolean;
          is_pinned?: boolean;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['creator_content']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'creator_content_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'creator_applications';
            referencedColumns: ['id'];
          },
        ];
      };
      creator_payouts: {
        Row: {
          id: string;
          creator_id: string | null;
          amount: number;
          period_start: string;
          period_end: string;
          status: string;
          payment_method: string;
          notes: string | null;
          created_at: string;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          creator_id?: string | null;
          amount: number;
          period_start: string;
          period_end: string;
          status?: string;
          payment_method?: string;
          notes?: string | null;
          created_at?: string;
          paid_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['creator_payouts']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'creator_payouts_creator_id_fkey';
            columns: ['creator_id'];
            isOneToOne: false;
            referencedRelation: 'creator_applications';
            referencedColumns: ['id'];
          },
        ];
      };
      content_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          icon: string | null;
          color: string | null;
          display_order: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          icon?: string | null;
          color?: string | null;
          display_order?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['content_categories']['Insert']>;
        Relationships: [];
      };
      editorial_features: {
        Row: {
          id: string;
          content_id: string | null;
          title: string | null;
          editorial_description: string | null;
          feature_type: string;
          priority: number;
          is_active: boolean;
          start_date: string;
          end_date: string | null;
          discussion_enabled: boolean;
          call_to_action: string;
          engagement_goal: string | null;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_id?: string | null;
          title?: string | null;
          editorial_description?: string | null;
          feature_type?: string;
          priority?: number;
          is_active?: boolean;
          start_date?: string;
          end_date?: string | null;
          discussion_enabled?: boolean;
          call_to_action?: string;
          engagement_goal?: string | null;
          created_by?: string | null;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['editorial_features']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'editorial_features_content_id_fkey';
            columns: ['content_id'];
            isOneToOne: false;
            referencedRelation: 'media_content';
            referencedColumns: ['id'];
          },
        ];
      };
      editorial_actions: {
        Row: {
          id: string;
          feature_id: string;
          action_type: string;
          action_description: string | null;
          performed_by: string | null;
          performed_at: string;
          metadata: Json;
        };
        Insert: {
          id?: string;
          feature_id: string;
          action_type: string;
          action_description?: string | null;
          performed_by?: string | null;
          performed_at?: string;
          metadata?: Json;
        };
        Update: Partial<Database['public']['Tables']['editorial_actions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'editorial_actions_feature_id_fkey';
            columns: ['feature_id'];
            isOneToOne: false;
            referencedRelation: 'editorial_features';
            referencedColumns: ['id'];
          },
        ];
      };
      editorial_discussions: {
        Row: {
          id: string;
          feature_id: string;
          user_id: string;
          content: string;
          parent_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          feature_id: string;
          user_id: string;
          content: string;
          parent_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['editorial_discussions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'editorial_discussions_feature_id_fkey';
            columns: ['feature_id'];
            isOneToOne: false;
            referencedRelation: 'editorial_features';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'editorial_discussions_parent_id_fkey';
            columns: ['parent_id'];
            isOneToOne: false;
            referencedRelation: 'editorial_discussions';
            referencedColumns: ['id'];
          },
        ];
      };
      live_events: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          event_type: string;
          cover_image_url: string | null;
          start_time: string;
          end_time: string | null;
          venue_or_link: string | null;
          ticket_price: number;
          max_attendees: number | null;
          current_attendees: number;
          host_name: string | null;
          host_avatar_url: string | null;
          is_featured: boolean;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          event_type?: string;
          cover_image_url?: string | null;
          start_time: string;
          end_time?: string | null;
          venue_or_link?: string | null;
          ticket_price?: number;
          max_attendees?: number | null;
          current_attendees?: number;
          host_name?: string | null;
          host_avatar_url?: string | null;
          is_featured?: boolean;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['live_events']['Insert']>;
        Relationships: [];
      };
      sponsored_content: {
        Row: {
          id: string;
          content_id: string | null;
          sponsor_name: string;
          sponsor_logo_url: string | null;
          sponsorship_fee: number;
          start_date: string;
          end_date: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_id?: string | null;
          sponsor_name: string;
          sponsor_logo_url?: string | null;
          sponsorship_fee?: number;
          start_date?: string;
          end_date?: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['sponsored_content']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'sponsored_content_content_id_fkey';
            columns: ['content_id'];
            isOneToOne: false;
            referencedRelation: 'media_content';
            referencedColumns: ['id'];
          },
        ];
      };
      affiliate_links: {
        Row: {
          id: string;
          content_id: string | null;
          product_name: string;
          affiliate_url: string;
          image_url: string | null;
          description: string | null;
          price: string | null;
          rating: number | null;
          commission_rate: number;
          click_count: number;
          conversion_count: number;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          content_id?: string | null;
          product_name: string;
          affiliate_url: string;
          image_url?: string | null;
          description?: string | null;
          price?: string | null;
          rating?: number | null;
          commission_rate?: number;
          click_count?: number;
          conversion_count?: number;
          is_active?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['affiliate_links']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'affiliate_links_content_id_fkey';
            columns: ['content_id'];
            isOneToOne: false;
            referencedRelation: 'media_content';
            referencedColumns: ['id'];
          },
        ];
      };
      content_licenses: {
        Row: {
          id: string;
          article_id: string | null;
          license_type: string;
          pricing_model: string;
          flat_fee: number | null;
          cpm_rate: number | null;
          revenue_share_pct: number | null;
          is_available: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          article_id?: string | null;
          license_type?: string;
          pricing_model?: string;
          flat_fee?: number | null;
          cpm_rate?: number | null;
          revenue_share_pct?: number | null;
          is_available?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['content_licenses']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'content_licenses_article_id_fkey';
            columns: ['article_id'];
            isOneToOne: false;
            referencedRelation: 'media_content';
            referencedColumns: ['id'];
          },
        ];
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          tier_id: string | null;
          stripe_subscription_id: string | null;
          stripe_customer_id: string | null;
          status: string;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tier_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_customer_id?: string | null;
          status?: string;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['user_subscriptions']['Insert']>;
        Relationships: [
          {
            foreignKeyName: 'user_subscriptions_tier_id_fkey';
            columns: ['tier_id'];
            isOneToOne: false;
            referencedRelation: 'subscription_tiers';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      restore_archived_article: {
        Args: { p_id: string };
        Returns: Json;
      };
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
      increment_ad_stat: {
        Args: { p_ad_id: string; p_event: string };
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
      get_my_profile: {
        Args: Record<string, never>;
        Returns: {
          id: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
        }[];
      };
      extend_editorial_feature: {
        Args: { feature_id_param: string; additional_days: number; reason?: string };
        Returns: boolean;
      };
      submit_reporter_application: {
        Args: {
          p_full_name: string;
          p_email: string;
          p_phone_number?: string | null;
          p_bio?: string | null;
          p_coverage?: string | null;
          p_portfolio_url?: string | null;
        };
        Returns: Json;
      };
      review_reporter_application: {
        Args: { p_application_id: string; p_approve: boolean; p_comment?: string | null };
        Returns: Json;
      };
      admin_register_reporter: {
        Args: {
          p_full_name: string;
          p_email: string;
          p_phone_number?: string | null;
          p_bio?: string | null;
          p_comment?: string | null;
        };
        Returns: Json;
      };
      submit_creator_application: {
        Args: {
          p_display_name: string;
          p_email: string;
          p_phone_number: string | null;
          p_bio?: string | null;
          p_topics?: string[] | null;
          p_instagram?: string | null;
          p_twitter?: string | null;
          p_tiktok?: string | null;
          p_youtube?: string | null;
          p_facebook_url?: string | null;
          p_portfolio_url?: string | null;
        };
        Returns: Json;
      };
      admin_register_creator: {
        Args: {
          p_display_name: string;
          p_email?: string | null;
          p_phone_number?: string | null;
          p_bio?: string | null;
          p_topics?: string[] | null;
          p_instagram?: string | null;
          p_twitter?: string | null;
          p_status?: string;
          p_admin_notes?: string | null;
        };
        Returns: Json;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
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
