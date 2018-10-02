#!/bin/sh

names=( "lnfr.picklez" "lnen.picklez" "completedb_fr.sqlite" "completedb_en.sqlite" )

cd /tmp

for name in "${names[@]}"
do
    if [ -e $name ]
    then
        rm -f $name
    fi
done

wget -q http://lexsys.atilf.fr/export/spiderlexdb.tgz
tar zxf spiderlexdb.tgz

cd /usr/local/rl

for name in "${names[@]}"
do
    mv -f /tmp/$name .
done
