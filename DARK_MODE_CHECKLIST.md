# Dark Mode Implementation Checklist

Based on comprehensive fixes applied to JWT Decoder page, here's the checklist for all pages:

## Dark Mode Fixes Pattern (from JWT Decoder)

### 1. **Backgrounds**
- `bg-white` → `bg-white dark:bg-gray-800`
- `bg-gray-50` → `bg-gray-50 dark:bg-gray-700` (for headers/panels)
- `bg-gray-100` → `bg-gray-100 dark:bg-gray-800`

### 2. **Text Colors** (All should be WHITE for maximum visibility)
- `text-gray-700` → `text-gray-700 dark:text-white`
- `text-gray-600` → `text-gray-600 dark:text-white` (or `dark:text-gray-400` for less emphasis)
- `text-gray-900` → `text-gray-900 dark:text-white`
- `text-gray-800` → `text-gray-800 dark:text-white`
- `text-gray-300` → `text-gray-300 dark:text-white`
- `text-gray-200` → `text-gray-200 dark:text-white`
- `text-slate-700/900` → `text-slate-700 dark:text-white`

### 3. **Buttons**
- Button text: Always `dark:text-white`
- Button backgrounds: `dark:bg-gray-700` or `dark:bg-gray-800`
- Button borders: `dark:border-gray-600`
- Button hover: `dark:hover:bg-gray-600`, `dark:hover:text-white`
- Button icons: `dark:text-white` or `dark:text-gray-400`
- Disabled buttons: `dark:disabled:bg-gray-600`, `dark:disabled:text-gray-400`

### 4. **Input Fields & Textareas**
- Background: `dark:bg-gray-800`
- Text: `dark:text-white`
- Border: `dark:border-gray-600`
- Placeholder: `dark:placeholder:text-gray-500`
- Focus: `dark:focus:border-sky-500/60`

### 5. **Labels**
- All labels: `dark:text-white` (for maximum visibility)

### 6. **Tables**
- Header background: `dark:bg-gray-700`
- Header text: `dark:text-white`
- Row background: `dark:bg-gray-800`
- Row hover: `dark:hover:bg-gray-700`
- Cell text: `dark:text-white`
- Borders: `dark:border-gray-700`

### 7. **Code/Pre Blocks**
- Background: `dark:bg-gray-800`
- Text: `dark:text-white`
- All code text: `dark:text-white`

### 8. **Borders**
- `border-gray-200` → `border-gray-200 dark:border-gray-700`
- `border-gray-300` → `border-gray-300 dark:border-gray-600`
- `border-gray-100` → `border-gray-100 dark:border-gray-700`

### 9. **Icons**
- Primary icons: `dark:text-white`
- Secondary icons: `dark:text-gray-400`
- Chevron icons: `dark:text-gray-400`

### 10. **Badges & Status Indicators**
- Background: `dark:bg-{color}-900/70` (70% opacity for visibility)
- Text: `dark:text-{color}-400`
- Use appropriate colors for each severity level

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
- All placeholders: `dark:placeholder:text-gray-500`

### 14. **Hover States**
- Background hover: `dark:hover:bg-gray-600` or `dark:hover:bg-gray-700`
- Text hover: `dark:hover:text-white`

---

## Pages to Fix (in order):

1. ✅ **JWT Decoder** (jwt.jsx) - COMPLETED
2. 🔄 **SAML Inspector** (saml.jsx) - PARTIALLY DONE, needs completion
3. 🔄 **About** (about.jsx) - PARTIALLY DONE, needs completion
4. ⬜ **REST API Tester** (rest.jsx) - NEEDS FULL IMPLEMENTATION
5. ⬜ **JWT Encoder** (jwt-encoder.jsx) - NEEDS FULL IMPLEMENTATION
6. ⬜ **Encoder-Decoder** (encoder-decoder.jsx) - NEEDS FULL IMPLEMENTATION
7. ⬜ **HAR Analyzer** (har-analyzer.jsx) - NEEDS FULL IMPLEMENTATION
8. ⬜ **JSON Utility** (json-utility.jsx) - NEEDS FULL IMPLEMENTATION

## Analysis Order:
1. SAML Inspector - Start here (partially done)
2. About page - Then this (partially done)
3. REST API Tester
4. JWT Encoder
5. Encoder-Decoder
6. HAR Analyzer
7. JSON Utility

