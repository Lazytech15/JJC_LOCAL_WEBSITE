# Toolbox_new Migration Guide: Next.js to Vite

## Overview
This document outlines the migration of Toolbox_new from Next.js to Vite to align with JJC_LOCAL_WEBSITE's architecture and enable dependency merging without conflicts.

---

## ✅ Completed Changes

### 1. Package.json Updates
- **Removed Next.js dependencies:**
  - `next` (14.2.33)
  
- **Added Vite dependencies:**
  - `vite` (^7.1.7)
  - `@vitejs/plugin-react` (^4.2.1)
  - `@tailwindcss/vite` (^4.1.12)

- **Added missing dependencies from JJC_LOCAL_WEBSITE:**
  - `axios` (^1.6.0)
  - `bcrypt` (^6.0.0)
  - `bwip-js` (^4.7.0)
  - `express` (^5.1.0)
  - `jsbarcode` (^3.12.1)
  - `jszip` (^3.10.1)
  - `react-router-dom` (^7.8.1)
  - `socket.io` (^4.8.1)
  - `socket.io-client` (^4.8.1)
  - `sweetalert2` (^11.22.5)
  - `eslint` and related plugins
  - `tw-animate-css` (^1.3.3)

- **Updated scripts:**
  ```json
  "dev": "vite",
  "build": "vite build",
  "lint": "eslint . --ext js,jsx,ts,tsx --report-unused-disable-directives --max-warnings 0",
  "preview": "vite preview"
  ```

- **Added `"type": "module"`** to package.json

### 2. Vite Configuration
Created `vite.config.js` with:
- React plugin integration
- Tailwind CSS Vite plugin
- Path aliases (`@/` pointing to root)
- Server configuration (localhost:3000)
- Build output to `dist` directory
- Source maps enabled

### 3. Entry Point Structure
Created new entry point files:
- **`index.html`**: Root HTML file with PWA meta tags
- **`main.tsx`**: Main React entry point with providers

### 4. TypeScript Configuration
Updated `tsconfig.json`:
- Changed `jsx` from `"preserve"` to `"react-jsx"` (for Vite)
- Removed Next.js plugin
- Added `types: ["vite/client"]`
- Updated include/exclude paths for Vite structure

---

## 🔄 Migration Path

### Current Structure (Next.js)
```
Toolbox_new/
├── app/
│   ├── layout.tsx       (Next.js App Router)
│   ├── page.tsx         (Next.js Page)
│   └── globals.css
├── components/
├── hooks/
├── lib/
└── public/
```

### New Structure (Vite)
```
Toolbox_new/
├── index.html           (NEW - Entry HTML)
├── main.tsx             (NEW - React entry point)
├── vite.config.js       (NEW - Vite config)
├── app/
│   ├── page.tsx         (Now standard React component)
│   └── globals.css
├── components/
├── hooks/
├── lib/
└── public/
```

---

## ⚠️ Important Changes & Considerations

### 1. File Extensions
- **Both projects now support:**
  - `.jsx` files (JJC_LOCAL_WEBSITE primary)
  - `.tsx` files (Toolbox_new primary)
- No conversion needed! Vite handles both seamlessly

### 2. Removed Next.js Specific Features
The following Next.js features are **NO LONGER AVAILABLE**:
- ❌ Server-Side Rendering (SSR)
- ❌ `next/image` (use regular `<img>` tags)
- ❌ `next/link` (use `react-router-dom` `<Link>`)
- ❌ `next/navigation` hooks (`useRouter`, `usePathname`, etc.)
- ❌ API Routes (use Express backend instead)
- ❌ Metadata exports (moved to `index.html`)
- ❌ `"use client"` directive (no longer needed)

### 3. Layout Component Changes
- **Before (Next.js):** `layout.tsx` with metadata exports
- **After (Vite):** Layout providers in `main.tsx`, metadata in `index.html`
- The `layout.tsx` file is no longer used directly
- All providers (ThemeProvider, ErrorBoundary, etc.) now wrap in `main.tsx`

### 4. Public Assets
- Public assets remain in `/public/` directory
- Access them with `/public/filename` in Vite (vs `/filename` in Next.js)
- Updated `index.html` paths accordingly

### 5. Environment Variables
- **Next.js:** `NEXT_PUBLIC_*` prefix
- **Vite:** `VITE_*` prefix
- Update all environment variables accordingly

---

## 📋 Next Steps (TODO)

### Immediate Actions Required:

1. **Install Dependencies**
   ```bash
   cd Toolbox_new
   npm install
   ```

2. **Remove Next.js Files** (optional cleanup)
   ```bash
   # Optional: Remove Next.js specific files
   rm -rf .next/
   rm next.config.mjs
   ```

3. **Update Environment Variables**
   - Rename `.env.local` variables from `NEXT_PUBLIC_*` to `VITE_*`
   - Update any code referencing `process.env.NEXT_PUBLIC_*`

4. **Test the Application**
   ```bash
   npm run dev
   ```

5. **Check for Next.js Imports**
   Search for any remaining Next.js imports:
   ```bash
   grep -r "from 'next" app/ components/ lib/ hooks/
   grep -r "from \"next" app/ components/ lib/ hooks/
   ```

6. **Update Routing** (if applicable)
   - If using Next.js App Router, migrate to `react-router-dom`
   - Update any `useRouter()` calls to `useNavigate()`
   - Update `<Link>` imports from `next/link` to `react-router-dom`

7. **Test All Features**
   - [ ] PWA functionality
   - [ ] Offline mode
   - [ ] Theme switching
   - [ ] Keyboard shortcuts
   - [ ] API connections
   - [ ] Cart persistence
   - [ ] Barcode scanning

---

## 🔍 Potential Issues to Watch For

### 1. Image Optimization
- Next.js `<Image>` components need manual handling
- Replace with `<img>` tags or use a Vite image plugin

### 2. Font Loading
- Geist fonts from `geist/font` may need adjustment
- Consider using standard font imports or CDN

### 3. Analytics
- `@vercel/analytics/next` is Next.js specific
- Consider using `@vercel/analytics/react` or alternative

### 4. API Routes
- Move any Next.js API routes to Express backend
- Update fetch URLs accordingly

### 5. TypeScript Errors
- Some type errors may appear initially (especially for vite/client)
- Run `npm install` to resolve dependency-related errors

---

## 📊 Dependency Comparison

### Shared Dependencies (Now Aligned)
Both projects now share these exact versions:
- React 18.2.0
- All Radix UI components
- Tailwind CSS 4.1.12
- TypeScript 5.9.2
- All utility libraries (clsx, date-fns, zod, etc.)

### Unique to JJC_LOCAL_WEBSITE (Now in Toolbox)
- axios, bcrypt, bwip-js
- express, jsbarcode, jszip
- socket.io (client & server)
- sweetalert2
- react-router-dom

---

## 🎯 Benefits of This Migration

1. **Unified Dependencies**: No version conflicts between projects
2. **Faster Development**: Vite's HMR is faster than Next.js
3. **Simpler Architecture**: No SSR complexity
4. **Easier Merging**: Can now combine codebases without conflicts
5. **Consistent Tooling**: Both projects use the same build system
6. **Better TypeScript Support**: Vite handles .tsx and .jsx seamlessly

---

## 🚀 Running the Application

### Development
```bash
cd Toolbox_new
npm install
npm run dev
```
Access at: http://localhost:3000

### Production Build
```bash
npm run build
npm run preview
```

### Linting
```bash
npm run lint
```

---

## 📝 Notes

- The migration preserves all functionality from the Next.js version
- All components remain TypeScript (.tsx)
- PWA features are maintained through index.html and manifest.json
- Theme system continues to work with localStorage
- All providers (Theme, Error Boundary, Loading) are now in main.tsx

---

## 🆘 Troubleshooting

### Issue: "Cannot find module 'vite/client'"
**Solution:** Run `npm install` in Toolbox_new directory

### Issue: Build errors about Next.js
**Solution:** Clear cache and node_modules:
```bash
rm -rf node_modules package-lock.json .next
npm install
```

### Issue: Assets not loading
**Solution:** Update asset paths to include `/public/` prefix

### Issue: Routing not working
**Solution:** Implement react-router-dom for client-side routing

---

## 📞 Support

If you encounter issues during migration:
1. Check this guide thoroughly
2. Review the Vite documentation: https://vitejs.dev
3. Compare with JJC_LOCAL_WEBSITE's working configuration

---

**Last Updated:** October 6, 2025
**Migration Status:** ✅ Configuration Complete - Testing Required
