# Zero-Trust Firestore Security Specification

This document details the security specification, invariants, and threat-modeling evaluation for the Geography Explorer membership system.

## 1. Core Data Invariants

1. **User Ownership (PII Isolation)**: A user's profile document under `users/{userId}` can only be read, created, or updated by the user whose authenticated UID exactly matches `{userId}`.
2. **Immutability of Key Meta**: The `createdAt` and `email` properties of a user document are strictly immutable after document initialization.
3. **Leaderboard Write Authenticated-Only**: Standard guest players can play locally, but only signed-in players (`request.auth != null`) can create new entries in the global `leaderboard` collection.
4. **Leaderboard Immutability**: Leaderboard entries are append-only. Once written, they can never be updated, edited, or deleted by any user. This blocks highscore corruption or post-hoc result tampering.
5. **Score and XP Integrity**: All points, levels, and XP increments submitted in `users` must align with schema definitions.
6. **Temporal Proofing**: All timestamp metrics (`createdAt`, `lastLogin`) must rely on server timestamps (`request.time`) instead of unreliable client inputs.

---

## 2. The "Dirty Dozen" Vulnerability Payloads

The following malicious payloads must be blocked, resulting in immediate `PERMISSION_DENIED` errors at the Firestore Rules engine level:

### Payload 1: PII Leakage (Unprivileged Profile Fetch)
- **Path**: `users/fake_user_id_xyz`
- **Action**: `get`
- **Attacker Auth**: Signed-In (UID: `attacker_123`)
- **Intent**: Read another user's email, level, or accomplishments.
- **Rules Invariant**: `allow read: if request.auth.uid == userId;`

### Payload 2: High Score Tampering (Leaderboard Mod)
- **Path**: `leaderboard/legitimate_score_abc`
- **Action**: `update`
- **Payload**: `{ "totalScore": 999999, "playerName": "Cheater" }`
- **Intent**: Modifying an existing highscore to claim the top rank.
- **Rules Invariant**: `allow update: if false;` (entirely disabled on the leaderboard).

### Payload 3: Score Erasement (Leaderboard Wipe)
- **Path**: `leaderboard/legitimate_score_abc`
- **Action**: `delete`
- **Intent**: Eliminating other competitors' high scores.
- **Rules Invariant**: `allow delete: if false;` (entirely disabled).

### Payload 4: Profile Email Spoofing
- **Path**: `users/victim_uid_789`
- **Action**: `update`
- **Payload**: `{ "email": "victim_spoofed@gmail.com" }`
- **Intent**: Overwriting another user's profile email to hijack account recovery.
- **Rules Invariant**: `allow update: if request.auth.uid == userId && incoming().email == existing().email;`

### Payload 5: Shadow Update (Ghost Field Injection)
- **Path**: `users/attacker_123`
- **Action**: `update`
- **Payload**: `{ "username": "Explorer", "isAdmin": true, "superpowersEnabled": true }`
- **Intent**: Injecting administrative overrides or unvalidated parameters.
- **Rules Invariant**: `affectedKeys().hasOnly(['username', 'level', 'xp', 'totalScore', 'highestScore', 'longestCombo', 'gamesPlayed', 'achievements', 'lastLogin'])`

### Payload 6: Temporal Spoofing
- **Path**: `users/attacker_123`
- **Action**: `create`
- **Payload**: `{ "createdAt": "2030-01-01T00:00:00Z", "email": "attacker@gmail.com", ... }`
- **Intent**: Claiming historical seniority or hacking daily counters.
- **Rules Invariant**: `incoming().createdAt == request.time`

### Payload 7: Self-Assigned Experience Escalation
- **Path**: `users/attacker_123`
- **Action**: `update`
- **Payload**: `{ "xp": 100000000, "level": 99, ... }` (extreme values)
- **Intent**: Rapidly level up and fake experience stats.
- **Rules Invariant**: `incoming().xp is int && incoming().xp >= 0 && incoming().xp <= 5000000 && incoming().level <= 100`

### Payload 8: Leaderboard Identity Spoofing
- **Path**: `leaderboard/new_submission_123`
- **Action**: `create`
- **Attacker Auth**: Anonymous or Unauthenticated (`request.auth == null`)
- **Intent**: Submit scores to the global leaderboard without registration.
- **Rules Invariant**: `allow create: if request.auth != null;`

### Payload 9: Longest Combo Underflow Abuse
- **Path**: `users/attacker_123`
- **Action**: `update`
- **Payload**: `{ "longestCombo": -100 }`
- **Intent**: Corrupting metrics with negative numbers that bypass standard range checks.
- **Rules Invariant**: `incoming().longestCombo >= 0`

### Payload 10: ID Poisoning (Massive Projectile Write)
- **Path**: `users/THIS_IS_A_VERY_LONG_GARBAGE_ID_CONTAINING_2000_CHARACTERS`
- **Action**: `create`
- **Intent**: Trying to bloat Firestore indexed fields to exhaust user memory bounds.
- **Rules Invariant**: `isValidId(userId)` check on user-provided references.

### Payload 11: Achievement Fabrication
- **Path**: `users/attacker_123`
- **Action**: `update`
- **Payload**: `{ "achievements": ["impossible_badge_1", "impossible_badge_2", "impossible_badge_3"] }`
- **Intent**: Arbitrarily unlocking exclusive accomplishments without performing required game actions.
- **Rules Invariant**: Constrain total size and elements within `achievements`.

### Payload 12: Anonymous User Write Hijack
- **Path**: `users/anyone`
- **Action**: `create`
- **Payload**: `{ "email": "unverified@hacker.com", "username": "Hacker" }`
- **Attacker Auth**: Not Logged In
- **Intent**: Polluting the database namespace with unauthenticated records.
- **Rules Invariant**: `allow create: if request.auth != null;`

---

## 3. Test Runner Execution Verification Matrix

All listed dirty vectors must trigger rejection. We will secure these vectors strictly in our `firestore.rules` compiler setup.
