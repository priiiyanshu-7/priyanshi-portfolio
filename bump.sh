#!/bin/sh
# Bumps the cache-busting version on styles.css and script.js links in index.html.
v=$(date +%Y%m%d%H%M)
sed -i '' -E "s/(styles\.css\?v=)[0-9a-z]+/\1$v/; s/(script\.js\?v=)[0-9a-z]+/\1$v/" index.html
echo "assets versioned $v"
