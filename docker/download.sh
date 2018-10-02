#!/bin/sh

SOURCE="spiderlexdb.tgz"

cd /tmp

if [ -e $SOURCE ]
then
    rm -f $SOURCE
fi

echo "downlading spiderlex.tgz"
wget -q http://lexsys.atilf.fr/export/$SOURCE
cd /usr/local/rl
echo "unpacking files..."
tar zxf /tmp/$SOURCE
