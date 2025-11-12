import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface CSEvaluation {
  id: string;
  ticket_id: string | null;
  room_id: string | null;
  agent_name: string | null;
  channel_account: string | null;
  customer_name: string | null;
  customer_message: string | null;
  cs_reply: string | null;
  suggested_reply: string | null;
  accuracy: number | null;
  tone: number | null;
  clarity: number | null;
  completeness: number | null;
  relevance: number | null;
  overall_score: number | null;
  feedback: string | null;
  tags: string | null;
  created_at: string;
}

export interface DashboardStats {
  totalEvaluations: number;
  averageScore: number;
  topAgent: string;
  recentEvaluations: CSEvaluation[];
}
