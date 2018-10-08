.phony : yarn install build 



yarn: 
	curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
	echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
	apt-get update && apt-get install yarn

venv3:
	virtualenv -p python3 venv3
	. venv3/bin/activate; pip install -r requirements.txt

install : npm

npm: 
	yarn
	wget https://raw.githubusercontent.com/mrdoob/three.js/r76/build/three.min.js -O node_modules/three/three.min.js



build: jade deploy

jade:

	@echo "\n ---------------------------"
	@echo " * Building flask templates"
	@echo " ---------------------------\n"

	#cd ./templates && pypugjs  *.jade
	cd ./spiderlex/templates && node ../../node_modules/jade/bin/jade.js -P *.jade

polymer:
	cd ../padagraph/application/src && make polymer

	cp ../padagraph/application/src/static/embed.* ./spiderlex/jslib/
	cp ../padagraph/application/src/static/gviz.* ./spiderlex/jslib/
	cp ../padagraph/application/src/static/cello.* ./spiderlex/jslib/

	mkdir -p ./spiderlex/jslib/padagraph_components/
	cp ../padagraph/application/src/static/padagraph_webcomponents/*.html ./spiderlex/jslib/padagraph_components/

deploy:

	mkdir -p spiderlex/static/
	cp -r node_modules  spiderlex/static/

	cp -rf spiderlex/css spiderlex/static/
	cp -rf spiderlex/js/* spiderlex/static/
	cp -rf spiderlex/jsext/* spiderlex/static/
	cp -rf spiderlex/jslib/* spiderlex/static/
	cp -rf spiderlex/polymer/* spiderlex/static/


graphs: lnfr lnen

lnfr: 
	. venv3/bin/activate; cd parser; \
	python3 parse.py lnfr ../exports/ls-fr-spiderlex/ --complete ../completedb_fr.sqlite -s igraph -o ../lnfr.picklez

lnen: 
	. venv3/bin/activate; cd parser; \
	python3 parse.py lnen ../exports/ls-en-spiderlex/ --complete ../completedb_en.sqlite -s igraph -o ../lnen.picklez




rundev: 
	. venv3/bin/activate; export PYTHONPATH=$$PYTHONPATH:../parser; export APP_DEBUG=true; export FLASK_APP=lexnet_app.py ;export FLASK_DEBUG=1; cd spiderlex ; flask run 


clean:
	rm -rf node_modules
	rm -rf venv3
	rm -rf spiderlex/static
	

help:
	@cat README
