.phony : build

build:
	echo

pdg:
	cp ../padagraph/application/src/static/embed.* ./spiderlex/jslib/
	cp ../padagraph/application/src/static/gviz.* ./spiderlex/jslib/
	cp ../padagraph/application/src/static/cello.* ./spiderlex/jslib/

	mkdir -p ./spiderlex/jslib/padagraph_components/ & cp ../padagraph/application/src/static/padagraph_webcomponents/*.html ./spiderlex/jslib/padagraph_components/

deploy:
	#git pull
	cp -rf spiderlex/css/* spiderlex/static/
	cp -rf spiderlex/js/* spiderlex/static/
	cp -rf spiderlex/jsext/* spiderlex/static/
	cp -rf spiderlex/jslib/* spiderlex/static/

