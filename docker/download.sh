#!/bin/sh

names=( "lnfr.picklez" "lnen.picklez" "completedb_fr.sqlite" "completedb_en.sqlite" )

cd /tmp

for name in "${names[@]}"
do
    rm -f $name
    wget -q http://lexsys.atilf.fr/export/$name
done

cd /usr/local/rl

for name in "${names[@]}"
do
    mv -f /tmp/$name .
done
