# Security Specification - Team AXOTIC Hub

## 1. Data Invariants

1. **Self-Promotion Block (Identity Integrity)**: Users can create and edit their own profiles (`/users/{userId}`) but are strictly forbidden from modifying their own `role` field from `"member"` to `"admin"`. `role` escalations can only be performed by an existing Admin.
2. **Ghost Project Leader (relational Sync)**: A project cannot be created unless the `leaderId` matches an authenticated user who is active in the roster, and the `createdBy` field must match `request.auth.uid`.
3. **Temporal Sanity (Immutable Creation)**: The `createdAt` field of a project or project log must be identical to `request.time` (server timestamp) on creation and remain unchanged (`incoming().createdAt == existing().createdAt`) during any subsequent update.
4. **Finished Project Lock (Terminal State Locking)**: A project marked with `"Finished"` status is frozen. No standard members can append hardware allocations or modify details. Only Admins can modify historical or finished projects.
5. **Component Allocation Atomic Drain (Integrity)**: Item allocation quantities inside a project's allocated hardware cannot exceed the available quantity or be a negative number.
6. **Admin-Only Deletion & Salvaging (Tiered Privileges)**: Standard members do not have delete permissions on projects or inventory. Admin authorization is strictly required for deletion, stockroom baseline corrections, and component salvaging.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads represent hostile attempts to bypass our Attribute-Based Access Control:

1. **Payload 1: Role Escalation on Profile Creation**
   - Attempt by standard user `user_bob` to create a profile with `"role": "admin"`.
2. **Payload 2: Role Escalation via Profile Update**
   - Attempt by standard user `user_bob` to update their profile (`/users/user_bob`) changing `"role"` to `"admin"`.
3. **Payload 3: Project Hijack (Owner Alteration)**
   - Attempt by member to update a project and change the `createdBy` or `id` of an existing project.
4. **Payload 4: Shadow Fields / Pollution Assembly**
   - Attempt to create a Project containing a hidden, unvalidated key `"isFeaturedSecretPrereq": true` to bypass verification.
5. **Payload 5: Spoofed Temporal Signature**
   - Attempt to set an arbitrary past or future timestamp `createdAt: "1970-01-01T00:00:00Z"` instead of `request.time`.
6. **Payload 6: Unauthorized Project Manipulation**
   - Standard user `user_charlie` who is not a member or leader of `project_alpha` attempting to update `project_alpha`.
7. **Payload 7: Post-Terminal Mod Addition**
   - Member attempting to modify status or append new logs to a `"Finished"` project.
8. **Payload 8: Hardware Allocation Spill Over**
   - Attempting to allocate quantity `-10` of a microcontroller to a project to increase stock.
9. **Payload 9: Negative Material Theft**
   - Attempting to adjust stockroom quantity below `0` or bypass checkout entirely.
10. **Payload 10: Non-Admin Project Deletion**
    - Standard member `user_bob` attempting to issue a hard delete on `projects/project_beta`.
11. **Payload 11: Spoofed Admin Credentials**
    - Client trying to write custom `role: "admin"` directly inside the auth token custom-claims or spoof it in their update packet.
12. **Payload 12: Invalid Path Variable Poisoning**
    - Attempting to query or write a project with an ID containing malicious symbols `"projects/project_alpha_$$$__hack"`.

---

## 3. Test Cases Draft

All the malicious payloads listed above must return `PERMISSION_DENIED` under our rigorous `firestore.rules` checks. Let's write the rules file as a fortress!
