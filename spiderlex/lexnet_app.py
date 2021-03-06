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
app.debug = os.environ.get('APP_DEBUG', None) == "1"
logger = get_basic_logger(logging.DEBUG if app.debug  else logging.INFO)

print( "//  DEBUG ::  ", app.debug )



# Flask-Login
from flask_login import LoginManager, current_user, login_user, login_required
   
login_manager = LoginManager()
login_manager.init_app(app)

from flask_cors import CORS
CORS(app)

# app routes
app.add_url_rule('/_routes', 'routes', lambda : app_routes(app) ,  methods=["GET"])

from conf import * 


def get_db(lang):
    if lang not in LANGS:
        abort(url_for('index'))
    
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(CONFIG["complete_%s" % lang])
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
        _id = "ls:%s:node:%s" % (lang, name[1:])
        array = rllib.complete_id(_id, db )
    else :
        if lang == 'fr' and name[0:3].lower() == 'se ':
            array = rllib.complete(name[3:], db, prefix=True)
        else :
            array = rllib.complete(name, db)

    buff, group   = ("",[])
    for c in array:
        # group lexie by vocable, but one.
        if buff != c['entry_id']:
            group = [e['uuid'] for e in array if e['entry_id'] == c['entry_id'] ]
        
            lex = {
                "uuid": "",
                "entry_id": c['entry_id'],
                "group": group,
                "entry": "",
                "prefix":c['prefix'],                
                "name": c['name'],
                "num": "", 
                "subscript":c['subscript'],
                "superscript" : "" 
            }
            completions.append(lex)            
            buff = c['entry_id']
        if len(group) > 1:        
            completions.append(c)
        
    return jsonify(
        { 'results': {
            'response' : {
                'complete' : completions
        }}})
        
@app.route("/<string:lang>/complete/id/<string:text>")
def complete_id(lang, text=None):
    db = get_db(lang)
    _id = "ls:%s:node:%s" % (lang, text.split(':')[-1])
    return jsonify(
        { 'results': {
            'response' : {
                'complete' : rllib.complete_id(_id, db)
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
    
    gid = "ln%s" % lang

    menu = MENU[lang]

    vizoptions = {
        #
        'wait' : 4,
        #template
        'zoom'  : args.get("zoom", 1500 ),
        'buttons': 0, # removes play/vote buttons
        'labels' : 0,  # removes graph name/attributes 
        # gviz
        #'el': "#viz",
        'background_color' : "#eeeeee",
        'initial_size' : 0.1 ,
        'vtx_size' : args.get("vertex_size", 1 ),
        'show_text'  : 0 if args.get("no_text"  , None ) else 1,     # removes vertex text 
        'show_nodes' : 0 if args.get("no_nodes" , None ) else 1,   # removes vertex only 
        'show_edges' : 0 if args.get("no_edges" , None ) else 1,   # removes edges 
        'show_images': 0 if args.get("no_images", None ) else 1, # removes vertex images

        'user_font_size' : 12,# range -5,5
        'user_vtx_size' : 1. , # [1, 25 ]

        'auto_rotate': 0,
        'adaptive_zoom': 1,
        'use_material_transitions': True,
        'raycaster_precision' : 3
    }

    print(json.dumps(vizoptions))

    app_params =  {
        'debug'   : app.debug,
        'lang'    : lang,
        'gid'     : gid,
        'urlRoot' : url_for("index"),
        'data'    : "",
        'complete_url' : "/%s/complete" % lang,     
        'vizoptions' : vizoptions
    }
    app_params.update(CLIENT_CONF)    


    return render_template(
        'spiderlex.html',
        polymer_path = "%s/static/padagraph_components" % path,
        debug=  app.debug,
        lang = lang,
        menu = menu,
        gid = gid,
        query=query,
        app_params = json.dumps(app_params),
       
        
        ** CLIENT_CONF
        
        )

    
import sys

# igraph graphdb
from pdglib.graphdb_ig import IGraphDB, engines
graphdb = IGraphDB(graphs={}, conf=CONFIG)
graphdb.open_database()


# load graph at startup
for k in CONFIG.get('langs',[]) :
    gid = "ln%s" % k
    logger.info( "Opening graph %s at %s" % (gid, CONFIG.get(gid, None))  )
    graphdb.get_graph(gid)


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
print("DEBUG" ,app.debug)

from pdgapi import get_engines_routes
    
@app.route('/engines', methods=['GET'])
def _engines():
    host = ""
    return jsonify({'routes': get_engines_routes(app, host)})


