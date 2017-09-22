#!/bin/sh
tsc
cp -a templates dist/
cp package.json dist/
cp README.md dist/
cp CHANGELOG.md dist/