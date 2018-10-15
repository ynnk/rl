
# Spiderlex
--------------------------

http://spiderlex.atilf.fr


## INSTALL:

* **developpement**: install virtualenv
    $ make venv3

### Install flask web application for python 3

> Python 2.7 is not supported

   $ make install 

-------------------------

## Build:

   $ make build 

--------------------------

## Parse export to graph:

   $ make lnen  
   $ make lnfr  

   $ # or both  
   $ make graphs  

   $ # manual cmd  

   $ cd parser; python parse.py lnfr ../exports/ls-fr-spiderlex/ --complete ../completedb_fr.sqlite -s igraph -o ../lnfr.picklez  

--------------------------

## Run Flask server FOR DEVELOPPEMENT ONLY :

   $ make rundev  

   $ #or manual cmd  
   $ cd spiderlex; export PYTHONPATH=PYTHONPATH:../parser/ ; port APP_DEBUG=true;  python lexnet_app.py  --port 5002

--------------------------


## Releases

0.8.1 Database update ! need to rebuild graphs  
0.7.1  
0.7  
