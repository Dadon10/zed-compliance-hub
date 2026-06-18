export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          company_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          metadata: Json
          user_id: string | null
        }
        Insert: {
          action: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          company_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          metadata?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          industry: string | null
          name: string
          napsa_employer_no: string | null
          nhima_employer_no: string | null
          tpin: string | null
          wcfcb_no: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          name: string
          napsa_employer_no?: string | null
          nhima_employer_no?: string | null
          tpin?: string | null
          wcfcb_no?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          industry?: string | null
          name?: string
          napsa_employer_no?: string | null
          nhima_employer_no?: string | null
          tpin?: string | null
          wcfcb_no?: string | null
        }
        Relationships: []
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          company_id: string | null
          created_at: string
          id: string
          message: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          allowances: number
          company_id: string
          created_at: string
          employee_id: string | null
          employee_name: string
          errors: Json
          gross_salary: number
          id: string
          napsa: number
          net_pay: number
          nhima: number
          nhima_no: string | null
          other_deductions: number
          paye: number
          ssn: string | null
          tpin: string | null
          upload_id: string
          wcfcb: number
        }
        Insert: {
          allowances?: number
          company_id: string
          created_at?: string
          employee_id?: string | null
          employee_name: string
          errors?: Json
          gross_salary?: number
          id?: string
          napsa?: number
          net_pay?: number
          nhima?: number
          nhima_no?: string | null
          other_deductions?: number
          paye?: number
          ssn?: string | null
          tpin?: string | null
          upload_id: string
          wcfcb?: number
        }
        Update: {
          allowances?: number
          company_id?: string
          created_at?: string
          employee_id?: string | null
          employee_name?: string
          errors?: Json
          gross_salary?: number
          id?: string
          napsa?: number
          net_pay?: number
          nhima?: number
          nhima_no?: string | null
          other_deductions?: number
          paye?: number
          ssn?: string | null
          tpin?: string | null
          upload_id?: string
          wcfcb?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payroll_records_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "payroll_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_uploads: {
        Row: {
          company_id: string
          created_at: string
          employee_count: number
          error_count: number
          file_name: string
          id: string
          period_month: number
          period_year: number
          status: Database["public"]["Enums"]["upload_status"]
          total_gross: number
          total_napsa: number
          total_nhima: number
          total_paye: number
          total_wcfcb: number
          uploaded_by: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_count?: number
          error_count?: number
          file_name: string
          id?: string
          period_month: number
          period_year: number
          status?: Database["public"]["Enums"]["upload_status"]
          total_gross?: number
          total_napsa?: number
          total_nhima?: number
          total_paye?: number
          total_wcfcb?: number
          uploaded_by: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_count?: number
          error_count?: number
          file_name?: string
          id?: string
          period_month?: number
          period_year?: number
          status?: Database["public"]["Enums"]["upload_status"]
          total_gross?: number
          total_napsa?: number
          total_nhima?: number
          total_paye?: number
          total_wcfcb?: number
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payroll_uploads_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      rate_tables: {
        Row: {
          body: Database["public"]["Enums"]["statutory_body"]
          config: Json
          created_at: string
          effective_from: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          body: Database["public"]["Enums"]["statutory_body"]
          config: Json
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          body?: Database["public"]["Enums"]["statutory_body"]
          config?: Json
          created_at?: string
          effective_from?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          amount: number
          approved_by: string | null
          body: Database["public"]["Enums"]["statutory_body"]
          company_id: string
          created_at: string
          due_date: string | null
          id: string
          period_month: number
          period_year: number
          reference: string | null
          rejection_reason: string | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string | null
          submitted_by: string | null
          upload_id: string | null
        }
        Insert: {
          amount?: number
          approved_by?: string | null
          body: Database["public"]["Enums"]["statutory_body"]
          company_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          period_month: number
          period_year: number
          reference?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          upload_id?: string | null
        }
        Update: {
          amount?: number
          approved_by?: string | null
          body?: Database["public"]["Enums"]["statutory_body"]
          company_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          period_month?: number
          period_year?: number
          reference?: string | null
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "submissions_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "payroll_uploads"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      has_company_role: {
        Args: {
          _company: string
          _role: Database["public"]["Enums"]["app_role"]
          _user: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: { _company: string; _user: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "hr" | "finance" | "compliance"
      statutory_body: "NAPSA" | "PAYE" | "NHIMA" | "WCFCB"
      submission_status:
        | "draft"
        | "validated"
        | "approved"
        | "submitted"
        | "rejected"
        | "failed"
      upload_status: "processing" | "validated" | "has_errors" | "archived"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "hr", "finance", "compliance"],
      statutory_body: ["NAPSA", "PAYE", "NHIMA", "WCFCB"],
      submission_status: [
        "draft",
        "validated",
        "approved",
        "submitted",
        "rejected",
        "failed",
      ],
      upload_status: ["processing", "validated", "has_errors", "archived"],
    },
  },
} as const
