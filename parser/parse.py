#!/usr/bin/env python
#-*- coding:utf-8 -*-

import os, sys
import datetime
import argparse

import csv
import re
import json

import xml.sax

from pprint import pprint

from botapi import Botagraph, BotaIgraph, BotApiError
from reliure.types import Text
from rllib import prepare_graph, export_graph
"""
??

 distinguer les locutions OK 
 parse authors
 

 
"""

DEBUG=True

class RLFHandler(xml.sax.handler.ContentHandler):
    def __init__(self):
        self._result = {}       

    def parse(self, f):
        xml.sax.parse(f, self)
        return self._result
        
class CopolysemyHandler(RLFHandler):
    def parse(self, f):
        self.current = None
        xml.sax.parse(f, self)
        return sorted(self._result.values(), key=lambda x: x['order'])
        
    def startElement(self, name, attrs):
        if name == "subtype":
            id = int(attrs['id'])
            attrs = dict(attrs.items())
            attrs.update({ 'id' : id } )
            self._result[self.current]['subtypes'][id] = attrs
            
        if name == "type":
            id = int(attrs['id'])
            attrs = dict(attrs.items())
            attrs.update({ 'id': id, 'subtypes': {} })
            self.current = id
            self._result[attrs['id']] = attrs

        
class LexicalFunctionHandler(RLFHandler):
        
    def startElement(self, name, attrs):
        if name == "lexicalfunction":
            self._result[attrs['id']] = dict(attrs.items())

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
    with open(f, 'r') as csvfile:
        info( "\n\n ** %s **" % (f))
        if type == list:
            reader = csv.reader(csvfile, delimiter='\t', quotechar='"')
            rows = [ row for row in reader][1:]
        elif type == dict:
            reader = csv.DictReader(csvfile, delimiter='\t', quotechar='"')
            rows = [ row for row in reader]
            
        info(  '%s rows' % (len(rows) ))

    return rows


class Parser(object):

    def __init__(self):
        self.errors = 0
        
    def info(self, message ):
        info( message )

    def error(self, message ):
        self.errors += 1
        error(message)

    def debug(self, *args):
        debug(args)

    def parse(self):
        
        # 1 2 3 4 5 6  9 10 11 12 13 14 15 16

        WEIGHT_COPO = 1

        idx = {} 
        
        nodes = {}
        edges = []
        nodetypes = {}
        edgetypes = {}
        
        path = "../exports/RL-fr-export17v17"
        gid = "rlfr"
        
        bot = BotaIgraph(directed=True)
        bot.create_graph(gid, { 'name': gid,
                            'description': "",
                            'image': "",
                            'tags': [""]
                          }
                    );


        lexie_props = {
            'rlfid' : Text(),
            'label' : Text(),
            'num' : Text(),
            'vocable' : Text(),
            'prefix' : Text(),
            
            'df' : Text(), # json

            #'lfs' : Text(), # json
            'gcs' : Text(), # json
            'examples' : Text(), # json
            'locutions' : Text(), # json
        }
        nodetypes["Lexie"] = bot.post_nodetype(gid, "Lexie", "", lexie_props) 

        # noeuds lexicaux du graphe
        nodes = { e['id']: e for e in readcsv(path, "01-lsnodes.csv") }
        entries =  { e['id']: e for e in readcsv( path, "02-lsentries.csv") } 
        for e in entries.values() : e.pop('id')


        def as_token(nid):
            node = nodes.get(nid, None)

            if node:
                keys =  [ "id","num", "prefix", "subscript", "superscript", "vocable"]
                values =  [ node[k] for k in keys ]
                return dict(zip(keys, values))

            return None
            
        
        for node in nodes.values():
            entry = entries[node['entry']]
            node.update(entry)
            node.update({
                'rlfid' : node['id'],
                'label' : node['name'],
                'vocable' : node['name'],
                'prefix' : node['addtoname'],
                'num' : node['lexnum'],

                'gcs' : [],
                'locutions': [],
                #'lfs': [],
                'df': {
                    'form' : node['name'],
                    'left_pf_form': '',
                    'right_pf_form': '',
                  },
                'examples' : [],

                'definiens' : None,
                'formatted_definiens' : None,
                'label_form' : None,
            })

            to_delete = ('%', 'entry', 'lexnum', 'addtoname')
            for k in to_delete : del node[k]

            


        # GC + PH LOCUTIONS

        """
        gcs : {}
        
        locutions : [ 
            locution_gc: {
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
        ]
        """
        
        handler = GramCharacHandler()
        pos = handler.parse("%s/05-lsgramcharac-model.xml" % path)
        rels = readcsv(path, "06-lsgramcharac-rel.csv") 
        for r in rels:
            node = nodes[r['id']]
            
            r['othercharac'] =  [ pos[e]['name']  for e in re.findall("([0-9]+)", r['othercharac'])]

            # GC Caractéristiques grammaticales
            if not len( r['embededlex'] ):
                node['gcs'].append({
                    'locution_tokens' : [],
                    'name' : pos[r['POS']]['name'],
                    'type' : pos[r['POS']]['type']
                })
            
            # LN Locutions nominales, prepositionnelles, phrases
            else :
                node['locutions'].append( { 'locution_gc' : {
                    'locution_tokens' : [ as_token(e) for e in r['embededlex'][1:-1].split(',')  ],
                    'name' : pos[r['POS']]['name'],
                    'type' : pos[r['POS']]['type']
                }})

        
        
        for r in rels:
            """
            node = nodes[r['id']]

                TODO Locutions links !!
        
            """
            pass
            
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
            df['actantslist'] = actantslist
            
        for id,	compliant, def_XML, def_HTML in readcsv(path, "17-lsdef.csv", type=list):
            if id in nodes:
                df = nodes[id]['df']
                df['xml'] = def_XML
                df['html'] = def_HTML
            else :
                self.error( " # 17-lsdef # no def for %s" % id )
                
        # EXEMPLES
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

        def gen(nodes):
            jsons = ( 'df', 'gcs', 'examples', 'locutions' )
            for node in nodes :
                properties = {
                    k : node[k] if k not in jsons else json.dumps(node[k]) for k in lexie_props
                }
                yield {
                        'nodetype': nodetypes['Lexie']['uuid'],
                        'properties': properties
                      }

        for node, uuid in bot.post_nodes( gid, gen(nodes.values()) ):
            idx[ node['properties']['rlfid'] ] = uuid
            
        
        
        # Relations / edges

        """
        ## Liens de co-polysémie
        03-lscopolysemy-model.xml
        04-lscopolysemy-rel.csv
        """

        handler = CopolysemyHandler()
        copo = handler.parse("%s/03-lscopolysemy-model.xml" % path)
        _name =  lambda t,s : "%s%s%s" % (t['name'], ":" if s else "", s['name']if s else "" )

        # edgetypes
        for cop in copo:
            print " === ", cop
            tp = cop['id'] # cop['name']
            desc = ""
            properties = { "weight": Text(), 'i':Text() }
            edgetypes[cop['name']] = bot.post_edgetype(gid, cop['name'], desc, properties)
            for k,v in cop['subtypes'].items() :
                name =  _name(cop, v)
                edgetypes[name] = bot.post_edgetype(gid, name, desc, properties)

        copo = { e['id']: e for e in copo }
        
        rels = readcsv(path, "04-lscopolysemy-rel.csv", type=list)

        edges = []; count = 0
        for src, tgt, typ, subtype in rels:
            t = copo[int(typ)]
            s = copo[int(typ)]['subtypes'].get(int(subtype), None) if len(subtype) else None
            
            if len(subtype) and (copo[int(typ)]['subtypes'].get(int(subtype), None) is None):
                self.error ( " # 04-lscopolysemy-rel # no subtype %s in type %s \n %s %s %s %s" \
                        % ( int(subtype) , int(typ), src, tgt, typ, subtype ))
            
            count +=1
            payload = {
                        'edgetype': edgetypes[ _name(t,s) ]['uuid'],
                        'source': idx[src],
                        'target': idx[tgt],
                        'properties': { 'weight' : WEIGHT_COPO, 'i': count } 
                    }
            edges.append(payload)

        """
        ## Liens de fonctions lexicales (FL)
        12-lslf-model.xml contient le modèle hiérarchique des FL : chaque FL appartient à une
        « famille » et chaque famille est elle-même élément d’un « groupe » de familles ;
        13-lslf-rel.csv contient l’ensemble de liens de FL entre lexies individuelles.
        """

        handler = LexicalFunctionHandler()
        flex = handler.parse("%s/12-lslf-model.xml" % path)
        rels = readcsv(path, "13-lslf-rel.csv")

        # TODO


        
        # POST Edges

        self.info(" *  POSTING %s edges" % len(edges) ) 
        for e in bot.post_edges(gid, iter(edges), extra= lambda e: e['properties']['i'] ) : 
            pass



        

        print "\n\n == DEBUG == \n\n"

        #pprint( nodes.values()[0:5])
        #pprint( [ ( n['vocable'], n['locutions']) for n in nodes.values()[:50]])
        #pprint( [ ( n['vocable'], n['gcs']) for n in nodes.values()[:50]])
        print len(nodes)
        pprint(copo)

        graph = bot.get_igraph()
        graph = prepare_graph(graph)
        print graph.summary()
        self.info("  %s " % bot.get_schema(gid))
        
        data = export_graph(graph, id_attribute='uuid')

        self.info("data length %s " % len(json.dumps(data)))
        self.info(" %s " % data.keys() )
        self.info(" %s " % data['meta'] )
        

def main():
    parser = Parser()
    parser.parse()
if __name__ == '__main__':
    sys.exit(main())