#!/bin/sh

SOURCE="spiderlexdb.tgz"

cd /tmp

if [ -e $SOURCE ]
then
    rm -f $SOURCE
fi

wget -q http://lexsys.atilf.fr/export/$SOURCE
cd /usr/local/rl
tar zxf /tmp/$SOURCE
