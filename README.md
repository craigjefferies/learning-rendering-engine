# Learning Games Render Engine

An interactive educational content renderer supporting multiple game types and assessment standards.

## Features

- 🎮 **8 Game Types**: MCQ, Ordering, Pair Match, Fill-in-the-Blanks, and multi-question Sets
- 📊 **OMI Tracking**: Observable Micro-Indicators for granular assessment tracking
- 🎯 **Assessment Standards**: Organized by NCEA standards (AS92006, etc.)
- 🎨 **Modern UI**: Built with React 19, TypeScript, and TailwindCSS
- ⚡ **Fast**: Powered by Vite for instant HMR

## Project Structure

```
public/specs/
  ├── examples/           # Sample games (mixed topics)
  │   ├── mcq-ohmslaw.json
  │   ├── ordering-spectrum.json
  │   └── pairmatch-terms.json
  │
  └── AS92006/           # AS92006: User Interfaces & Usability
      ├── mcq-set.json
      ├── ordering-set.json
      ├── pairmatch-set.json
      └── activity-set.json
```

## Game Types

1. **Single Games**:
   - `mcq` - Multiple choice questions
   - `ordering` - Drag-and-drop ordering tasks
   - `pair-match` - Match items between two columns
   - `fill-in-the-blanks` - Drag words into sentence blanks

2. **Multi-Question Sets**:
   - `mcq-set` - Collection of MCQ questions
   - `ordering-set` - Collection of ordering tasks
   - `pair-match-set` - Collection of matching tasks
   - `activity-set` - Mixed game types in one assessment

## OMI (Observable Micro-Indicators)

Each question can map to specific OMIs for granular progress tracking:

- **interface_purpose** - Understanding interface goals
- **identify_usability_principles** - Recognizing usability heuristics
- **explain_usability_principles** - Explaining usability concepts
- **evaluate_interface_design** - Assessing interface quality

Progress persists in localStorage with 4 mastery levels:
- ○ Not Yet
- ◔ Emerging
- ◑ Proficient  
- ● Mastered

## LLM Content Generation

Specs are organized by assessment standard for easy LLM generation:

1. Create a folder: `public/specs/AS[number]/`
2. Generate game JSON files following the schema
3. Individual sets (mcq-set, ordering-set) contain practice questions
4. Activity-set mixes question types for assessment
5. Questions can appear in multiple files (practice + assessment)

## Development

```bash
npm install
npm run dev
```

## Tech Stack

- React 19.1.1 + TypeScript
- Vite 7.1.9
- Zustand 5.0.8 (state management)
- Zod 4.1.11 (schema validation)
- TailwindCSS 3.4.14

---

# Original Vite Template Info

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
