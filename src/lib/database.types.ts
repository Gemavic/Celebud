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
          duration: number;
          is_featured: boolean;
          is_trending: boolean;
          views_count: number;
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
