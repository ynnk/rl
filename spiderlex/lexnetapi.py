#!/usr/bin/env python
#-*- coding:utf-8 -*-

from flask import request, jsonify

import igraph

from reliure.types import GenericType, Text, Numeric, Boolean
from reliure.web import ReliureAPI, EngineView, ComponentView, RemoteApi
from reliure.pipeline import Optionable, Composable
from reliure.engine import Engine

from cello.graphs import export_graph, IN, OUT, ALL
from cello.graphs.prox import ProxSubgraph, ProxExtract

from cello.layout import export_layout
from cello.clustering import export_clustering

from botapad.utils import export_graph
from pdgapi.explor import ComplexQuery, AdditiveNodes, NodeExpandQuery, layout_api, clustering_api


def explore_engine(graphdb):
    """ Prox engine """
    # setup
    engine = Engine("graph")
    engine.graph.setup(in_name="request", out_name="graph")

    ## Search
    @Composable
    def get_graph(query, **kwargs):
        gid = query['graph']
        graph = graphdb.get_graph(gid)
        return graph
        
    @Composable
    def subgraph(query, cut=50, weighted=True, length=3, mode=ALL, add_loops=False, ):

        graph = get_graph(query)

        uuids = { v['uuid'] : v.index for v in graph.vs }
        pz = [ q for q in query['units']]
        pz = [ uuids[p] for p in pz ]
        
        extract = ProxExtract()
        vs = []
        for u in pz:
            s = extract(graph, pzeros=[u], weighted=weighted,mode=mode, cut=cut, length=length)
            vs = pz + vs + list(s.keys())

        return graph.subgraph(vs)

    from cello.graphs.transform import VtxAttr
    
    searchs = []
    for k,w,l,m,n  in [
              (u"Espaces_sémantiques", True, 3, OUT,30 ),
              (u"Espaces_sémantiques_élargis", True, 4, OUT,50 ),
              (u"Espaces_lexicaux", False, 3, OUT, 30 ),
              (u"Espaces_lexicaux_élargis", False, 4, OUT, 50 )]:
                  
        search = Optionable("GraphSearch")
        search._func = subgraph
        search.add_option("weighted", Boolean(default=w))
        search.add_option("add_loops", Boolean(default=True, help="add loops on vertices"))
        search.add_option("mode", Numeric(choices=[ IN, OUT, ALL], default=m, help="edge directions"))
        search.add_option("length", Numeric( vtype=int, min=1, default=l))
        search.add_option("cut", Numeric( vtype=int, min=2, default=n))
        
        search |= VtxAttr(color=[(45, 200, 34), ])
        search |= VtxAttr(type=1)

        search.name = k
        searchs.append(search)

    sglobal = Composable(get_graph) | ProxSubgraph()
    sglobal.name = "Global"
    #searchs.append(sglobal)

    engine.graph.set( *searchs )

    return engine


def graph2dict(graph, **kwargs):

    g = export_graph(graph, **kwargs )
    
    # export types on ly if in es/vs
    t = set([ v['nodetype'] for v in  g.get('vs',[])])
    g['nodetypes'] = [ e for e in g['nodetypes'] if e['uuid'] in t ]
    t = set([ v['edgetype'] for v in  g.get('es',[])])
    g['edgetypes'] = [ e for e in g['edgetypes'] if e['uuid'] in t ]

    return g
    
def explore_api(engines, graphdb):
    #explor_api = explor.explore_api("xplor", graphdb, engines)
    api = ReliureAPI("xplor",expose_route=False)

    # prox search returns graph only
    view = EngineView(explore_engine(graphdb))
    view.set_input_type(ComplexQuery())
    view.add_output("request", ComplexQuery())
    view.add_output("graph", graph2dict, id_attribute='uuid')

    api.register_view(view, url_prefix="explore")

    # prox expand returns [(node,score), ...]
    view = EngineView(engines.expand_prox_engine(graphdb))
    view.set_input_type(NodeExpandQuery())
    view.add_output("scores", lambda x:x)

    api.register_view(view, url_prefix="expand_px")

    # additive search
    view = EngineView(engines.additive_nodes_engine(graphdb))
    view.set_input_type(AdditiveNodes())
    view.add_output("graph", graph2dict, id_attribute='uuid'  )

    api.register_view(view, url_prefix="additive_nodes")

    #layout
    api = layout_api(engines, api)
    #clustering
    api = clustering_api(engines, api)

    return api
