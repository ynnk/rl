#!/usr/bin/env python
#-*- coding:utf-8 -*-

import os, sys
import datetime
import argparse

import unicodecsv as csv
import codecs
import re
import json

import xml.sax

from pprint import pprint

from botapi import Botagraph, BotaIgraph, BotApiError
from botapad.utils import prepare_graph, export_graph
from reliure.types import Text
from rllib import complete

import sqlite3
from bs4 import BeautifulSoup

import sys
# sys.setdefaultencoding() does not exist, here!
reload(sys)  # Reload does the trick!
sys.setdefaultencoding('UTF8')

"""
 
"""

DEBUG=False

class RLFHandler(xml.sax.handler.ContentHandler):
    def __init__(self):
        self._result = {}

    def parse(self, f):
        info( "\n\n ** %s **" % (f))
        xml.sax.parse(f, self)
        info( "    %s models" % (len(self._result)))
        
        return self._result
        
class CopolysemyHandler(RLFHandler):
    def parse(self, f):
        info( "\n\n ** %s **" % (f))
        self.current = None
        xml.sax.parse(f, self)
        info( "    %s models" % (len(self._result)))
        return sorted(self._result.values(), key=lambda x: x['order'])
        
    def startElement(self, name, attrs):
        if name == "subtype":
            id = attrs['id']
            attrs = dict(attrs.items())
            attrs.update({ 'id' : id } )
            self._result[self.current]['subtypes'][id] = attrs
            
        if name == "type":
            id = attrs['id']
            attrs = dict(attrs.items())
            attrs.update({ 'id': id, 'subtypes': {} })
            self.current = id
            self._result[attrs['id']] = attrs

        
class LexicalFunctionHandler(RLFHandler):

    def __init__(self):
        self._result = {}
        self._current = None      
        self._cdata = ""      
        self._order = 0

    def startElement(self, name, attrs):
        if name == "lexicalfunction":
            self._current = attrs['id']
            self._result[self._current] = dict(attrs.items())

    def characters(self, content):
        self._cdata += content
        
    def endElement(self, name):
        if name == "lexicalfunction":
            attrs = self._result[self._current]
            attrs['cdata'] = self._cdata.strip()
            self._cdata = ""
            attrs['order'] = self._order
            self._order += 1
            
class ExempleSourceHandler(RLFHandler):
        
    def startElement(self, name, attrs):
        if name == "source":
            self._result[attrs['id']] = attrs['name']
                
class GramCharacHandler(RLFHandler):
        
    def startElement(self, name, attrs):
        if name == "characteristic":
            self._result[attrs['id']] = dict(attrs.items())

class SemLabelHandler(RLFHandler):
        
    def startElement(self, name, attrs):
        if name == "instance":            
            self._result[attrs['id']] = dict(attrs.items())


def info( message ):
    print message

def error( message ):
    print message

def debug( *args):
    if DEBUG:
        pprint( args)

def readcsv(path, name, type=dict):
    f = "%s/%s" % (path, name)
    with codecs.open(f, 'r') as csvfile:
        info( "\n\n ** %s **" % (f))
        if type == list:
            reader = csv.reader(csvfile, delimiter='\t', quotechar='"')
            rows = [ row for row in reader][1:]
        elif type == dict:
            reader = csv.DictReader(csvfile, delimiter='\t', quotechar='"')
            rows = []
            _rows = [ row for row in reader  ]
            for row in _rows :
                #print row 
                r = {k:v for k,v in row.items()}
                rows.append(r)
            
        info(  '   %s rows' % (len(rows) ))

    return rows


class Parser(object):

    def __init__(self,gid, path):
        self.gid = gid
        self.path = path
        self.errors = 0
        self.completions = []
        
    def todo(self, message ):
        info( "\n\t ### #################" )
        info( "\t ### TODO" )
        info( "\t ### %s" % message )
        info( "\t ### #################" )
        
    def info(self, message ):
        info( message )

    def error(self, message ):
        self.errors += 1
        error(message)

    def debug(self, *args):
        debug(args)

    def parse(self, bot):
        
        # 1 2 3 4 5 6  9 10 11 12 13 14 15 16
        self.completions = []
        gid = self.gid
        path = self.path

        KEYS =  [ "id","num", "prefix", "subscript", "superscript", "vocable"]
        
        WEIGHT_COPO = 1
        WEIGHT_LOC = 1
        WEIGHT_INC_DEF = 2
        WEIGHT_INC_FORM = 0

        idx = {} 
        
        nodes = {}
        edges = []
        nodetypes = {}
        edgetypes = {}
        

        bot.create_graph(gid, { 'name': gid,
                            'description': "",
                            'image': "",
                            'tags': [""]
                          }
                    );

        lexie_props = {
        
            'rlfid'   : Text(),
            'id'      : Text(),
            'label'   : Text(),
            'num'     : Text(),
            'vocable' : Text(),
            'prefix'  : Text(),
            'subscript' : Text(),
            'superscript' : Text(),

            'gc' : Text(), # json
            'df' : Text(), # json
            'examples' : Text(), # json
            'lfs' : Text(), # json
            
        }
        nodetypes["Lexie"] = bot.post_nodetype(gid, "Lexie", "", lexie_props) 

        # noeuds lexicaux du graphe
        nodes = { e['id']: e for e in readcsv(path, "01-lsnodes.csv") }
        entries =  { e['id']: e for e in readcsv( path, "02-lsentries.csv") } 

        for e in entries.values() : e.pop('id')


        def as_token(nid, form, actants ):
            dic = dict(zip(KEYS, [ "" for e in KEYS ]))
            
            if nid : 
                node = nodes.get(nid, None)
                if node:
                    values =  [ node[k] for k in KEYS ]
                    dic = dict(zip(KEYS, values))
                    
            if form and len(form):
                # conversion des variables d actants
                _form = form
                if len(actants):
                    for k,v in actants :
                        _form = _form.replace(k,v)
                    
                dic['vocable'] = _form
                        
            return dic
                
        
        for node in nodes.values():
            entry = entries[node['entry']]
            node.update(entry)
            node.update({
                'rlfid' : node['id'],
                'id' : node['id'],
                'label' : node['name'],
                
                'vocable' : node['name'],
                'prefix' : node['addtoname'],
                'num' : node['lexnum'],
                'subscript' : node['subscript'],
                'superscript' : node['superscript'],

                'label_form' : None,

                'gc' : {},

                'lfs': [],
                'df': {
                    'form' : node['name'],
                    'actants' : [],
                    'left_pf_form': '',
                    'right_pf_form': '',
                    'html' : '',
                  },
                'examples' : [],

                'definiens' : None,
                'formatted_definiens' : None,
            })

            to_delete = ('%', 'entry', 'lexnum', 'addtoname')
            for k in to_delete : del node[k]

        print len( set( [ n['id'] for n in nodes.values() ]) ), len(nodes)

        # DF

        # 09-lssemlabel-model.xml 
        # 10-lssemlabel-rel.csv
        # 11-lspropform-rel.csv
        # 17-lsdef.csv

        handler = SemLabelHandler()
        semlabels = handler.parse("%s/09-lssemlabel-model.xml" % path)
        rels = readcsv(path, "10-lssemlabel-rel.csv", type=list)

        for sense, label, percent in rels:
            df = nodes[sense]['df']
            df['label_form'] = semlabels[label]
            df['percent'] = percent
            
        rels = readcsv(path, "11-lspropform-rel.csv", type=list)
        for id, propform, tildevalue, percent, actantslist in rels:
            df = nodes[id]['df']
            df['propform'] = propform
            df['tildevalue'] = tildevalue
            df['percent'] = percent

            actants = actantslist if actantslist else "()";
            actants = [ e for e in actants[1:-1].split(',') if len(e)];
            actants = map(lambda e: e.split('=') , actants)
            
            df['actants']     = actants
            df['actantslist'] = actantslist

        # liens d inclusion definitionnelle
        l_inc_def = {}

        for r in readcsv(path, "17-lsdef.csv", type=list):
            id,	def_XML, def_HTML = r
            if id in nodes:
                df = nodes[id]['df']
                df['xml'] = def_XML
                soup = BeautifulSoup(def_HTML, 'html.parser')
                rlfids = [a.attrs['href'].split('/')[1] for a in  soup("a")]
                l_inc_def[id] = rlfids
                df['html'] = soup.body.prettify()

            else :
                self.error( " # 17-lsdef # no def for %s" % id )



        # GC + PH LOCUTIONS

        """
        gc : {
            usagenote : [],
            othergc : [],
            pos : {},
            
            locution : {
                locution_tokens	: [ {
                    id  : "41142",
                    num	: "I.1b",
                    prefix : "",
                    subscript : "",	
                    superscript	: "",	
                    vocable	monter }
                ],
                name :	locution verbale
                type :	2
            }

        }
        """
        
        handler = GramCharacHandler()
        pos = handler.parse("%s/05-lsgramcharac-model.xml" % path)
        
        rels = readcsv(path, "06-lsgramcharac-rel.csv", type=list)
        l_inc_form = {}

        print "id, usagenote, usagenotevars, POS, phraseolstruc, embededlex, othercharac, othercharacvars"
        for r in rels:
            id, usagenote, usagenotevars, POS, phraseolstruc, embededlex, othercharac, othercharacvars = r
            if POS == "":
                error( " # 06-lsgramcharac-rel : missing POS %s for id %s  : %s" % (POS, id,r) )
                continue
                
            # GC Caractéristiques grammaticales

            split = lambda chaine : ([] if len(chaine) <= 2 else chaine[1:-1].split(',') )
            #print [] if len(othercharac) <= 2 else othercharac[1:-1].split(',')

            node = nodes[id]   
            othercharac =  [ pos[e]['name']  for e in split(othercharac)  ]
            usagenote =  [ pos[e]['name']  for e in split(usagenote )]
            
            gc = {}
            gc['usagenote'] = usagenote # fem ..
            gc['othergc']  = othercharac  
            gc['locution'] = None
            gc['pos'] = {
                            'name' : pos[POS]['name'],
                            'type' : pos[POS]['type']
                         }
            
            # LN Locutions nominales, prepositionnelles, phrases
            if len( embededlex ):
                #embededlex = re.findall( "[0-9]+", embededlex)
                #embededlex = embededlex[1:-1].split(',')
                _embededlex = embededlex.replace('),(', ');(')
                _embededlex = [ e  for e  in  _embededlex[1:-1].split(';') ]
                _embededlex = [ e[1:-1].split(',') for e in _embededlex ]
                actants =  node['df']['actants']
                tokens = [ as_token(_id,form, actants) for _id,form in _embededlex  ]
                gc['locution'] =  {
                    'tokens' : tokens,
                    'name' : pos[POS]['name'],
                    'type' : pos[POS]['type']
                }
                for t in tokens:
                    tid = t['id']
                    if tid and len( tid): 
                        l_inc_form[tid] = l_inc_form.get(tid, []) + [id]
                    
            if "$" in embededlex :
                actants =  node['df']['actants']
                z= [ e['vocable'] for e in  [ as_token(id,form, actants) for id,form in _embededlex ]]
                
                if node['rlfid'] in ( "ls:fr:node:45323" , "ls:fr:node:45326"):
                    print "\n\n", node['rlfid']
                    print "[t]","$" if "$" in embededlex else "" , id, embededlex, [t['id'] for t in tokens]
                    print "embededlex", embededlex
                    print "_embededlex", _embededlex
                    print "actants", actants
                    print [ as_token(id,form, actants) for id,form in _embededlex ]
                    print z

            node['gc'] = gc
        
        self.todo(  " 06-lsgramcharac-rel.csv : TODO POST LOCUTIONS" )        

        for r in rels:
            id, usagenote, usagenotevars, POS, phraseolstruc, embededlex, othercharac, othercharacvars = r
            """
            node = nodes[r['id']]

                TODO Locutions links !!
        
            """
            pass
        
                
        # Nodes Exemples
        
        handler = ExempleSourceHandler()
        sources = handler.parse("%s/14-lsexsource-model.xml" % path)
        exemples = { e['id']: e for e in readcsv(path, "15-lsex.csv") }
        
        for e in exemples.values() :
            d,m,y  = ("///%s" % e['date']).split('/')[-3:]
            e['source'] = sources[e['source']]
            e['date_day'] = d
            e['date_month'] = m
            e['date_year'] = y
            e['text'] = e['content']
            e['authors'] =  [  {'first_name':v.split(',')[0],
                                'last_name':v.split(',')[1] if len(v.split(',')) > 1 else '' }
                              for v in ("%s"%e['authors']).split(';')[:2] if len(e['authors'])]
            del e['content']
            
        rels = readcsv(path, "16-lsex-rel.csv")
        for e in rels:
            nid, exid, oc, po = ( e['id'],e['example'],e['occurrence'] ,e['position'] )
            
            node = nodes[nid]
            example = dict(exemples[exid])
            occurrences =  [  {'first':v.split(',')[0], 'last':v.split(',')[1]}
                              for v in oc.split(';') if len(v)]
                                      
            example.update({ 'occurrences': occurrences,
                             'position'   : po })
            node['examples'].append( example )


        # POST Nodes vertex
        self.info( "\n * POSTING Lexie nodes : %s" % (len(nodes.values())) )
        
        def gen(nodes):
            jsons = ( 'df', 'gc', 'examples', 'locutions' )
            for node in nodes :
                properties = {
                    k : node[k] if k not in jsons else json.dumps(node[k]) for k in lexie_props
                }
                yield {
                        'nodetype': nodetypes['Lexie']['uuid'],
                        'properties': properties
                      }
        
        for node, uuid in bot.post_nodes( gid, gen(nodes.values()), key='rlfid' ):
            idx[ node['properties']['rlfid'] ] = uuid
            r = list( node['properties'][k] for k in ['rlfid','vocable','num','prefix','subscript','superscript'])
            self.completions.append( [uuid] + r )

        self.info( " * POST    Lexie nodes : %s" % (len(idx)) )
            
        
        
        # Relations / edges

        
        self.info( "17-lsdef.csv [POST] Liens d inclusion définitionnelle " )

        name = "DefinitionalInclusion" 
        properties = { "weight": Text() }
        edgetypes[name] = bot.post_edgetype(gid, name, name, properties)
        
        info( " * POST edgetype : %s %s" % (name, edgetypes[name]['uuid']) )

        edges = []
        skipped_weight = 0
        for target, sources in l_inc_def.iteritems():

            weight = WEIGHT_INC_DEF
            for source in sources:
                payload = {
                            'edgetype': edgetypes[name]['uuid'],
                            'source': idx[source],
                            'target': idx[target],
                            'properties': {
                                    'weight' : weight,
                            } 
                        }
                edges.append(payload)


        
        self.info( "17-lsdef.csv [POST] Liens d'inclusion formelle " )

        name = "FormalInclusion" 
        properties = { "weight": Text() }
        edgetypes[name] = bot.post_edgetype(gid, name, name, properties)

        for target, sources in l_inc_form.iteritems():
            weight = WEIGHT_INC_FORM
            
            for source in sources:
                payload = {
                            'edgetype': edgetypes[name]['uuid'],
                            'source': idx[target],
                            'target': idx[source],
                            'properties': {
                                    'weight' : weight,
                            } 
                        }
                edges.append(payload)

        for e in bot.post_edges(gid, iter(edges) ) : 
            pass
        


        """
        ## Liens de co-polysémie
        
        03-lscopolysemy-model.xml
        04-lscopolysemy-rel.csv
        """

        handler = CopolysemyHandler()
        copo = handler.parse("%s/03-lscopolysemy-model.xml" % path)
        copo = { e['id']: e for e in copo }
        _name =  lambda t,s : "Co-polysemy/%s%s%s" % (t['name'], "/" if s else "", s['name']if s else "" )
        
        # edgetypes
        self.info( " * POSTING Co-polysemy edgetypes : %s" % (len(copo.values())) )
        for cop in copo.values():
            tp = cop['id'] # cop['name']
            name = _name(cop, None)
            desc = ""
            properties = { "weight": Text(), 'i':Text() }

            edgetypes[name] = bot.post_edgetype(gid, name, desc, properties)
            info( " * POST edgetype : %s %s" % (name, edgetypes[name]['uuid']) )

            for k,v in cop['subtypes'].items() :
                name =  _name(cop, v)
                edgetypes[name] = bot.post_edgetype(gid, name, desc, properties)
                info( " * POST edgetype : %s %s" % (name, edgetypes[name]['uuid']) )

        rels = readcsv(path, "04-lscopolysemy-rel.csv", type=list)

        edges = []; count = 0
        for r in rels:
            src, tgt, typ, subtype = r
            t = copo[typ]
            s = copo[typ]['subtypes'].get(subtype, None) if len(subtype) else None
            
            if len(subtype) and (copo[typ]['subtypes'].get(subtype, None) is None):
                self.error ( " # 04-lscopolysemy-rel # no subtype %s in type %s    %s" \
                        % ( int(subtype) , int(typ), r ))
            
            count +=1
            payload = {
                        'edgetype': edgetypes[_name(t,s) ]['uuid'],
                        'source': idx[src],
                        'target': idx[tgt],
                        'properties': { 'weight' : WEIGHT_COPO, 'i': count } 
                    }
            edges.append(payload)

        self.info("\n *  POSTING Co polysemy edges : %s" % len(edges) ) 
        for cop in copo.values():
            name =  _name(cop, None)
            self.debug( "    edges : %s %s" % (len( [ e for e in edges if e['edgetype'] == edgetypes[name]['uuid']]), name ) )
            for k,v in cop['subtypes'].items() :
                name =  _name(cop, v)
                self.debug( "    edges : %s %s" % (len( [ e for e in edges if e['edgetype'] == edgetypes[name]['uuid']]), name ) )
        
        for e in bot.post_edges(gid, iter(edges), extra= lambda e: e['properties']['i'] ) : 
            pass


        """
        ## Liens de fonctions lexicales (FL)

        12-lslf-model.xml contient le modèle hiérarchique des FL : chaque FL appartient à une
        « famille » et chaque famille est elle-même élément d’un « groupe » de familles ;
        13-lslf-rel.csv contient l’ensemble de liens de FL entre lexies individuelles.
        """

        handler = LexicalFunctionHandler()
        flex = handler.parse("%s/12-lslf-model.xml" % path)

        # POST edgetypes
        
        self.info( " * POSTING Lexical Function edgetypes : %s" % (len(flex.values())) )
        _name = lambda x: "LexicalFunction/%s" % x['name']
        for fl in flex.values():
            tp = fl['id'] # cop['name']
            name = _name(fl)
            desc = ""
            properties = {
                        "weight": Text(),
                        'form': Text(),
                        'separator': Text(),
                        'merged':Text(),
                        'syntacticframe':Text(),
                        'constraint': Text(),
                        'position': Text()
                        }
            attributes = { "order" : fl['order'],
                           "cdata" : fl['cdata'], }
            
            edgetypes[name] = bot.post_edgetype(gid, name, desc, properties, attributes)
            self.debug( " * POST edgetype : %s %s" % (name, edgetypes[name]['uuid']) )

        # POST Edges

        # LF
        rels = readcsv(path, "13-lslf-rel.csv", type=list)
        edges = []
        skipped_weight = 0
        for source, lf, target, form, separator, merged, syntacticframe, constraint, position in rels:

            weight = int(flex[lf]['semantics'])
            payload = {
                        'edgetype': edgetypes[_name(flex[lf])]['uuid'],
                        'source': idx[source],
                        'target': idx[target],
                        'properties': {
                                'weight' : weight,
                                'form': form,
                                'separator': separator,
                                'merged':merged,
                                'syntacticframe':syntacticframe,
                                'constraint': constraint,
                                'position': position
                            } 
                    }
            edges.append(payload)

        weights = list( len([ e for e in edges if e['properties']['weight'] == i  ]) for i in [0,1,2] )
        self.info(' !! weights  [ 0 : %s,  1 : %s, 2 : %s ] ' %  tuple(weights))
        
        self.info(" * POSTING Lexical Function edges : %s" % len(edges) ) 

        for fl in flex.values():
            name = _name(fl)
            self.debug( "    edges : %s %s" % (len( [ e for e in edges if e['edgetype'] == edgetypes[name]['uuid']  ] ), name, ) )
        count = 0; uuids = []

        for e, uuid in bot.post_edges(gid, iter(edges) ) : 
            count +=1
            uuids.append(uuid)
            
        self.info(" * POST    Lexical Function edges : %s " % (count) ) 

        print "\n\n == DEBUG == \n\n"
        print len(nodes)


def make_complete_db(db, completions):
    db = sqlite3.connect(db)
    c = db.cursor()

    # Create table & indexes
    c.execute('''DROP TABLE  IF EXISTS complete''')
    
    c.execute('''CREATE TABLE complete
                 (uuid text, entry text, name text, lexnum text, prefix text, subscript text, superscript text)''')
    c.execute('''CREATE UNIQUE INDEX index_uuid on complete (uuid);''')
    c.execute('''CREATE UNIQUE INDEX index_entry on complete (entry);''')
    c.execute('''CREATE INDEX index_name on complete (name);''')

    rows = []
    
    c.executemany('INSERT INTO complete ( uuid, entry, name , lexnum, prefix, subscript, superscript ) VALUES (?,?,?,?,?,?,?)', completions)

    db.commit()
    db.close()
 
    
def main():
    """
        gid = "rlfr"
        path = "../exports/fr-ls-spiderlex"
        sqldb = "../completedb.sqlite"
    """
    
    parser = argparse.ArgumentParser()
    
    parser.add_argument("gid", action='store', help="graph id ", default=None)
    parser.add_argument("path" , action='store', help="rlf export path", default='')
    parser.add_argument("--complete" , action='store', help="path to sqldb to store completions", default=None)

    parser.add_argument("-s" , action='store', dest="backend", help="backend 'igraph' or 'padagraph'",  choices=('igraph', 'padagraph'), default='igraph')
    
    parser.add_argument("-o" , action='store', dest="outgml", help="path to store as graphml", default=None)

    # backend padagraph
    parser.add_argument("--key" , action='store', dest="key", help="path to key", default=None)
    parser.add_argument("--host" , action='store', dest="host", help="padagraph host", default="http://localhost:5000")

    args = parser.parse_args()

    gid, path, sqldb, backend, outgml = args.gid, args.path, args.complete, args.backend, args.outgml

    
    key = open(args.key).read().strip() if args.key else None
    print args.host, args.key 

    parse( gid, path, sqldb, backend, args.host, key, outgml )
    
def parse(gid, path, sqldb, backend, host, key, outgml):

    parser = Parser(gid, path)

    # igraph
    if backend == 'igraph':
        bot = BotaIgraph(directed=True)
        parser.parse(bot)
        graph = bot.get_igraph()
        graph = prepare_graph(graph)
        graph.es['weight'] = [ float(e['properties']['weight']) for e in graph.es ]

        parser.info(" %s " % graph['meta'] )

        if outgml:
            graph.write(outgml)

    if backend == 'padagraph':
        bot = Botagraph(host=host, key=key)
        if bot.has_graph(gid): bot.delete_graph(gid)
        parser.parse(bot)

    if sqldb:
        parser.info("  ** Writing sql completions db : %s " % sqldb)
        make_complete_db(sqldb, parser.completions)
    

    parser.info("  %s " % bot.get_schema(gid))

    db = sqlite3.connect(sqldb)
    complete("peur", db)
    db.close()
if __name__ == '__main__':
    sys.exit(main())