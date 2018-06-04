#!/usr/bin/env python
#-*- coding:utf-8 -*-

import sys, os
import logging

from flask import Flask, request, g
from flask import render_template, url_for, abort, jsonify


from reliure.utils.log import get_basic_logger

import rllib
import json
import sqlite3

# Build the app & 
app = Flask(__name__)
app.debug = os.environ.get('APP_DEBUG', None) == "true"
PRODUCTION = os.environ.get('PRODUCTION', None)

print "PRODUCTION", PRODUCTION
print "debug ", app.debug, os.environ.get('APP_DEBUG', None)

logger = get_basic_logger(logging.DEBUG)


# Flask-Login
from flask_login import LoginManager, current_user, login_user, login_required
   
login_manager = LoginManager()
login_manager.init_app(app)

from flask_cors import CORS
CORS(app)

# app routes
app.add_url_rule('/_routes', 'routes', lambda : app_routes(app) ,  methods=["GET"])


CONFIG = { 'fr' :{ 
           #'db' : '../completedb_fr.sqlite'
           'db' : '../completedb_fr1804.sqlite'
           }
         }
         
#GRAPHS_CONF = { "rlfr" : "../lnfr.picklez" }
GRAPHS_CONF = { "lnfr" : "../lnfr1804.picklez" }

LANGS = tuple([ lang for lang,v in CONFIG.items()])


CLIENT_CONF =  {
    'sync': "/static/rlfr.json",
    'routes' : "/engines",
    'urlRoot': "/graphs/g/",
}

#if PRODUCTION:
    #CLIENT_CONF =  {
        #'routes': "http://padagraph.io/engines", 
        #'sync': "http://padagraph.io/graphs/g/rlfr",
        #'urlRoot': "http://padagraph.io/graphs/g/",
    #}
    

def get_db(lang):
    if lang not in CONFIG:
        abort(url_for('index'))
    
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(CONFIG[lang]['db'])
        db.row_factory = rllib.dict_factory
    return db


@app.teardown_appcontext
def close_sqlite_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


# index page
@app.route("/")
@app.route("/home")
def index():
    return render_template(
        'home.html'
    )


# completion 
@app.route('/<string:lang>/complete', methods=['POST'])
@app.route("/<string:lang>/complete/<string:text>")
def complete(lang, text=None):
    completions = []
    db = get_db(lang)
    name = request.form.get('name', text)
    # uuid, entry, name, lexnum as num , prefix, subscript, superscript

    if name.startswith('#'):
        array = rllib.complete_id(name[1:], db )
    else :
        array = rllib.complete(name, db)

    buff = ""
    for c in array:
        filters = [ c.get(k, None) not in ('', None) for k in ("num", "subscript", "superscript") ]
        if any( filters ):
            if buff != c['name'] :
                lex = {
                    "uuid": "",
                    "entry": "",
                    "name": c['name'],
                    "num": "", "prefix":"", "subscript":"", "superscript" : "" }
                completions.append(lex)
                print lex
            
        buff = c['name']
        completions.append(c)
        
    return jsonify(
        { 'results': {
            'response' : {
                'complete' : completions
        }}})
        
@app.route("/<string:lang>/complete/id/<string:text>")
def complete_id(lang, text=None):
    db = get_db(lang)
    return jsonify(
        { 'results': {
            'response' : {
                'complete' : rllib.complete_id(text, db)
        }}})
        
@app.route('/<string:lang>/complete/uuids/<string:text>', methods=['GET','POST'])
def complete_uuids(lang, text=None):
    db = get_db(lang)
    entries = text.split(";")
    complete = []
    for e in entries:
        if e.startswith('#'):
            complete = rllib.complete_id(e[1:], db )
        else :
            k = ['prefix', 'name', 'subscript', 'superscript', 'num']
            v = e.split("*") + ([''] * 5)
            d = dict(zip(k,v[:len(k)]))
            d = rllib.complete_uuids(d, db, limit=30 )
            if d : complete.extend(d)
        
    return jsonify(
        { 'results': {
            'response' : {
                'complete' : complete
        }}})



# entry point of the app
def app_graph_lang(lang):
    return app_graph(lang, path="")

@app.route('/<string:lang>' )
@app.route("/<string:lang>/q/<string:query>")
@app.route("/<string:lang>/id/<string:query>")
def app_graph_query(lang, query=None):
    return app_graph(lang, query=query, path="")
        
def app_graph(lang, query=None, path = ""):

    if lang not in (LANGS) :
        abort(404)

    args = request.args

    menu = {
      'fr' :{
        'graph' : 'Graphe', 
        'lexlinks' : 'Liens lexicaux', 
        'clusters' : 'Clusters', 
        'def' : 'Dictionnaire', 
      },
      'en' :{
        'graph' : 'Graph', 
        'lexlinks' : 'Lexical links', 
        'clusters' : 'Clusters', 
        'def' : 'Dictionary', 
      }
    }[lang]
    
    return render_template(
        'spiderlex.html',
        polymer_path = "%s/static/padagraph_components" % path,
        debug=  app.debug,
        lang = lang,
        menu = menu,
        data= "",

        #gid = "ln%s" % lang,
        gid = "ln%s" % lang,
        root_url = url_for("index"),
        complete_url = "/%s/complete" % lang,
        query=query,

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
            'user_vtx_size' : 1. , # [1, 25 ]
    
            'auto_rotate': 0,
            'adaptive_zoom': 1,
            'use_material_transitions': True,
            'raycaster_precision' : 3
        }),
        
        ** CLIENT_CONF
        
        )

    
import sys
print sys.path

# igraph graphdb
from pdglib.graphdb_ig import IGraphDB, engines
graphdb = IGraphDB(graphs={}, conf=GRAPHS_CONF)
graphdb.open_database()
#for k in GRAPHS_CONF : graphdb.get_graph(k)

## Neo4j graphdb
#from  graphdb_neo4j import GraphDB
#from  graphdb_neo4j import graph_engine as engines
#graphdb = GraphDB(app.config["NEO4J_HOST"])
#graphdb.open_database()

socketio = None

from pdgapi import graphedit
 
edit_api = graphedit.graphedit_api("graphs", app, graphdb, login_manager, socketio )
app.register_blueprint(edit_api)

from lexnetapi import explore_api
from pdglib.graphdb_ig import engines
api = explore_api(engines, graphdb)

app.register_blueprint(api)


from pdgapi import get_engines_routes
    
@app.route('/engines', methods=['GET'])
def _engines():
    host = ""
    return jsonify({'routes': get_engines_routes(app, host)})


def main():
    
    from flask.ext.runner import Runner
    runner = Runner(app)
    runner.run()

if __name__ == '__main__':
    sys.exit(main())

