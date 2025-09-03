@echo off
echo NPM PUBLISH
echo Before continuing, ensure that:
echo - you are logged in (npm whoami)
echo - you have successfully rebuilt all the libraries (npm run...)
pause

cd .\dist\myrmidon\cadmus-cod-location
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-mat-physical-grid
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-mat-physical-size
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-mat-physical-state
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-asserted-chronotope
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-asserted-ids
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-assertion
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-chronotope
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-citation
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-dbpedia-lookup
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-decorated-counts
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-decorated-ids
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-doc-references
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-external-ids
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-geonames-lookup
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-historical-date
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-lookup
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-mufi-lookup
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-proper-name
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-viaf-lookup
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-whg-lookup
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-refs-zotero-lookup
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-text-block-view
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-text-ed
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-text-ed-md
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-text-ed-txt
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-ui-custom-action-bar
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-ui-flag-set
call npm publish --access=public
cd ..\..\..
pause

cd .\dist\myrmidon\cadmus-ui-note-set
call npm publish --access=public
cd ..\..\..
pause

echo ALL DONE
