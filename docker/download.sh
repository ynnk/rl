#!/bin/sh

SOURCE="spiderlex.tgz"
PARSER=/usr/local/rl/parser
TARGET=/usr/local/rl

cd /tmp

if [ -e $SOURCE ]
then
    rm -f $SOURCE
fi

echo "downlading spiderlex.tgz"
wget -q http://lexsys.atilf.fr/export/$SOURCE

echo "unpacking files..."
tar zxf $SOURCE

echo "converting graphs"
python3 $PARSER/parse.py lnfr ./ls-fr-spiderlex/ --complete $TARGET/completedb_fr.sqlite -s igraph -o $TARGET/lnfr.picklez
python3 $PARSER/parse.py lnen ./ls-en-spiderlex/ --complete $TARGET/completedb_en.sqlite -s igraph -o $TARGET/lnen.picklez

echo "removing temp"
rm -rf ./ls-fr-spiderlex ./ls-en-spiderlex $SOURCE

echo "done"
