export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      orgs: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
      };
      branches: {
        Row: { id: string; org_id: string; name: string; address: string | null; created_at: string };
        Insert: { id?: string; org_id: string; name: string; address?: string | null; created_at?: string };
        Update: { id?: string; org_id?: string; name?: string; address?: string | null; created_at?: string };
      };
      profiles: {
        Row: {
          user_id: string;
          org_id: string;
          phone: string | null;
          full_name: string | null;
          role: "owner" | "admin";
          created_at: string;
        };
        Insert: {
          user_id: string;
          org_id: string;
          phone?: string | null;
          full_name?: string | null;
          role?: "owner" | "admin";
          created_at?: string;
        };
        Update: {
          user_id?: string;
          org_id?: string;
          phone?: string | null;
          full_name?: string | null;
          role?: "owner" | "admin";
          created_at?: string;
        };
      };
      org_settings: {
        Row: {
          org_id: string;
          default_branch_id: string | null;
          tg_connected: boolean;
          wa_connected: boolean;
          max_connected: boolean;
          updated_at: string;
        };
        Insert: {
          org_id: string;
          default_branch_id?: string | null;
          tg_connected?: boolean;
          wa_connected?: boolean;
          max_connected?: boolean;
          updated_at?: string;
        };
        Update: {
          org_id?: string;
          default_branch_id?: string | null;
          tg_connected?: boolean;
          wa_connected?: boolean;
          max_connected?: boolean;
          updated_at?: string;
        };
      };
      kpi_daily: {
        Row: {
          id: string;
          org_id: string;
          branch_id: string | null;
          day: string;
          unique_inquiries: number;
          total_messages: number;
          inbound_messages: number;
          outbound_messages: number;
          new_bookings: number;
          revenue: number;
          potential_revenue: number;
          no_show_count: number;
          new_clients_month: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          branch_id?: string | null;
          day: string;
          unique_inquiries?: number;
          total_messages?: number;
          inbound_messages?: number;
          outbound_messages?: number;
          new_bookings?: number;
          revenue?: number;
          potential_revenue?: number;
          no_show_count?: number;
          new_clients_month?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          branch_id?: string | null;
          day?: string;
          unique_inquiries?: number;
          total_messages?: number;
          inbound_messages?: number;
          outbound_messages?: number;
          new_bookings?: number;
          revenue?: number;
          potential_revenue?: number;
          no_show_count?: number;
          new_clients_month?: number;
          updated_at?: string;
        };
      };
      service_kpi_daily: {
        Row: {
          id: string;
          org_id: string;
          branch_id: string | null;
          day: string;
          service_name: string;
          bookings_count: number;
          revenue: number;
          no_show_count: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          branch_id?: string | null;
          day: string;
          service_name: string;
          bookings_count?: number;
          revenue?: number;
          no_show_count?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          branch_id?: string | null;
          day?: string;
          service_name?: string;
          bookings_count?: number;
          revenue?: number;
          no_show_count?: number;
          updated_at?: string;
        };
      };
      reviews_daily: {
        Row: {
          org_id: string;
          source: string;
          day: string;
          rating: number;
          reviews_count: number;
          updated_at: string;
        };
        Insert: {
          org_id: string;
          source?: string;
          day: string;
          rating?: number;
          reviews_count?: number;
          updated_at?: string;
        };
        Update: {
          org_id?: string;
          source?: string;
          day?: string;
          rating?: number;
          reviews_count?: number;
          updated_at?: string;
        };
      };
      campaigns: {
        Row: {
          id: string;
          org_id: string;
          branch_id: string | null;
          title: string;
          message: string;
          channels: string[];
          status: "draft" | "queued" | "running" | "done" | "failed";
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          branch_id?: string | null;
          title: string;
          message: string;
          channels: string[];
          status?: "draft" | "queued" | "running" | "done" | "failed";
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          branch_id?: string | null;
          title?: string;
          message?: string;
          channels?: string[];
          status?: "draft" | "queued" | "running" | "done" | "failed";
          created_by?: string;
          created_at?: string;
        };
      };
      campaign_runs: {
        Row: {
          id: string;
          campaign_id: string;
          started_at: string;
          finished_at: string | null;
          status: string;
          sent: number;
          delivered: number;
          read: number;
          replied: number;
          booked: number;
          errors: number;
          details: Json;
        };
        Insert: {
          id?: string;
          campaign_id: string;
          started_at?: string;
          finished_at?: string | null;
          status?: string;
          sent?: number;
          delivered?: number;
          read?: number;
          replied?: number;
          booked?: number;
          errors?: number;
          details?: Json;
        };
        Update: {
          id?: string;
          campaign_id?: string;
          started_at?: string;
          finished_at?: string | null;
          status?: string;
          sent?: number;
          delivered?: number;
          read?: number;
          replied?: number;
          booked?: number;
          errors?: number;
          details?: Json;
        };
      };
      automation_runs: {
        Row: {
          id: string;
          org_id: string;
          branch_id: string | null;
          automation_key: string;
          day: string;
          sent: number;
          replied: number;
          booked: number;
          notes: Json;
        };
        Insert: {
          id?: string;
          org_id: string;
          branch_id?: string | null;
          automation_key: string;
          day: string;
          sent?: number;
          replied?: number;
          booked?: number;
          notes?: Json;
        };
        Update: {
          id?: string;
          org_id?: string;
          branch_id?: string | null;
          automation_key?: string;
          day?: string;
          sent?: number;
          replied?: number;
          booked?: number;
          notes?: Json;
        };
      };
      subscriptions: {
        Row: {
          org_id: string;
          plan: string;
          status: "inactive" | "active" | "past_due" | "canceled";
          paid_until: string | null;
          last_payment_url: string | null;
          last_payment_operation_id: string | null;
          updated_at: string;
        };
        Insert: {
          org_id: string;
          plan?: string;
          status?: "inactive" | "active" | "past_due" | "canceled";
          paid_until?: string | null;
          last_payment_url?: string | null;
          last_payment_operation_id?: string | null;
          updated_at?: string;
        };
        Update: {
          org_id?: string;
          plan?: string;
          status?: "inactive" | "active" | "past_due" | "canceled";
          paid_until?: string | null;
          last_payment_url?: string | null;
          last_payment_operation_id?: string | null;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          org_id: string;
          provider: string;
          operation_id: string;
          amount: number;
          status: "created" | "paid" | "failed" | "refunded";
          paid_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          org_id: string;
          provider?: string;
          operation_id: string;
          amount: number;
          status: "created" | "paid" | "failed" | "refunded";
          paid_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          org_id?: string;
          provider?: string;
          operation_id?: string;
          amount?: number;
          status?: "created" | "paid" | "failed" | "refunded";
          paid_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
