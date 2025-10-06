# AS92006: User Interfaces & Usability

This folder contains the assessment specification and game sets for AS92006.

## File Structure

### Assessment Metadata
- **`assessment.json`** - Central metadata file containing:
  - Assessment standard information (ID, title, credits, level)
  - Learning outcomes (Achieved, Merit, Excellence)
  - OMI (Observable Measurable Indicator) list
  - Game set registry with paths and descriptions
  - Assessment metadata (version, author, estimated duration)

### Game Sets
Each game set is a separate JSON file containing questions/activities:

1. **`mcq-set.json`** - Multiple Choice Questions
   - Interface Concepts
   - Questions about interface purposes and usability principles

2. **`pairmatch-set.json`** - Pair Matching
   - Usability Principles
   - Match heuristics to their descriptions

3. **`ordering-set.json`** - Ordering/Sequencing
   - User Workflows
   - Arrange steps in correct order for common workflows

4. **`fillblanks-set.json`** - Fill in the Blanks
   - Usability Heuristics
   - Complete sentences about usability concepts

5. **`classification-set.json`** - Classification/Categorization
   - Usability Principles Classification
   - Drag UI examples into appropriate categories

6. **`activity-set.json`** - Mixed Activities
   - Usability Fundamentals
   - Collection of various activity types for Achieved level

## Game Set Structure

Each game set file follows this simplified structure:

```json
{
  "id": "unique-game-set-id",
  "type": "game-type",
  "title": "Game Set Title",
  "description": "Brief description of the game set",
  "questions": [...] // or "activities" or "sentences" depending on type
}
```

**Note:** Assessment-level metadata (subject, difficulty, OMIs, standard) has been moved to `assessment.json` to avoid duplication.

## Loading Process

The application loads assessments in this order:

1. Load `assessment.json` to get assessment metadata
2. Read `gameSets` array to get list of game files
3. Load each game set JSON file dynamically
4. Render games based on their type

## OMI Mapping

Each question/activity maps to one or more OMIs defined in `assessment.json`:

- `interface_purpose` - Identify and describe interface purposes
- `identify_usability_principles` - Identify usability heuristics
- `explain_usability_principles` - Explain how principles improve UX
- `evaluate_interface_design` - Evaluate designs against criteria
- `apply_design_principles` - Apply principles to create interfaces

## Adding New Game Sets

1. Create a new JSON file in this folder
2. Add entry to `gameSets` array in `assessment.json`
3. Follow the game type schema (mcq-set, pair-match-set, etc.)
4. Map questions to appropriate OMIs using `omiMapping` field
