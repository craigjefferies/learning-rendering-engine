# Game Spec Organization Guide

## Folder Structure

```
public/specs/
  ├── examples/              # Demo games (mixed topics, for testing)
  │   ├── mcq-ohmslaw.json
  │   ├── ordering-spectrum.json
  │   └── pairmatch-terms.json
  │
  └── AS92006/              # AS92006: User Interfaces & Usability
      ├── mcq-set.json      # Multiple choice practice questions
      ├── ordering-set.json # Ordering/sequencing practice
      ├── pairmatch-set.json # Matching exercise practice
      └── activity-set.json # Mixed assessment (samples from above)
```

## Assessment Standard Organization

Each assessment standard gets its own folder:
- `AS92006/` - User Interfaces & Usability (NCEA Level 2)
- `AS91893/` - Computer Science concepts (example for future)
- etc.

## File Types Per Assessment

### Individual Game Sets (Practice)
These contain focused practice on one game type:

1. **mcq-set.json** - Multiple choice questions
   - 3-5 questions per set
   - Each question has `omiMapping` to specific skills
   - Good for drilling knowledge recall

2. **ordering-set.json** - Sequencing tasks
   - 2-3 ordering tasks
   - Good for workflow/process understanding
   - Can shuffle items for variety

3. **pairmatch-set.json** - Matching exercises
   - 2-3 matching tasks
   - Pairs concepts with definitions
   - Can include distractors

### Mixed Activity Set (Assessment)

**activity-set.json** - Comprehensive assessment
- Combines all game types
- Selects representative questions from practice sets
- Questions may be duplicated from individual sets (this is intentional!)
- Provides varied assessment experience

## Content Duplication Strategy

**Question reuse is acceptable and expected:**

- ✅ Same question can appear in `mcq-set.json` AND `activity-set.json`
- ✅ Individual sets = focused practice
- ✅ Activity set = comprehensive assessment
- ✅ This mirrors real education: practice, then assess

**Why this works:**
1. Each file is self-contained (no complex loading)
2. Easy for LLMs to generate
3. Simple JSON structure
4. No runtime dependencies between files

## OMI Mapping

Each question should map to 1-3 OMIs:

```json
{
  "id": "unique-question-id",
  "type": "mcq",
  "title": "Understanding Interface Purpose",
  "omiMapping": ["interface_purpose"]
}
```

The set's metadata should list ALL OMIs covered:

```json
{
  "metadata": {
    "omis": [
      "interface_purpose",
      "identify_usability_principles",
      "explain_usability_principles"
    ]
  }
}
```

## LLM Generation Workflow

When generating content via LLM:

1. **Create assessment folder**: `public/specs/AS[number]/`

2. **Generate practice sets** (one file per game type):
   - `mcq-set.json` - 3-5 MCQ questions
   - `ordering-set.json` - 2-3 sequencing tasks
   - `pairmatch-set.json` - 2-3 matching exercises

3. **Generate activity set**:
   - `activity-set.json` - Mix of 6-8 activities
   - Can duplicate questions from practice sets
   - Vary the game types for engagement

4. **Update App.tsx** with new assessment:
   ```typescript
   {
     id: 'as[number]',
     label: 'AS[number]: [Title]',
     specs: [
       { label: 'MCQ Set: [Topic]', path: '/specs/AS[number]/mcq-set.json' },
       { label: 'Pair Match Set: [Topic]', path: '/specs/AS[number]/pairmatch-set.json' },
       { label: 'Ordering Set: [Topic]', path: '/specs/AS[number]/ordering-set.json' },
       { label: 'Activity Set: Mixed Assessment', path: '/specs/AS[number]/activity-set.json' },
     ],
   }
   ```

## Example: AS92006 Structure

**mcq-set.json** contains:
- Question about interface purpose
- Question about internal consistency  
- Question about accessibility

**activity-set.json** contains:
- MCQ about interface purpose (duplicated from mcq-set)
- Pair match about heuristics (different from pairmatch-set)
- Ordering task about workflow (duplicated from ordering-set)
- Fill-in-the-blanks about principles (unique)
- Another pair match
- Another ordering task

This gives students:
- Focused practice via individual sets
- Comprehensive mixed assessment via activity-set
- Variety in question presentation

## Benefits of This Structure

1. **Simple for LLMs**: Just generate standalone JSON files
2. **Self-contained**: Each file has all needed data
3. **Flexible**: Mix and match questions as needed
4. **Pedagogically sound**: Practice then assess pattern
5. **No runtime complexity**: No loading dependencies
6. **Easy to version control**: Each assessment is a folder

## Quick Reference

| File | Game Types | Purpose | Question Count |
|------|------------|---------|----------------|
| `mcq-set.json` | MCQ only | Practice | 3-5 |
| `ordering-set.json` | Ordering only | Practice | 2-3 |
| `pairmatch-set.json` | Pair Match only | Practice | 2-3 |
| `activity-set.json` | Mixed | Assessment | 6-8 |
