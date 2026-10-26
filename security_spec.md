# LibrasGo Security Specification & Firestore Hardening

## 1. Data Invariants
1. **User Identity & State Integrity**: A user can only write to their own profile doc (`/users/{userId}`) where `userId == request.auth.uid` (or matching authenticated identity). Users cannot alter RBAC roles or inject shadow privileges.
2. **New Account Purity**: New accounts start at Level 1, 0 XP, 0 gems, and 0 streak. XP and gems must be non-negative integers.
3. **Feedback Integrity**: Feedbacks sent by students (`/feedbacks/{feedbackId}`) must have valid category types (`sugestao`, `erro`, `reclamacao`, `elogio`) and default to status `pendente`. Students cannot arbitrarily alter `status` to `resolvido` or write `adminReply`.
4. **Admin Protection**: Only verified administrators can delete user accounts, delete feedbacks, or update official announcements.
5. **Path Variable Hardening**: Document IDs must satisfy `isValidId(id)` (alphanumeric, max 128 characters).

## 2. The "Dirty Dozen" Payloads (Adversarial Tests)
1. **Payload 1 (Shadow Privilege Escalation)**: Attempting to write `{ "isAdmin": true, "role": "admin" }` in `/users/{userId}`. (Must be DENIED)
2. **Payload 2 (ID Poisoning Attack)**: Document ID containing path traversal or shell characters `../../../etc/passwd`. (Must be DENIED)
3. **Payload 3 (Denial of Wallet - Bloated Payload)**: A user doc containing a 2MB string in `bio`. (Must be DENIED by `maxLength` 250 check)
4. **Payload 4 (State Shortcutting in Feedback)**: A non-admin user creating a feedback with `"status": "resolvido"` and a forged `"adminReply"`. (Must be DENIED)
5. **Payload 5 (Unauthenticated Profile Overwrite)**: Unauthenticated client calling `setDoc` on `/users/alice`. (Must be DENIED)
6. **Payload 6 (Cross-User Data Tampering)**: User `bob` trying to update `/users/alice` XP to 99999. (Must be DENIED)
7. **Payload 7 (Invalid Enum Injection)**: Feedback created with `"type": "malicious_script"`. (Must be DENIED)
8. **Payload 8 (Negative XP / Overflow)**: Attempting to set `xp: -5000` or invalid types. (Must be DENIED)
9. **Payload 9 (Unauthorized Feedback Deletion)**: A regular user attempting to delete a feedback from the database. (Must be DENIED; admin only)
10. **Payload 10 (Forged Announcement)**: Non-admin writing to `/announcements/ann_1`. (Must be DENIED)
11. **Payload 11 (Blanket Collection Scraping)**: Reading all user profiles without filtering. (Must be DENIED; split/owner isolation)
12. **Payload 12 (Ghost Field Injection)**: Creating a user document containing undocumented field `{"hack": 123}` violating strict schema. (Must be DENIED)
