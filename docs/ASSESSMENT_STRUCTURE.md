# Assessment Structure Organization

## Overview

The AS92006 folder has been reorganized to separate assessment metadata from individual game sets, providing a cleaner and more maintainable structure.

## New Structure

```
public/specs/AS92006/
├── assessment.json          # ⭐ NEW: Central assessment metadata
├── README.md               # ⭐ NEW: Documentation
├── mcq-set.json            # ✨ Simplified
├── pairmatch-set.json      # ✨ Simplified
├── ordering-set.json       # ✨ Simplified
├── fillblanks-set.json     # ✨ Simplified
├── classification-set.json # ✨ Simplified
└── activity-set.json       # ✨ Simplified
```

## Key Changes

### 1. Central Assessment Metadata (`assessment.json`)

**New centralized file containing:**
- Assessment standard information (ID, title, credits, level)
- Subject and description
- Learning outcomes (Achieved, Merit, Excellence)
- Complete OMI (Observable Measurable Indicator) list
- **Game set registry** - List of all game files with metadata
- Version and authorship information

**Benefits:**
- Single source of truth for assessment-level data
- Easy to see all games at a glance
- Simpler to add/remove game sets
- Better version control

### 2. Simplified Game Set Files

**What was removed from each game set:**
```json
// ❌ REMOVED - now in assessment.json
"metadata": {
  "subject": "Digital Technologies",
  "assessmentStandard": "AS92006",
  "difficulty": 2,
  "omis": [...]
}
```

**What remains in each game set:**
```json
// ✅ KEPT - game-specific data only
{
  "id": "unique-game-id",
  "type": "game-type",
  "title": "Game Title",
  "description": "Game description",
  "questions": [...] // or activities/sentences
}
```

**Benefits:**
- No duplication of assessment metadata
- Cleaner, more focused game files
- Easier to understand and edit
- Reduced file size

### 3. Updated Application Loading

**Previous approach:**
```typescript
// Hard-coded list in App.tsx
const assessments = [
  {
    id: 'as92006',
    specs: [
      { label: 'MCQ Set', path: '/specs/AS92006/mcq-set.json' },
      { label: 'Pair Match', path: '/specs/AS92006/pairmatch-set.json' },
      // ... etc
    ]
  }
]
```

**New approach:**
```typescript
// Load from assessment.json
1. Fetch /specs/AS92006/assessment.json
2. Read gameSets array
3. Load each game dynamically from paths
4. Use metadata for display
```

**Benefits:**
- Configuration-driven instead of code-driven
- Add games without changing code
- Metadata available for UI display
- Easy to create new assessments

## File Responsibilities

### `assessment.json` - Assessment Level
- Standard identification (AS92006)
- Credits and level
- Learning outcomes
- Complete OMI definitions
- Game set registry
- Overall metadata

### Individual Game Sets - Game Level
- Unique game ID
- Game type (mcq-set, pairmatch-set, etc.)
- Game title and description
- Questions/activities/sentences
- Question-level OMI mapping

## Migration Summary

| Aspect | Before | After |
|--------|--------|-------|
| Assessment metadata | Duplicated in each game file | Centralized in assessment.json |
| Game list | Hard-coded in App.tsx | Loaded from assessment.json |
| Adding games | Edit App.tsx + create JSON | Add to assessment.json + create JSON |
| OMI definitions | Scattered | Centralized with descriptions |
| Documentation | None | README.md in folder |

## Example: assessment.json Structure

```json
{
  "id": "AS92006",
  "standard": "AS92006",
  "title": "User Interfaces & Usability",
  "gameSets": [
    {
      "id": "mcq-set",
      "title": "Interface Concepts",
      "type": "mcq-set",
      "path": "/specs/AS92006/mcq-set.json",
      "description": "Multiple choice questions..."
    }
    // ... more game sets
  ],
  "omiList": [
    {
      "id": "interface_purpose",
      "name": "Interface Purpose",
      "description": "Identify and describe the purpose of user interfaces"
    }
    // ... more OMIs
  ]
}
```

## Future Benefits

This new structure enables:

1. **Multiple Assessments** - Easy to add AS91897, AS91906, etc.
2. **Assessment Comparison** - See all assessments side-by-side
3. **Progress Tracking** - Track student progress per assessment
4. **Dynamic Loading** - Load assessments on demand
5. **Better UI** - Display assessment metadata in header/progress
6. **Reusable Games** - Share games between assessments
7. **Validation** - Validate game sets against assessment OMIs
8. **Analytics** - Aggregate data per assessment

## UI Improvements

The header now displays:
- Assessment standard (from assessment.json)
- Assessment title (from assessment.json)
- Overall progress across all game sets
- Visual timeline showing game stages
- Game titles from centralized metadata

## Next Steps

To add a new assessment (e.g., AS91897):

1. Create folder: `public/specs/AS91897/`
2. Create `assessment.json` with metadata and game set registry
3. Create individual game set JSON files
4. Add to assessments array in App.tsx (temporary, will be auto-discovered later)
5. Create README.md documenting the assessment

---

**Last Updated:** October 7, 2025  
**Version:** 1.0
