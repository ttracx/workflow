export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          operationName?: string
          query?: string
          variables?: Json
          extensions?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      article: {
        Row: {
          article_status: Database["public"]["Enums"]["article_status"]
          created_at: string
          id: string
          project_id: string
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          article_status?: Database["public"]["Enums"]["article_status"]
          created_at?: string
          id?: string
          project_id: string
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          article_status?: Database["public"]["Enums"]["article_status"]
          created_at?: string
          id?: string
          project_id?: string
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_project_id_project_id_fk"
            columns: ["project_id"]
            referencedRelation: "project"
            referencedColumns: ["id"]
          }
        ]
      }
      article_metadata: {
        Row: {
          article_id: string
          id: string
        }
        Insert: {
          article_id: string
          id: string
        }
        Update: {
          article_id?: string
          id?: string
        }
        Relationships: []
      }
      article_node: {
        Row: {
          article_id: string
          data: Json
          id: string
          type: string
        }
        Insert: {
          article_id: string
          data: Json
          id?: string
          type: string
        }
        Update: {
          article_id?: string
          data?: Json
          id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_node_article_id_article_id_fk"
            columns: ["article_id"]
            referencedRelation: "article"
            referencedColumns: ["id"]
          }
        ]
      }
      data_row: {
        Row: {
          data: Json
          data_set_id: string
          id: string
        }
        Insert: {
          data: Json
          data_set_id: string
          id?: string
        }
        Update: {
          data?: Json
          data_set_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_row_data_set_id_data_set_id_fk"
            columns: ["data_set_id"]
            referencedRelation: "data_set"
            referencedColumns: ["id"]
          }
        ]
      }
      data_set: {
        Row: {
          description: string | null
          id: string
          name: string
          project_id: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
          project_id: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_set_project_id_project_id_fk"
            columns: ["project_id"]
            referencedRelation: "project"
            referencedColumns: ["id"]
          }
        ]
      }
      link: {
        Row: {
          article_id: string | null
          article_node_id: string
          id: string
          type: string
          url: string
        }
        Insert: {
          article_id?: string | null
          article_node_id: string
          id: string
          type: string
          url: string
        }
        Update: {
          article_id?: string | null
          article_node_id?: string
          id?: string
          type?: string
          url?: string
        }
        Relationships: []
      }
      node_data: {
        Row: {
          id: string
          project_id: string
          state: Json | null
          type: string
        }
        Insert: {
          id?: string
          project_id: string
          state?: Json | null
          type: string
        }
        Update: {
          id?: string
          project_id?: string
          state?: Json | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_data_project_id_project_id_fk"
            columns: ["project_id"]
            referencedRelation: "project"
            referencedColumns: ["id"]
          }
        ]
      }
      node_to_playground: {
        Row: {
          id: string
          node_id: string
          playground_id: string
        }
        Insert: {
          id?: string
          node_id: string
          playground_id: string
        }
        Update: {
          id?: string
          node_id?: string
          playground_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "node_to_playground_node_id_node_data_id_fk"
            columns: ["node_id"]
            referencedRelation: "node_data"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "node_to_playground_playground_id_playground_id_fk"
            columns: ["playground_id"]
            referencedRelation: "playground"
            referencedColumns: ["id"]
          }
        ]
      }
      playground: {
        Row: {
          created_at: string
          description: string | null
          edges: Json
          id: string
          layout: Json | null
          name: string
          nodes: Json
          project_id: string
          public: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          edges: Json
          id?: string
          layout?: Json | null
          name: string
          nodes: Json
          project_id: string
          public?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          edges?: Json
          id?: string
          layout?: Json | null
          name?: string
          nodes?: Json
          project_id?: string
          public?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "playground_project_id_project_id_fk"
            columns: ["project_id"]
            referencedRelation: "project"
            referencedColumns: ["id"]
          }
        ]
      }
      project: {
        Row: {
          id: string
          name: string
          site: string | null
          slug: string
        }
        Insert: {
          id?: string
          name: string
          site?: string | null
          slug: string
        }
        Update: {
          id?: string
          name?: string
          site?: string | null
          slug?: string
        }
        Relationships: []
      }
      project_api_key: {
        Row: {
          id: string
          key: string
          name: string
          project_id: string
        }
        Insert: {
          id?: string
          key: string
          name: string
          project_id: string
        }
        Update: {
          id?: string
          key?: string
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_api_key_project_id_project_id_fk"
            columns: ["project_id"]
            referencedRelation: "project"
            referencedColumns: ["id"]
          }
        ]
      }
      project_members: {
        Row: {
          id: string
          member_role: Database["public"]["Enums"]["member_role"]
          project_id: string
          user_id: string
        }
        Insert: {
          id?: string
          member_role?: Database["public"]["Enums"]["member_role"]
          project_id: string
          user_id: string
        }
        Update: {
          id?: string
          member_role?: Database["public"]["Enums"]["member_role"]
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_project_id_fk"
            columns: ["project_id"]
            referencedRelation: "project"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_user_id_fk"
            columns: ["user_id"]
            referencedRelation: "user"
            referencedColumns: ["id"]
          }
        ]
      }
      project_variable: {
        Row: {
          id: string
          is_system: boolean
          key: string
          project_id: string
          value: string | null
        }
        Insert: {
          id?: string
          is_system?: boolean
          key: string
          project_id: string
          value?: string | null
        }
        Update: {
          id?: string
          is_system?: boolean
          key?: string
          project_id?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_variable_project_id_project_id_fk"
            columns: ["project_id"]
            referencedRelation: "project"
            referencedColumns: ["id"]
          }
        ]
      }
      user: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          google_access_token: string | null
          google_refresh_token: string | null
          google_scopes: string[]
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_scopes?: string[]
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          google_access_token?: string | null
          google_refresh_token?: string | null
          google_scopes?: string[]
          id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          email: string
          id: string
          platforms: string[]
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          platforms?: string[]
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          platforms?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      article_status: "draft" | "published" | "archived"
      member_role: "owner" | "admin" | "editor" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null
          avif_autodetection: boolean | null
          created_at: string | null
          file_size_limit: number | null
          id: string
          name: string
          owner: string | null
          public: boolean | null
          updated_at: string | null
        }
        Insert: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id: string
          name: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Update: {
          allowed_mime_types?: string[] | null
          avif_autodetection?: boolean | null
          created_at?: string | null
          file_size_limit?: number | null
          id?: string
          name?: string
          owner?: string | null
          public?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buckets_owner_fkey"
            columns: ["owner"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      migrations: {
        Row: {
          executed_at: string | null
          hash: string
          id: number
          name: string
        }
        Insert: {
          executed_at?: string | null
          hash: string
          id: number
          name: string
        }
        Update: {
          executed_at?: string | null
          hash?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      objects: {
        Row: {
          bucket_id: string | null
          created_at: string | null
          id: string
          last_accessed_at: string | null
          metadata: Json | null
          name: string | null
          owner: string | null
          path_tokens: string[] | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          bucket_id?: string | null
          created_at?: string | null
          id?: string
          last_accessed_at?: string | null
          metadata?: Json | null
          name?: string | null
          owner?: string | null
          path_tokens?: string[] | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey"
            columns: ["bucket_id"]
            referencedRelation: "buckets"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_insert_object: {
        Args: {
          bucketid: string
          name: string
          owner: string
          metadata: Json
        }
        Returns: undefined
      }
      extension: {
        Args: {
          name: string
        }
        Returns: string
      }
      filename: {
        Args: {
          name: string
        }
        Returns: string
      }
      foldername: {
        Args: {
          name: string
        }
        Returns: unknown
      }
      get_size_by_bucket: {
        Args: Record<PropertyKey, never>
        Returns: {
          size: number
          bucket_id: string
        }[]
      }
      search: {
        Args: {
          prefix: string
          bucketname: string
          limits?: number
          levels?: number
          offsets?: number
          search?: string
          sortcolumn?: string
          sortorder?: string
        }
        Returns: {
          name: string
          id: string
          updated_at: string
          created_at: string
          last_accessed_at: string
          metadata: Json
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

