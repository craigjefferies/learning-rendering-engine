# Assessment Folder Organization

## Overview
The AS92006 folder has been reorganized to separate assessment metadata from individual game sets, making the structure more maintainable and scalable.

## New Structure

```
public/specs/AS92006/
├── assessment.json          # Central assessment metadata
├── README.md               # Documentation for this assessment
├── mcq-set.json           # Multiple Choice Questions game set
├── pairmatch-set.json     # Pair Matching game set
├── ordering-set.json      # Ordering/Sequencing game set
├── fillblanks-set.json    # Fill in the Blanks game set
├── classification-set.json # Classification game set
└── activity-set.json      # Mixed activities game set
```

## Key Files

### assessment.json (New!)
**Central metadata file** containing:
- Assessment standard info (AS92006, NCEA Level 2, 4 credits)
- Title and description
- Learning outcomes (Achieved/Merit/Excellence)
- OMI (Observable Measurable Indicator) definitions
- **Game sets registry** - Lists all game files with paths and descriptions
- Metadata (version, author, estimated duration)

### Game Set Files (Simplified)
Each game set file now contains **only**:
- Game-specific ID and type
- Title and description
- Questions/activities/sentences

**Removed** from game files (now in assessment.json):
- ❌ Assessment standard reference
- ❌ Subject information
- ❌ Global difficulty levels
- ❌ OMI lists (individual questions still have omiMapping)

## Benefits

1. **Single Source of Truth**: Assessment metadata lives in one place
2. **No Duplication**: Standard, subject, and OMI info defined once
3. **Easier Updates**: Change assessment info in one file
4. **Clear Separation**: Metadata vs. content clearly separated
5. **Scalable**: Easy to add new game sets by updating assessment.json
6. **Better Organization**: Folder structure is self-documenting

## Loading Flow

```
App.tsx loads assessment
        ↓
Fetches /specs/AS92006/assessment.json
        ↓
Reads gameSets array
        ↓
Dynamically loads each game set JSON
        ↓
Renders games in random order
```

## Migration Summary

✅ Created `assessment.json` with all metadata
✅ Updated all 6 game set files to remove redundant metadata
✅ Modified App.tsx to load assessment metadata first
✅ Updated header to display assessment info from metadata
✅ Created README.md documentation in AS92006 folder
✅ All game sets simplified and focused on content only

## Example: Adding a New Assessment

1. Create folder: `public/specs/AS91906/`
2. Create `assessment.json` with metadata and gameSets list
3. Create individual game set JSON files
4. Add to assessments array in App.tsx
5. Done! The system will auto-load everything
