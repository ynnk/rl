#!/usr/bin/env python
#-*- coding:utf-8 -*-

import sys, os
import logging

from flask import Flask, request
from flask import render_template, url_for, abort, jsonify


from reliure.utils.log import get_basic_logger

import rllib
import json

# Build the app & 
app = Flask(__name__)
app.debug = os.environ.get('APP_DEBUG', None) == "true"
logger = get_basic_logger(logging.DEBUG)

print "debug ", app.debug, os.environ.get('APP_DEBUG', None)

#list of graphs (short name, long name, path) 
graphs = {
    "fr" : {"name" : "French Lexical Network", "path" : "./Graphs/ln/ln_fr/lngraph.pickle"},
#    "en" :  {"name" : "English Lexical Network", "path" : "./Graphs/ln/ln_en/lngraph.pickle"}
}
graph_paths = dict( (key, value["path"]) for key, value in graphs.items())


app.add_url_rule('/_routes', 'routes', lambda : app_routes(app) ,  methods=["GET"])


# index page
@app.route("/")
def index():
    return "IndexPage, TODO"

@app.route('/<string:lang>/complete', methods=['POST'])
@app.route("/<string:lang>/complete/<string:text>")
def complete(lang, text=None):
    name = request.form.get('name', text)
    return jsonify(
        { 'results': {
            'response' : {
                'complete' : rllib.complete(name, dbpath='../completedb_%s.sqlite' %lang)
        }}})
        
@app.route('/<string:lang>/complete/uuids/<string:text>', methods=['GET','POST'])
def complete_uuids(lang, text=None):

    entries = text.split(";")
    complete = []
    for e in entries:
        k = ['prefix', 'name', 'subscript', 'superscript', 'num']
        v = e.split("*") + ([''] * 5)
        d = dict(zip(k,v[:len(k)]))
        d = rllib.complete_uuids(d, dbpath='../completedb_%s.sqlite' %lang)
        if d : complete.extend(d)
        
    return jsonify(
        { 'results': {
            'response' : {
                'complete' : complete
        }}})

## build other entry point of the app
@app.route('/<string:lang>' )
def app_graph_lang(lang):
    return app_graph(lang, path="")

@app.route("/<string:lang>/q/<string:query>")
def app_graph_query(lang, query):
    return app_graph(lang, query, path="")
    
        
def app_graph(lang, query=None, path = ""):
    root_url = url_for("index")
    complete_url = "/%s/complete" % lang
    
    print "root url: %s" % (root_url, )
    print " complete url : %s" % ( complete_url)

    # if graph doesn't exist: 404
    if lang not in ('fr',) :
        abort(404)

    args = request.args
    return render_template(
        'index_nav.html',
        polymer_path = "%s/static/padagraph_webcomponents/" % path,
        debug= True, # app.debug,
        lang = lang,
        data= "",
        gid = "rlfr",
        
        #routes= "http://padagraph.io/engines", 
        #sync= "http://padagraph.io/graphs/g/rlfr",
        
        sync= "http://localhost:5002/static/rlfr.json",
        routes= "http://localhost:5000/engines",
        urlRoot= "http://localhost:5000/graphs/g/",
        
        query=query,
        root_url = root_url,
        complete_url=complete_url,
        options = json.dumps({
            #
            'wait' : 4,
            #template
            'zoom'  : args.get("zoom", 1200 ),
            'buttons': 0, # removes play/vote buttons
            'labels' : 0,  # removes graph name/attributes 
            # gviz
            #'el': "#viz",
            'background_color' : "#eeeeee",
            'initial_size' : 1 ,
            'vtx_size' : args.get("vertex_size", 1 ),
            'show_text'  : 0 if args.get("no_text"  , None ) else 1,     # removes vertex text 
            'show_nodes' : 0 if args.get("no_nodes" , None ) else 1,   # removes vertex only 
            'show_edges' : 0 if args.get("no_edges" , None ) else 1,   # removes edges 
            'show_images': 0 if args.get("no_images", None ) else 1, # removes vertex images

            'user_font_size' : 5,# range -5,5
            'user_vtx_size' : -1.5, # range -5,5
    
            'auto_rotate': 0,
            'adaptive_zoom': 1,
            'use_material_transitions': True,
        })
        )

def main():
    ## run the app
#    app.run("0.0.0.0")
    
    from flask.ext.runner import Runner
    runner = Runner(app)
    runner.run()

if __name__ == '__main__':
    sys.exit(main())

