# Combined Header + Payload Layout Proposal

## Selected: Option 1 - Stacked with Sub-headings

### Structure:
```
┌────────────────────────────────────────────────────────────┐
│  JWT Token Structure                    [View Mode] [Copy] │
│  ──────────────────────────────────────────────────────    │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Header                                               │ │
│  │ ──────                                               │ │
│  │ [Line Numbers] │ {                                   │ │
│  │                │   "alg": "RS256",                   │ │
│  │                │   "typ": "JWT"                      │ │
│  │                │ }                                   │ │
│  │                                      [Copy Header]   │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ Payload                           [JSON] [Table]     │ │
│  │ ───────                                               │ │
│  │ [Line Numbers] │ {                                   │ │
│  │                │   "sub": "1234567890",              │ │
│  │                │   "name": "John Doe",               │ │
│  │                │   "iat": 1516239022                 │ │
│  │                │ }                                   │ │
│  │                                      [Copy Payload]  │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ▶ Key Claims (Collapsible)            [Expand/Collapse]│ │
│  │ ───────────                                            │ │
│  │ [Shows filtered important claims when expanded]       │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Features:
1. **Unified Section**: Single "JWT Token Structure" container
2. **Sub-sections**: Header, Payload, Key Claims with clear labels
3. **Independent Controls**: Each sub-section has its own copy button
4. **View Modes**: Payload section retains JSON/Table toggle
5. **Collapsible Key Claims**: Saves space, expanded on demand
6. **Shared Line Numbers**: Continuous numbering across Header → Payload
7. **Visual Separation**: Light borders/dividers between sub-sections

## Benefits:
✅ Better space utilization (no side-by-side splitting)
✅ Logical grouping (all token structure in one place)
✅ Clear hierarchy (main section → sub-sections)
✅ Mobile-friendly (stacks naturally)
✅ Easy to scan (all info visible at once)
✅ Independent copy actions per section

## Implementation Details:
- Main container: Full-width box with title "JWT Token Structure"
- Sub-sections: Header, Payload, Key Claims (each with own sub-header)
- Copy buttons: Per sub-section (Copy Header, Copy Payload, Copy Key Claims)
- View modes: Only on Payload section (JSON/Table)
- Line numbers: Continuous across all sub-sections
- Spacing: Consistent padding between sub-sections

