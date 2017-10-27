#!/bin/sh
rm -rf dist
tsc
cp -a templates dist/
cp package.json dist/
cp README.md dist/
cp LICENSE dist/
cp CHANGELOG.md dist/
