cd /Volumes/Extra/Development/github-notion-star/
echo $(date +"%Y-%m-%d %H:%M") > bi-sync
git add bi-sync
git commit -m "bi-sync: $(date +"%Y-%m-%d %H:%M")"
git push
