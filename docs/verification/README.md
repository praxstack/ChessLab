# Verification records

Each folder here records how a feature of an earlier build was checked: the receipts, manifests, decision logs and browser check output.

On 8 October 2026 the screenshots and screen recordings were removed from these folders (695 PNG images and 17 WebM videos, about 260 MB). They showed the earlier art copied from Chess.com, which the original-asset change (`openspec/changes/original-asset-pack/`, OA-007) takes out of the tree. The text records stay. Links in the folder READMEs and the hashes in each `manifest.json` still name the removed files, so they describe what was checked at the time, not files you can open here. The files remain in git history before the commit that removed them.

`python3 design/check.py` fails if images or videos are added here again.
