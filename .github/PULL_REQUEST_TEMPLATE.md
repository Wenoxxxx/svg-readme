## What was done
<!-- Short summary, 1-3 sentences -->

## Linked Issue
<!-- e.g., Fixes #123 -->
- leave if none

## Changes
<!-- Bullet list of the actual changes -->
- 
- 
- 

## Testing Instructions
<!-- DEFAULT Local hosting test -->
1. cd app && npm install (restores missing @phosphor-icons/react)
2. npm run dev → frontend on 5173 (no backend step, no MongoDB needed)
3. Draw → Save (Ctrl+S) → confirm .svg-readme.json downloads → clear/new → Open file → canvas restores identical
4. Drag-drop .json onto canvas → replaces doc; drag-drop .svg → appends layers
5. npx tsc --noEmit clean; npx vitest run --pool=threads 47 files / 457 pass; npm run build green

## Type of Change
- [ ] feat
- [ ] fix
- [ ] refactor
- [ ] docs
- [ ] chore
- [ ] test
- [ ] style
- [ ] perf

## Checklist
- [ ] Code follows project style guidelines
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes introduced
