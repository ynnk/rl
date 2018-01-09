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

from pdgapi.explor import ComplexQuery, AdditiveNodes, NodeExpandQuery, export_graph, layout_api, clustering_api



def explore_engine(graphdb):
    """ Prox engine """
    # setup
    engine = Engine("graph")
    engine.graph.setup(in_name="request", out_name="graph")

    ## Search
    
    def subgraph(query, cut=50, weighted=True, length=3):

        print (query, cut, weighted, length)

        gid = query['graph']
        graph = graphdb.get_graph(gid)
        uuids = { v['uuid'] : v.index for v in graph.vs }
        pz = [ q for q in query['units']]
        pz = [ uuids[p] for p in pz ]

        extract = ProxExtract()
        vs = []
        for u in pz:
            s = extract(graph, pzeros=[u], weighted=weighted, cut=cut, length=length)
            vs = vs + s.keys()

        return graph.subgraph(vs)

    from cello.graphs.transform import VtxAttr
    graph_search = Optionable("GraphSearch")
    graph_search._func = Composable(subgraph)
    graph_search.add_option("weighted", Boolean( default=True))
    graph_search.add_option("length", Numeric( vtype=int, min=1, default=3))
    graph_search.add_option("cut", Numeric( vtype=int, min=2, default=50))
    
    graph_search |= VtxAttr(color=[(45, 200, 34), ])
    graph_search |= VtxAttr(type=1)

    graph_search.name = u"Espaces_sémantiques"

    engine.graph.set(graph_search)
    return engine


def explore_api(engines, graphdb):
    #explor_api = explor.explore_api("xplor", graphdb, engines)
    api = ReliureAPI("xplor",expose_route=False)

    # prox search returns graph only
    view = EngineView(explore_engine(graphdb))
    view.set_input_type(ComplexQuery())
    view.add_output("request", ComplexQuery())
    view.add_output("graph", export_graph, id_attribute='uuid')

    api.register_view(view, url_prefix="explore")

    # prox expand returns [(node,score), ...]
    view = EngineView(engines.expand_prox_engine(graphdb))
    view.set_input_type(NodeExpandQuery())
    view.add_output("scores", lambda x:x)

    api.register_view(view, url_prefix="expand_px")

    # additive search
    view = EngineView(engines.additive_nodes_engine(graphdb))
    view.set_input_type(AdditiveNodes())
    view.add_output("graph", export_graph, id_attribute='uuid'  )

    api.register_view(view, url_prefix="additive_nodes")

    #layout
    api = layout_api(engines, api)
    #clustering
    api = clustering_api(engines, api)

    return api