# Conversation Storage Setup Guide

## Overview

The chat feature now stores all conversations and messages in Supabase, allowing users to:
- Persist conversations across sessions
- Access conversation history
- Switch between multiple conversations
- Have conversations automatically saved as they chat

## Database Schema

The system uses two tables:

### `conversations` Table
- `id` - UUID (primary key)
- `user_id` - UUID (references auth.users, cascades on delete)
- `title` - TEXT (conversation title, auto-updated from first message)
- `created_at` - TIMESTAMPTZ
- `updated_at` - TIMESTAMPTZ (auto-updated when messages are added)

### `messages` Table
- `id` - UUID (primary key)
- `conversation_id` - UUID (references conversations, cascades on delete)
- `role` - TEXT ('user' or 'assistant')
- `content` - TEXT (message content)
- `created_at` - TIMESTAMPTZ

## Setup Instructions

### 1. Run the Database Schema

Run the updated `supabase_schema.sql` in your Supabase SQL Editor. The schema includes:

- `conversations` table with RLS policies
- `messages` table with RLS policies
- Indexes for performance
- Trigger to auto-update `conversations.updated_at` when messages are added

### 2. Row Level Security (RLS)

The schema automatically sets up RLS policies:
- Users can only view their own conversations
- Users can only create conversations for themselves
- Users can only view messages from their own conversations
- Users can only add messages to their own conversations

### 3. API Routes

The following API routes are available:

#### GET `/api/conversations`
- Fetches all conversations for the authenticated user
- Returns conversations with their messages
- Ordered by `updated_at` (most recent first)

#### POST `/api/conversations`
- Creates a new conversation
- Requires: `{ title: string }`
- Returns the created conversation

#### GET `/api/conversations/[id]`
- Fetches a single conversation with all messages
- Verifies ownership

#### PATCH `/api/conversations/[id]`
- Updates a conversation (mainly title)
- Requires: `{ title?: string }`
- Verifies ownership

#### DELETE `/api/conversations/[id]`
- Deletes a conversation (cascades to messages)
- Verifies ownership

#### POST `/api/conversations/[id]/messages`
- Adds a message to a conversation
- Requires: `{ role: 'user' | 'assistant', content: string }`
- Verifies conversation ownership

#### PUT `/api/conversations/[id]/messages`
- Adds multiple messages at once (batch insert)
- Requires: `{ messages: Array<{ role, content }> }`
- Verifies conversation ownership

## Features

### Automatic Conversation Management

1. **On Page Load**: 
   - Loads all user conversations from Supabase
   - If no conversations exist, creates a new one
   - Selects the most recent conversation

2. **Creating Conversations**:
   - Clicking "New Chat" creates a conversation in Supabase
   - Conversation is immediately available in the sidebar

3. **Sending Messages**:
   - User message is saved to Supabase immediately
   - Conversation title is updated from first message
   - Assistant response is saved after receiving from OpenAI
   - All messages are persisted with proper IDs

4. **Conversation Switching**:
   - Clicking a conversation loads it from state (already loaded)
   - Messages are displayed in chronological order

### Error Handling

- If Supabase operations fail, the UI gracefully degrades:
  - Messages still appear in the UI
  - Users can continue chatting
  - Errors are logged and shown via toast notifications
  - Fallback to local UUIDs if Supabase save fails

## Data Flow

1. **User sends message**:
   ```
   User types → Save to Supabase → Update UI → Call OpenAI → 
   Save response to Supabase → Update UI
   ```

2. **Page loads**:
   ```
   Fetch conversations → Load messages → Display in UI
   ```

3. **New conversation**:
   ```
   Click "New Chat" → Create in Supabase → Add to state → Select
   ```

## Security

- All API routes require authentication
- RLS policies ensure users can only access their own data
- Ownership verification on all operations
- Cascading deletes: deleting a conversation deletes all messages

## Performance

- Indexes on `user_id`, `conversation_id`, and `updated_at` for fast queries
- Messages are loaded with conversations (eager loading)
- Conversations ordered by `updated_at DESC` for recent-first display

## Troubleshooting

### "Failed to load conversations"
- Check that the database schema has been run
- Verify RLS policies are active
- Check user authentication status
- Check browser console for detailed errors

### "Failed to save message"
- Check Supabase connection
- Verify RLS policies allow inserts
- Check browser console for detailed errors
- Messages will still appear in UI (local state)

### Conversations not appearing
- Refresh the page
- Check that you're logged in
- Verify the conversations exist in Supabase dashboard
- Check RLS policies

### Missing messages
- Messages are loaded with conversations
- Check that messages exist in the database
- Verify the conversation_id matches

## Database Cleanup

To clean up old conversations, you can run:

```sql
-- Delete conversations older than 90 days
DELETE FROM conversations 
WHERE updated_at < NOW() - INTERVAL '90 days';
```

Note: This will cascade delete all messages in those conversations.

