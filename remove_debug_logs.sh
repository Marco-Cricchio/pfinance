#!/bin/bash

# Script to remove debug logging statements from TypeScript/JavaScript files
# Preserves console.error and console.warn statements

echo "🧹 Removing debug logging statements..."

# Find all TypeScript and JavaScript files in src/
find src/ \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) -type f -print0 | while IFS= read -r -d '' file; do
  echo "Processing: $file"
  
  # Create temporary file for processing
  temp_file=$(mktemp)
  
  # Remove lines that contain console.log, console.info, or console.debug
  # But preserve console.error and console.warn
  # Use sed to remove entire lines containing these patterns
  sed -E '/^[[:space:]]*console\.(log|info|debug)[[:space:]]*\(/d' "$file" > "$temp_file"
  
  # Check if file was modified
  if ! cmp -s "$file" "$temp_file"; then
    echo "  ✅ Modified: $file"
    mv "$temp_file" "$file"
  else
    echo "  ➖ No changes: $file"
    rm "$temp_file"
  fi
done

echo ""
echo "📊 Final audit:"
echo "Remaining console statements:"
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | wc -l

echo "Remaining debug statements (should be 0):"
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -E "(console\.log|console\.info|console\.debug)" | wc -l

echo "Remaining error/warn statements:"
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" | grep -E "(console\.error|console\.warn)" | wc -l

echo "🎉 Debug logging cleanup complete!"