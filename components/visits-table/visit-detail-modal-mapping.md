# Visit Details Modal – Column / Field Mapping

Mapping of every field shown in the **Visit Details** modal (e.g. "Visit Details – #116") to the data model and data presence for the reference screenshot.

**Reference:** Visit #116 (User: Prudence Lehcwe, Date: Feb 26, 2026).

---

## Header

| Modal label      | Data source              | In screenshot | Notes                    |
|------------------|--------------------------|---------------|--------------------------|
| Visit ID         | `visit.uid`              | ✅ Present    | e.g. `#116`              |
| User name        | `visit.owner` (name + surname) | ✅ Present | e.g. Prudence Lehcwe     |
| Visit date       | `visit.checkInTime`      | ✅ Present    | e.g. Feb 26, 2026        |

---

## Timing

| Modal label | Data source         | In screenshot | Notes                          |
|-------------|---------------------|---------------|--------------------------------|
| Check-in    | `visit.checkInTime` | ✅ Present    | e.g. Feb 26, 2026 – 1:28 PM    |
| Check-out   | `visit.checkOutTime`| ✅ Present    | e.g. Feb 26, 2026 – 1:34 PM    |
| Duration    | `visit.duration`    | ✅ Present    | e.g. 0h 6m                     |

---

## Location

| Modal label | Data source                          | In screenshot | Notes                                      |
|-------------|--------------------------------------|---------------|--------------------------------------------|
| In (check-in address)  | `visit.fullAddress` or `visit.checkInLocation`  | ✅ Present | e.g. 364 Main Reef Rd, Denver, Johannesburg, 2011, South Africa |
| Out (check-out address)| `visit.checkOutFullAddress` or `visit.checkOutLocation` | ✅ Present | Same as In in screenshot        |

---

## Photos

| Modal label     | Data source            | In screenshot | Notes                              |
|-----------------|------------------------|---------------|------------------------------------|
| Check-in photo  | `visit.checkInPhoto`   | ✅ Present    | Image shown                        |
| Check-out photo | `visit.checkOutPhoto`  | ❌ **No data**| Black placeholder / not provided   |
| Contact image   | `visit.contactImage`  | Not in section in UI | Optional; can appear in Photos  |

---

## Details (visit & contact)

| Modal label       | Data source               | In screenshot | Notes                    |
|-------------------|---------------------------|---------------|--------------------------|
| Notes             | `visit.notes`             | ✅ Present    | e.g. "The customer requested..." |
| Resolution        | `visit.resolution`        | ✅ Present    | e.g. "I sent him a photo..."      |
| Contact (name)    | `visit.contactFullName`   | ✅ Present    | e.g. Joy                 |
| Company           | `visit.companyName`       | Not shown in screenshot Details | Often empty ("-") in table |

---

## Additional fields (export / table; should appear in modal for “all detail”)

These columns exist in the export and table; the modal should show them so **all detail** is visible. Data presence is often empty for many visits.

| Modal / export label | Data source                | Often has data? | Notes              |
|----------------------|----------------------------|-----------------|--------------------|
| Method               | `visit.methodOfContact`   | Sometimes       | Physical, Telephone, etc. |
| Building type        | `visit.buildingType`      | Sometimes       |                    |
| Contact made         | `visit.contactMade`       | Sometimes       | Yes / No           |
| Business type        | `visit.businessType`      | Often empty     | Table shows "-"    |
| Person seen position | `visit.personSeenPosition`| Often empty     |                    |
| Contact name         | `visit.contactFullName`   | Sometimes       | Same as "Contact"  |
| Contact image        | `visit.contactImage`      | Often empty     | URL or "-"         |
| Cell                 | `visit.contactCellPhone`  | Sometimes       |                    |
| Landline             | `visit.contactLandline`   | Often empty     |                    |
| Contact email       | `visit.contactEmail`      | Often empty     |                    |
| Contact address     | `visit.contactAddress`    | Often empty     | Formatted address  |
| Meeting link        | `visit.meetingLink`       | Often empty     |                    |
| Follow-up           | `visit.followUp`         | Often empty     |                    |
| Quote number        | `visit.quotationNumber`   | Often empty     |                    |
| Quotation status    | `visit.quotationStatus`   | Often empty     |                    |
| Value (ex-VAT)      | `visit.salesValue`        | Often empty     | R amount           |
| Lead                | `visit.lead?.name`       | Often empty     |                    |
| Client              | `visit.client?.name`      | Often empty     |                    |
| Branch              | `visit.branch?.name`      | Often empty     |                    |

---

## Summary – fields that did not have data (screenshot #116)

- **Check-out photo** – no image (black placeholder).
- Background table columns **Contact made**, **Company**, **Business type** showed "-" for this visit; the modal should still show these labels with "-" when empty so all detail is present.

---

## Implementation

- **VisitDetailDialog** in `visits-table.tsx` should render every field above.
- Use "-" (or “Not set”) for missing values so the modal always shows the full set of columns/detail.
