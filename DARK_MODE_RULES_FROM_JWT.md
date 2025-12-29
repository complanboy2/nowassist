# Dark Mode Rules Extracted from JWT Decoder Page

## Critical Rules (MUST follow exactly):

### 1. **Background Colors**
- `bg-white` → **MUST** become `bg-white dark:bg-gray-800`
- `bg-gray-50` → **MUST** become `bg-gray-50 dark:bg-gray-700` (for headers/panels)
- `bg-gray-100` → **MUST** become `bg-gray-100 dark:bg-gray-800` or `dark:bg-gray-700`

### 2. **Text Colors (ALL must be WHITE for visibility)**
- `text-gray-700` → **MUST** become `text-gray-700 dark:text-white`
- `text-gray-600` → **MUST** become `text-gray-600 dark:text-white` (or `dark:text-gray-400` for less emphasis)
- `text-gray-900` → **MUST** become `text-gray-900 dark:text-white`
- `text-gray-800` → **MUST** become `text-gray-800 dark:text-white`
- `text-gray-300` → **MUST** become `text-gray-300 dark:text-white`
- `text-gray-200` → **MUST** become `text-gray-200 dark:text-white`
- `text-slate-700` → **MUST** become `text-slate-700 dark:text-white`
- `text-slate-900` → **MUST** become `text-slate-900 dark:text-white`
- **ANY text color** → **MUST** have `dark:text-white` for maximum visibility

### 3. **Buttons**
- Button text: **ALWAYS** `dark:text-white`
- Button backgrounds: `dark:bg-gray-700` or `dark:bg-gray-800`
- Button borders: `dark:border-gray-600`
- Button hover: `dark:hover:bg-gray-600`, `dark:hover:text-white`
- Button icons: `dark:text-white`
- Disabled buttons: `dark:disabled:bg-gray-600`, `dark:disabled:text-gray-400`

### 4. **Input Fields & Textareas**
- Background: **MUST** have `dark:bg-gray-800` or `dark:bg-gray-700`
- Text: **MUST** have `dark:text-white`
- Border: **MUST** have `dark:border-gray-600`
- Placeholder: **MUST** have `dark:placeholder:text-gray-500`
- Focus: `dark:focus:border-sky-500/60` or `dark:focus:bg-sky-900/20`

### 5. **Labels**
- **ALL labels** → **MUST** have `dark:text-white`

### 6. **Tables**
- Header background: `dark:bg-gray-700`
- Header text: `dark:text-white`
- Row background: `dark:bg-gray-800`
- Row hover: `dark:hover:bg-gray-700`
- Cell text: `dark:text-white`
- Borders: `dark:border-gray-700`

### 7. **Code/Pre Blocks**
- Background: `dark:bg-gray-800` or `dark:bg-gray-700`
- Text: **MUST** `dark:text-white`

### 8. **Borders**
- `border-gray-200` → `border-gray-200 dark:border-gray-700`
- `border-gray-300` → `border-gray-300 dark:border-gray-600`
- `border-gray-100` → `border-gray-100 dark:border-gray-700`

### 9. **Icons**
- Primary icons: `dark:text-white`
- Secondary icons: `dark:text-gray-400`

### 10. **Badges & Status Indicators**
- Background: `dark:bg-{color}-900/70` (70% opacity minimum)
- Text: `dark:text-{color}-400`

### 11. **Dropdowns & Menus**
- Background: `dark:bg-gray-800`
- Text: `dark:text-white`
- Hover: `dark:hover:bg-gray-700`
- Borders: `dark:border-gray-700`

### 12. **Section Headers/Panels**
- Background: `dark:bg-gray-700`
- Text: `dark:text-white`
- Borders: `dark:border-gray-600`

### 13. **Placeholders**
- **ALL placeholders** → `dark:placeholder:text-gray-500`

### 14. **Extension Mode Wrapper**
- `bg-white` → `bg-white dark:bg-gray-900`

## Application Strategy:
1. Find ALL instances of `bg-white`, `bg-gray-50`, `bg-gray-100` without `dark:` prefix
2. Find ALL instances of `text-gray-*` without `dark:` prefix
3. Find ALL instances of `border-gray-*` without `dark:` prefix
4. Find ALL buttons, inputs, labels, code blocks
5. Apply rules systematically to EACH element

## Checklist per Page:
- [ ] All `bg-white` → `dark:bg-gray-800`
- [ ] All `bg-gray-50` → `dark:bg-gray-700`
- [ ] All `text-gray-*` → `dark:text-white`
- [ ] All buttons have `dark:text-white` and `dark:bg-gray-700`
- [ ] All inputs/textareas have `dark:bg-gray-800`, `dark:text-white`, `dark:border-gray-600`
- [ ] All labels have `dark:text-white`
- [ ] All borders have `dark:border-gray-700` or `dark:border-gray-600`
- [ ] All icons have `dark:text-white` or `dark:text-gray-400`
- [ ] All code/pre blocks have `dark:bg-gray-800` and `dark:text-white`
- [ ] Extension mode wrapper has `dark:bg-gray-900`

