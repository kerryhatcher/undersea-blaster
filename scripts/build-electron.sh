#!/bin/bash

# Build TypeScript files
npx tsc -p tsconfig.electron.json

# Rename .js files to .cjs for CommonJS compatibility
find dist-electron -name "*.js" -type f | while read file; do
    # Get the new filename with .cjs extension
    newfile="${file%.js}.cjs"
    
    # Move the file
    mv "$file" "$newfile"
    
    # Update require statements in the file to use .cjs extension for relative imports only
    # Only update relative imports (starting with ./ or ../)
    sed -i 's/require("\(\.\.\?\/[^"]*\)")/require("\1.cjs")/g' "$newfile" 2>/dev/null || true
    # Remove duplicate .cjs extensions if any
    sed -i 's/\.cjs\.cjs/\.cjs/g' "$newfile" 2>/dev/null || true
done

echo "Electron build complete with .cjs extensions"