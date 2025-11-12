import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Enable Edge Runtime for Cloudflare compatibility
export const runtime = 'edge';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const agent = searchParams.get('agent');

    // First, get evaluations
    let query = supabase
      .from('cs_evaluation')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (agent && agent !== 'all') {
      query = query.eq('agent_name', agent);
    }

    const { data: evaluations, error } = await query;

    if (error) {
      console.error('Error fetching evaluations:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Get unique room_ids (this is what links to cs_messages)
    const roomIds = [...new Set(evaluations?.map(e => e.room_id).filter(Boolean))];

    // Fetch customer names from cs_messages for these room_ids
    let customerNames: Record<string, string> = {};
    if (roomIds.length > 0) {
      const { data: messages, error: msgError } = await supabase
        .from('cs_messages')
        .select('room_id, sender_name, sender_type')
        .in('room_id', roomIds)
        .eq('sender_type', 'customer');

      if (!msgError && messages) {
        // Create a map of room_id to customer name (take first customer message)
        messages.forEach(msg => {
          if (msg.room_id && msg.sender_name && !customerNames[msg.room_id]) {
            customerNames[msg.room_id] = msg.sender_name;
          }
        });
      } else if (msgError) {
        console.error('Error fetching customer names:', msgError);
      }
    }

    // Merge customer names into evaluations
    const transformedData = evaluations?.map(evaluation => ({
      ...evaluation,
      customer_name: evaluation.room_id ? customerNames[evaluation.room_id] || null : null
    }));

    return NextResponse.json(transformedData);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch evaluations' },
      { status: 500 }
    );
  }
}
