# Customer Name Integration

## Overview
This document explains how customer names from the `cs_messages` table are integrated into the evaluation display.

## Database Structure

### Tables Involved
1. **cs_evaluation** - Contains evaluation data with `ticket_id` (human-readable) and `room_id` (UUID)
2. **cs_messages** - Contains message data with `room_id` (UUID), `sender_type`, and `sender_name`

### Relationship
- Both tables are linked via `room_id` (UUID format)
- `room_id` in cs_evaluation = `room_id` in cs_messages
- `ticket_id` in cs_evaluation is a human-readable identifier (e.g., "TICKET-B0B55E")
- Customer name is retrieved from `cs_messages` where `sender_type = 'customer'`

## Implementation

### 1. API Route (`/api/evaluations`)
The API fetches evaluations and then queries `cs_messages` to get customer names:

```typescript
// Step 1: Fetch evaluations
const evaluations = await supabase
  .from('cs_evaluation')
  .select('*')
  .order('created_at', { ascending: false })
  .limit(limit);

// Step 2: Get unique room_ids (UUID that links both tables)
const roomIds = [...new Set(evaluations.map(e => e.room_id).filter(Boolean))];

// Step 3: Fetch customer names from cs_messages
// Note: room_id in cs_evaluation = room_id in cs_messages
const messages = await supabase
  .from('cs_messages')
  .select('room_id, sender_name, sender_type')
  .in('room_id', roomIds)
  .eq('sender_type', 'customer');

// Step 4: Map customer names to evaluations using room_id
const transformedData = evaluations.map(evaluation => ({
  ...evaluation,
  customer_name: customerNames[evaluation.room_id] || null
}));
```

### 2. Interface Update
Added `customer_name` field to `CSEvaluation` interface:

```typescript
export interface CSEvaluation {
  // ... other fields
  customer_name: string | null;
  // ... other fields
}
```

### 3. UI Display
Customer name is displayed in the ticket detail modal:
- Location: Top right section of evaluation card
- Displayed above Agent and Channel information
- Only shown if customer_name is available

## Notes

- The query takes the **first customer message** name for each ticket_id
- If no customer message exists for a ticket, `customer_name` will be `null`
- The implementation uses a two-step query approach for better performance with Edge Runtime compatibility

## Optional: Add Foreign Key (Recommended)

If you want to enforce referential integrity, you can add a foreign key constraint:

```sql
-- Optional: Add foreign key constraint
-- Note: Only run this if you want to enforce that ticket_id in cs_evaluation 
-- must exist in cs_messages (as room_id)

-- Note: This requires that room_id in cs_messages has a unique constraint or is a primary key
-- ALTER TABLE cs_evaluation 
-- ADD CONSTRAINT fk_cs_evaluation_ticket 
-- FOREIGN KEY (ticket_id) 
-- REFERENCES cs_messages(room_id)
-- ON DELETE CASCADE;

-- Create index for better JOIN performance
CREATE INDEX IF NOT EXISTS idx_cs_messages_room_sender 
ON cs_messages(room_id, sender_type);
```

**Warning**: Only add the foreign key if:
1. All `ticket_id` values in `cs_evaluation` exist in `cs_messages` as `room_id`
2. You want to prevent orphaned evaluation records
3. You understand the implications of CASCADE delete

## Testing

To verify the integration works:

1. Check that customer names appear in the detail modal
2. Verify that evaluations without customer messages still display correctly
3. Test with various ticket_ids to ensure proper mapping

## Performance Considerations

- The API makes 2 queries: one for evaluations, one for customer names
- Customer names are fetched in bulk using `IN` clause for efficiency
- An index on `cs_message(ticket_id, sender_type)` is recommended for optimal performance
