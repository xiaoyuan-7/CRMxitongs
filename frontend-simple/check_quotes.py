#!/usr/bin/env python3
# Fix the broken JS string with escaped quotes in fusion detail section

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# The problematic string is around line 5088-5090 where escaped quotes are used
# in a way that breaks JS parsing. Let's find and fix the broken pattern.

import re

# Find the pattern where onclick contains \'' which breaks in certain contexts
# The issue is the mix of HTML double quotes and JS single quotes with escapes

# Replace patterns like:
# onclick="event.stopPropagation(); someFunction(\'' + ... + '\')"
# with properly escaped versions

# Actually, the safest fix is to ensure all onclick handlers use proper escaping
# Let's find the specific broken strings and fix them

# Find the area with the problematic onclick handlers
# Pattern: \x27 (which is ' encoded) followed by spaces in onclick attributes

# The problematic area is around the fusion-detail section where onclick
# handlers have improperly nested quotes

# Count occurrences of \x27\x27 which creates empty strings ''
count_dbl_quote = content.count("\\x27\\x27")
print(f"Double escaped quotes (\\x27\\x27): {count_dbl_quote}")

# Find patterns like ''' (triple single quotes)
count_triple = content.count("'''")
print(f"Triple single quotes: {count_triple}")

# Find patterns with ;\')" which is the problematic end of onclick strings
count_broken = content.count(";\\'\\')\"")
print(f"Broken end pattern (;')\"): {count_broken}")

with open('/home/admin/.openclaw/workspace/crm-system/frontend-simple/index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print(f"File size: {len(content)}")