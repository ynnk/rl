.phony : yarn install build 

dev:
	make clean
	printf %s\\n venv3 install | xargs -n 1 -P 8 make
	printf %s\\n build lnen lnfr | xargs -n 1 -P 8 make

venv3 :
	@echo "\n ---------------------------\n"
	@echo "\n# **setting up virtualenv with python 3 **\n"
	
	virtualenv -p python3 venv3;
	. venv3/bin/activate; pip install -r requirements.txt

yarn: 
	curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
	echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
	apt-get update && apt-get install yarn



install: npm

npm:
	@echo "\n ---------------------------\n"
	@echo "\n# ** Installing node modules **"
	yarn

	@echo "\n# ** fetching polymer **"
	cd node_modules; wget https://github.com/Polymer/polymer/archive/v1.11.3.zip; unzip v1.11.3.zip

	
	@echo "\n# ** downloading threejs R76 **"
	wget https://raw.githubusercontent.com/mrdoob/three.js/r76/build/three.min.js -O node_modules/three/three.min.js
		
build: jade deploy version

jade:

	@echo "\n ---------------------------\n"
	@echo "\n# ** Building flask templates **\n"

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
	@echo "\n ---------------------------\n"
	@echo "\n# ** copying static files **\n"
	
	mkdir -p spiderlex/static/
	cp -r node_modules  spiderlex/static/

	cp -rf spiderlex/css spiderlex/static/
	cp -rf spiderlex/js/* spiderlex/static/
	cp -rf spiderlex/jsext/* spiderlex/static/
	cp -rf spiderlex/jslib/* spiderlex/static/
	cp -rf spiderlex/polymer/* spiderlex/static/

version:
	@echo "\n ---------------------------\n"
	@echo "\n# ** release git version **\n"
	git log -n1 > spiderlex/static/version.txt
	cat spiderlex/static/version.txt

rundev: 
	. venv3/bin/activate; export PYTHONPATH=$$PYTHONPATH:../parser; export APP_DEBUG=true; export FLASK_APP=lexnet_app.py ;export FLASK_DEBUG=1; cd spiderlex ; flask run 



graphs:
	@echo "\n ---------------------------\n"
	
	@echo "\n# ** Downloading csv data [HOST trick]**\n"
	wget -q http://lexsys.atilf.fr/export/spiderlex.tgz

	@echo "\n# ** unpacking **\n"
	tar xzf spiderlex.tgz
	
	@echo "\n# ** Parsing csv export **\n"

	make lnfr lnen

lnfr: 
	. venv3/bin/activate; cd parser; \
	python3 parse.py lnfr ../ls-fr-spiderlex/ --complete ../completedb_fr.sqlite -s igraph -o ../lnfr.picklez

lnen: 
	. venv3/bin/activate; cd parser; \
	python3 parse.py lnen ../ls-en-spiderlex/ --complete ../completedb_en.sqlite -s igraph -o ../lnen.picklez



clean :
	@echo "\n# **Cleaning install directories**"
	make clean_graphs clean_js clean_py
	

clean_js:
	@echo "\n ** removing node modules\n"
	rm -rf ./node_modules
	rm -f package-lock.json
	@echo "\n ** removing statics \n"
	rm -rf spiderlex/static

clean_py:
	@echo "\n ** removing python virtualenv\n"
	rm -rf venv3

clean_graphs:
	@echo "\n* deleting generated data\n"
	rm -f completedb_fr.sqlite
	rm -f completedb_en.sqlite
	rm -f lnen.picklez
	rm -f lnfr.picklez
	
clean_data:
	rm -rf ls-fr-spiderlex
	rm -rf ls-en-spiderlex
	rm -f spiderlex*.tgz*


clean_data:
	rm -rf ls-fr-spiderlex
	rm -rf ls-en-spiderlex
	rm -f spiderlex*.tgz*
	


help:
	@cat README
