SYSTEM MODE: SOCIAL MODULE DEEP AUDIT & FULL RECONSTRUCTION
DO NOT MODIFY ACADEMIC / SCHOOL MANAGEMENT CORE (V1 IS LOCKED).
Focus ONLY on the Social system.

-----------------------------------------
PHASE 1 — FULL SOCIAL SYSTEM AUDIT
-----------------------------------------

Deeply inspect:
• 1-to-1 chat
• Group chat
• Community system
• Calls (audio/video)
• Notifications
• Message storage
• UI logic
• Socket implementation
• Message delivery flow
• Read receipts
• Online/offline status

Identify:
• Broken logic
• Fake UI responses
• Non-persistent messages
• Poor UI flow
• Missing real-time updates
• Any mock or dummy behavior

Fix everything properly.
No fake simulations.
Everything must be real and tested.

-----------------------------------------
PHASE 2 — PRIVATE CHAT (WhatsApp-Style)
-----------------------------------------

Chat must behave like WhatsApp:

• “New” button → Options:
    - New Contact
    - New Group
    - New Community

-----------------------------------------
NEW CONTACT FLOW
-----------------------------------------

User enters:
• Email (instead of phone number)
System:
• Validate email exists
• If valid → allow saving contact
• User chooses display name for that contact
• Contact saved per user (unique naming allowed)

Chat Rules:
• Chat is unique per pair of users
• Messages persist in DB
• Real-time via Socket.IO
• Message delivery confirmation
• Read receipt
• Typing indicator
• Online status

Test:
• Send message → verify DB persistence
• Verify real-time reception
• Verify correct user isolation

-----------------------------------------
PHASE 3 — GROUP CHAT
-----------------------------------------

Group Creation Wizard:
• Group name
• Description
• Add members by email
• Group avatar
• Privacy setting

Group must support:
• Admin roles
• Add/remove members
• Message history persistence
• Group call (audio/video)
• Real-time updates

-----------------------------------------
PHASE 4 — COMMUNITY SYSTEM
-----------------------------------------

Community is larger structured space.

Community must support:
• Community creation
• Public / Private
• Join request approval (if private)
• Real member list (no fake data)
• Posts inside community
• Threaded discussion
• Notifications on new posts

When user joins:
• Community must appear in their dashboard
• Posts must be live & persistent

-----------------------------------------
PHASE 5 — REAL AUDIO & VIDEO CALLS
-----------------------------------------

Implement:
• 1-to-1 audio call
• 1-to-1 video call
• Group audio call
• Group video call

Use:
• Socket.IO for signaling
• WebRTC for media transport

Call Flow:
1. User taps call
2. Receiver gets incoming call screen
3. Accept / Reject
4. If accepted → real audio/video stream established
5. Proper call end handling

Must test:
• Browser-to-browser call
• Group call session
• Proper cleanup after call
• No memory leaks

NO FAKE CALL UI.
REAL functioning calls only.

-----------------------------------------
PHASE 6 — MESSAGE ARCHITECTURE
-----------------------------------------

Messages must support:
• Text
• Emoji
• Attachments
• Voice notes (optional if possible)
• Timestamp
• Sender ID
• Chat ID
• Delivery status

Ensure:
• Messages are DB-backed
• No duplication
• No cross-user leak
• Proper indexing for performance

-----------------------------------------
PHASE 7 — NOTIFICATIONS
-----------------------------------------

When:
• New message
• New community post
• New group mention
• Incoming call

Trigger:
• In-app notification
• Real-time badge update

-----------------------------------------
PHASE 8 — UI IMPROVEMENT
-----------------------------------------

Chat UI must:
• Scroll naturally
• Auto-scroll to new messages
• Show typing indicator
• Show seen status
• Smooth transitions
• Clean WhatsApp-like layout
• Mobile-friendly

No database-table appearance.
Modern clean layout only.

-----------------------------------------
PHASE 9 — SECURITY & ISOLATION
-----------------------------------------

• Each user chat is private.
• No user can access another user's chat.
• Communities respect privacy.
• Group permissions enforced.
• No academic module interference.

-----------------------------------------
PHASE 10 — FULL SYSTEM TESTING
-----------------------------------------

Simulate:
• 5 users chatting
• 2 groups active
• 1 community active
• 1-to-1 call
• Group call

Test:
• Message persistence
• Real-time sync
• Call stability
• Notification triggers
• UI behavior

-----------------------------------------
FINAL REQUIREMENTS
-----------------------------------------

• Do NOT touch academic modules.
• Do NOT break enrollment or payment.
• Only modify Social system.
• No mock data.
• No fake UI.
• Everything must be production-ready.
• Version 1 Social must feel complete and stable.

OUTPUT:
1. Gaps found
2. Fixes applied
3. Improvements made
4. Confirmation of real-time stability
5. Confirmation of working audio/video calls
6. Confirmation of DB persistence integrity
