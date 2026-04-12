# Specialty Metadata Table — Design Spec

**Date:** 2026-04-12
**Status:** Approved

## Problem

The specialty field on the visit form is a plain free-text input. Users have to type the same values repeatedly with no consistency, and there is no guidance on common options.

## Goal

Replace the specialty text input with a dropdown backed by a seeded `specialties` metadata table. Users who need a value not in the list can still type a custom specialty; custom values are private to their own visit records and are not surfaced to other users.

---

## Database

**New table: `specialties`**

```sql
CREATE TABLE specialties (
    id         SMALLINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name       VARCHAR(100) NOT NULL UNIQUE,
    sort_order SMALLINT NOT NULL DEFAULT 0
);
```

Seeded in migration `V6__add_specialties.sql` with 30 common specialties ordered by `sort_order`:
General Practice, Internal Medicine, Cardiology, Dermatology, Endocrinology, Gastroenterology, Geriatrics, Gynecology, Hematology, Infectious Disease, Nephrology, Neurology, Obstetrics, Oncology, Ophthalmology, Orthopedics, ENT, Pediatrics, Psychiatry, Pulmonology, Rheumatology, Sports Medicine, Surgery (General), Urology, Vascular Surgery, Dentistry, Physiotherapy, Emergency Medicine, Palliative Care, Radiology.

**No changes to `visits.specialty`** — it remains a plain `VARCHAR`. No foreign key constraint is added, because custom values must also be storable.

To add or remove specialties in future: write a new Flyway migration.

---

## Backend

**New package: `com.medhistory.specialty`**

| File | Purpose |
|---|---|
| `Specialty.java` | JPA entity mapping `specialties` table (`id`, `name`, `sortOrder`) |
| `SpecialtyRepository.java` | `JpaRepository` with `findAllByOrderBySortOrderAsc()` |
| `SpecialtyController.java` | `GET /api/specialties` — returns `List<SpecialtyResponse>` |
| `SpecialtyResponse.java` | Record: `(Integer id, String name)` |

**Endpoint:**
```
GET /api/specialties
Response: [{ "id": 1, "name": "General Practice" }, ...]
```

- No authentication required — the list is non-sensitive and needs to load before or during the form
- Ordered by `sort_order` ascending
- No create/update/delete endpoints — the list is managed via migrations only

**No changes** to `VisitRequest`, `VisitService`, `VisitController`, or any existing visit code.

---

## Frontend

### `api.ts`

Add a `specialties` namespace:
```ts
specialties: {
  list: () => request<{ id: number; name: string }[]>('/api/specialties'),
}
```

### `VisitFormPage.tsx`

1. Fetch `api.specialties.list()` on mount; store in local state `specialties`.
2. Replace the specialty `<input>` with:
   - A `<select>` with: blank default (`""`), one `<option>` per specialty, and an "Other..." sentinel value (`"__other__"`) at the bottom.
   - A separate string state `customSpecialty` for the free-text value.
   - When `"__other__"` is selected, render a plain text `<input>` below the dropdown.
3. `form.specialty` is derived on submit:
   - If select value is `"__other__"` → use `customSpecialty`
   - Otherwise → use the select value
4. **Edit load:** if the stored `specialty` is not found in the predefined list, set the select to `"__other__"` and pre-fill `customSpecialty` with the stored value.

**No other pages change.** `VisitDetailPage` already renders `specialty` as a plain string and continues to work unchanged.

---

## Error handling

- If `GET /api/specialties` fails on form load, degrade gracefully: hide the select and show the plain text input instead (same experience as today).
- Custom text input: no backend validation — any non-empty string is accepted, consistent with current behaviour.

---

## Testing

- Unit test `SpecialtyController` confirms the endpoint returns all seeded specialties in sort order.
- Manual verification: new visit form shows dropdown; selecting "Other..." reveals text input; saved value appears correctly on visit detail page; edit form pre-selects correctly for both predefined and custom values.
