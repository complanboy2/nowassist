# Documentation

This folder contains all project documentation files. These files are **not included** in the build/dist output and are for development/reference only.

## Working with Documentation

- ✅ **All new documentation should be created in this folder**
- ✅ **All documentation edits should be made in files in this folder**
- ✅ **Files in this folder are automatically excluded from production builds**

## Documentation Files

- `QA_CHECKLIST.md` - Complete QA testing checklist
- `QA_SUMMARY.md` - Production readiness assessment
- `CRITICAL_FIXES_PLAN.md` - Critical fixes implementation plan
- `UI_UNIFICATION_PLAN.md` - UI unification and standardization plan
- `VERIFICATION_REPORT.md` - Cleanup verification report
- And more...

## Note

The `docs/` folder is excluded from Vite builds by default since:
1. Only files specified in `vite.config.js` rollupOptions.input are included
2. Markdown files are not part of the build process
3. Documentation is for development/reference only

