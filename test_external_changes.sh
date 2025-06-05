#!/bin/bash

# Test script for external file changes detection
# This will modify files outside the app to test if the watcher works

echo "🧪 Testing external file change detection..."

# Test 1: Modify existing test file
echo "📝 Test 1: Modifying existing test file..."
echo "Modified at $(date)" >> test_external_changes.txt
echo "✅ Modified test_external_changes.txt"

sleep 2

# Test 2: Create a new file
echo "📝 Test 2: Creating new file..."
echo "New file created at $(date)" > external_test_new.txt
echo "✅ Created external_test_new.txt"

sleep 2

# Test 3: Delete a file (if it exists)
echo "📝 Test 3: Deleting file..."
if [ -f "external_test_new.txt" ]; then
    rm external_test_new.txt
    echo "✅ Deleted external_test_new.txt"
else
    echo "⚠️ No file to delete"
fi

sleep 2

# Test 4: Rename/move a file
echo "📝 Test 4: Renaming file..."
echo "File for rename test created at $(date)" > rename_test.txt
sleep 1
mv rename_test.txt renamed_file.txt
echo "✅ Renamed rename_test.txt to renamed_file.txt"

echo "🎉 External file change tests completed!"
echo "📊 Check the app's file explorer to see if changes are detected automatically." 