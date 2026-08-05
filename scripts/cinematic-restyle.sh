#!/bin/bash
# Cinematic restyle — replace flat dark card colors with glass/translucent utilities
cd /home/team/shared/site
FILES=$(find src -name "*.tsx" -not -path "*/node_modules/*")

for f in $FILES; do
  sed -i \
    -e 's/bg-\[#111111\] hover:bg-\[#141414\]/glass hover:bg-white\/[0.07]/g' \
    -e 's/bg-\[#111111\]/glass/g' \
    -e 's/hover:bg-\[#141414\]/hover:bg-white\/[0.07]/g' \
    -e 's/bg-\[#141414\]/bg-white\/[0.05]/g' \
    -e 's/bg-\[#1a1a1a\] hover:bg-\[#1e1e1e\]/bg-white\/[0.04] hover:bg-white\/[0.07]/g' \
    -e 's/hover:bg-\[#1e1e1e\]/hover:bg-white\/[0.07]/g' \
    -e 's/hover:bg-\[#1a1a1a\]/hover:bg-white\/[0.06]/g' \
    -e 's/bg-\[#1a1a1a\]/bg-white\/[0.04]/g' \
    -e 's/border-\[#1a1a1a\]/border-white\/[0.06]/g' \
    -e 's/hover:bg-\[#0d0d0d\]/hover:bg-white\/[0.03]/g' \
    -e 's/bg-\[#151515\]/bg-white\/[0.03]/g' \
    -e 's/bg-\[#080808\]/bg-[#08080a]/g' \
    -e 's/border-white\/\[0\.04\]/border-white\/[0.06]/g' \
    "$f"
done

echo "Done. Remaining counts:"
echo "bg-[#111111]: $(grep -rl 'bg-\[#111111\]' src --include='*.tsx' | wc -l)"
echo "bg-[#1a1a1a]: $(grep -rl 'bg-\[#1a1a1a\]' src --include='*.tsx' | wc -l)"
echo "hover:bg-[#141414]: $(grep -rl 'hover:bg-\[#141414\]' src --include='*.tsx' | wc -l)"
