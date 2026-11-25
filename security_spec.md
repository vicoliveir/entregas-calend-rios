# Security Specification — Casa do Campo Calendar Distribution

## 1. Data Invariants

1. **Verified Authentication Required:** Every read and write on `/customers` and `/deliveries` requires an authenticated Firebase user with `request.auth.token.email_verified == true`.
2. **Single-Unit Regular Lock (Atomic Batch):** A `REGULAR` delivery in `/deliveries/{deliveryId}` can only be created if `/customers/{registrationNumber}` did not previously exist (`!exists(...)`) and is created atomically in the same WriteBatch (`existsAfter(...)` with `deliveryCount == 1`).
3. **Manager Exception Atomicity:** A `MANAGER_EXCEPTION` delivery can only be created when `/customers/{registrationNumber}` already exists, carries a non-empty justification (`3..300` chars), and atomically increments `deliveryCount` by exactly `1`.
4. **Immutable Audit Log:** Documents in `/deliveries/{deliveryId}` cannot be updated or deleted once created.
5. **Strict Ownership & Query Scoping:** List queries enforce `resource.data.ownerUid == request.auth.uid || isBootstrapAdmin()` without `get()`/`exists()` inside `allow list`.
6. **Temporal & Structural Integrity:** All timestamps (`createdAt`, `updatedAt`, `firstDeliveryAt`, `lastDeliveryAt`, `deliveredAt`) must equal `request.time` on creation/update; all strings have strict `.size()` bounds; all document IDs pass `isValidId()`.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return `PERMISSION_DENIED`)

1. **Unverified Email Spoof:** Auth token has `email: "victorhugoqxd@gmail.com"` with `email_verified: false` attempting `create` on `/customers/1001`.
2. **Shadow Field Injection (Customer):** Creating `/customers/1001` with all valid fields plus ghost field `isAdmin: true`.
3. **Shadow Field Injection (Delivery):** Creating `/deliveries/del_01` with all valid fields plus ghost field `approvedByServer: true`.
4. **Identity Spoofing:** Creating `/customers/1002` with `ownerUid: "victim-uid"` different from `request.auth.uid`.
5. **Orphaned Delivery Write:** Creating `/deliveries/del_orphan` without atomically creating or referencing an existing `/customers/{registrationNumber}`.
6. **Duplicate Regular Delivery Bypass:** Creating a second `type: "REGULAR"` delivery for an already-existing `/customers/1001`.
7. **Exception Without Justification:** Creating a `type: "MANAGER_EXCEPTION"` delivery with `justification: ""`.
8. **Backdated Timestamp Forgery:** Creating `/deliveries/del_fake_time` with client-supplied `deliveredAt` in the past instead of `request.time`.
9. **Invalid Branch Enumeration:** Creating `/deliveries/del_bad_branch` with `branch: "Fortaleza"`.
10. **ID Poisoning / Oversized String:** Creating `/customers/invalid$id` or passing a 500-character `fullName`.
11. **Immutable Field Mutation on Update:** Updating `/customers/1001` to change `firstDeliveryBranch`, `createdAt`, `ownerUid`, or setting `hasPickedUp: false`.
12. **Audit Tampering / Unauthorized List:** Attempting `update` or `delete` on `/deliveries/{deliveryId}` or listing another tenant's documents without matching `ownerUid`.
