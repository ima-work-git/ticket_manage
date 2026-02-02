export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          nickname: string;
          created_at: string;
        };
        Insert: {
          id: string;
          nickname: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          nickname?: string;
          created_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          image_url: string | null;
          owner_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          image_url?: string | null;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          image_url?: string | null;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      staff: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          role: 'owner' | 'staff';
          invited_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id: string;
          role: 'owner' | 'staff';
          invited_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string;
          role?: 'owner' | 'staff';
          invited_by?: string | null;
          created_at?: string;
        };
      };
      idol_members: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          image_url: string | null;
          status: 'active' | 'graduated';
          graduated_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          image_url?: string | null;
          status?: 'active' | 'graduated';
          graduated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
          image_url?: string | null;
          status?: 'active' | 'graduated';
          graduated_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ticket_templates: {
        Row: {
          id: string;
          group_id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          target_member_id: string | null;
          expires_in_days: number | null;
          on_graduation: 'destroy' | 'convert' | 'refund';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          target_member_id?: string | null;
          expires_in_days?: number | null;
          on_graduation?: 'destroy' | 'convert' | 'refund';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          target_member_id?: string | null;
          expires_in_days?: number | null;
          on_graduation?: 'destroy' | 'convert' | 'refund';
          created_at?: string;
          updated_at?: string;
        };
      };
      tickets: {
        Row: {
          id: string;
          template_id: string;
          group_id: string;
          owner_id: string;
          issued_by: string;
          issued_at: string;
          status: 'active' | 'used' | 'expired' | 'refunded';
          expires_at: string | null;
          consumed_by: string | null;
          consumed_at: string | null;
          event_name: string | null;
        };
        Insert: {
          id?: string;
          template_id: string;
          group_id: string;
          owner_id: string;
          issued_by: string;
          issued_at?: string;
          status?: 'active' | 'used' | 'expired' | 'refunded';
          expires_at?: string | null;
          consumed_by?: string | null;
          consumed_at?: string | null;
          event_name?: string | null;
        };
        Update: {
          id?: string;
          template_id?: string;
          group_id?: string;
          owner_id?: string;
          issued_by?: string;
          issued_at?: string;
          status?: 'active' | 'used' | 'expired' | 'refunded';
          expires_at?: string | null;
          consumed_by?: string | null;
          consumed_at?: string | null;
          event_name?: string | null;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          group_id: string;
          actor_id: string;
          action: string;
          ticket_id: string | null;
          target_user_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          actor_id: string;
          action: string;
          ticket_id?: string | null;
          target_user_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          actor_id?: string;
          action?: string;
          ticket_id?: string | null;
          target_user_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
      };
      pending_tickets: {
        Row: {
          id: string;
          claim_token: string;
          template_id: string;
          group_id: string;
          issued_by: string;
          issued_at: string;
          expires_at: string | null;
          claimed_by: string | null;
          claimed_at: string | null;
        };
        Insert: {
          id?: string;
          claim_token: string;
          template_id: string;
          group_id: string;
          issued_by: string;
          issued_at?: string;
          expires_at?: string | null;
          claimed_by?: string | null;
          claimed_at?: string | null;
        };
        Update: {
          id?: string;
          claim_token?: string;
          template_id?: string;
          group_id?: string;
          issued_by?: string;
          issued_at?: string;
          expires_at?: string | null;
          claimed_by?: string | null;
          claimed_at?: string | null;
        };
      };
    };
  };
}
