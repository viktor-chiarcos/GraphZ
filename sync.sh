#!/usr/bin/bash

echo "Sync läuft. Bei Konflikten bitte Control + C oder Control + D drücken und beheben sie es mit der Bash"
echo "Status:"
echo
FILE=`echo "*"`
git add $FILE
git commit -a -m "Update GraphZ from " $USER " with sync.sh"
git pull
git push
