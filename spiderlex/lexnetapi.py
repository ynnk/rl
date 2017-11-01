#!/usr/bin/env python
#-*- coding:utf-8 -*-

from flask import request, jsonify

import igraph

from reliure.types import GenericType, Text, Numeric
from reliure.web import ReliureAPI, EngineView, ComponentView, RemoteApi
from reliure.pipeline import Optionable, Composable

from cello.graphs import export_graph, IN, OUT, ALL
from cello.layout import export_layout
from cello.clustering import export_clustering

import lexnet
from lexnet import ComplexQuery
from lexnet import QueryUnit as Query

def LexnetApi(name, graphs):
    """ API over lexnet
    :param graphs: list of (key/path) for each graphs defined in the app
    :type  graphs: list
    """

    print "api name", name
    api = ReliureAPI(name)
    
    ## build and register the CELLO APIs
    for gkey, graph_path in graphs.items():
        print "%s / %s" % (gkey, graph_path)
        sview = lexnet_sview(graph_path)
        api.register_view(sview, url_prefix="%s" % gkey)
        # Add auto completion View
        completion = LexnetComplete(gkey=gkey, size=20)
        completion_view = ComponentView(completion)
        completion_view.add_input("name")
        completion_view.add_output("response")
        completion_view.play_route("<name>")
        api.register_view(completion_view, url_prefix="%s_complete" % gkey)



    return api
    
def lexnet_sview(graph_path):
    """ Build the Cello/Lexnet API over a graph
    """
    # use default engine in cello_guardian.py
    engine = lexical_graph_engine(graph_path)

    # build the API from this engine
    sview = EngineView(engine)
    sview.set_input_type(ComplexQuery())
    sview.add_output("query", ComplexQuery())
    sview.add_output("graph", export_graph)
    sview.add_output("layout", export_layout)
    sview.add_output("clusters", export_clustering)

    return sview

def lexical_graph_engine(graph_path):
    """ Return a default engine over a lexical graph
    """
    from reliure.engine import Engine
    
    # setup
    engine = Engine()
    engine.requires("search", "clustering", "labelling", "layout")
    engine.search.setup(in_name="query", out_name="graph")
    engine.clustering.setup(in_name="graph", out_name="clusters")
    engine.labelling.setup(in_name="clusters", out_name="clusters", hidden=True)
    engine.layout.setup(in_name="graph", out_name="layout")

    ## Search
    from cello.graphs.extraction import VtxMatch, ProxMarkovExtractionGlobal, VertexIds
    from lexnet import VtxMatch
    from cello.graphs.builder import Subgraph

    # Load the graph
    print "loading graph %s" % graph_path 
    graph = igraph.read(graph_path)
    #HACK remove the "id" attribute (if any), it enter in conflict when exporting subgraphs to client
    if 'id' in graph.vs.attributes():
        del graph.vs['id']
    graph_search = VtxMatch(graph, case_sensitive = False)
    graph_search |= ProxMarkovExtractionGlobal(graph, default_mode=ALL, weight="weight")
#    graph_search |= ProxMarkovExtractionGlobal(graph, default_mode=ALL)
    graph_search |= Subgraph(graph, score_attr="prox")
    #TODO: add better color to vtx
    from cello.graphs.transform import VtxAttr
    graph_search |= VtxAttr(color=[(130, 130, 130), ])

    graph_search.change_option_default("vcount", 30)
    graph_search.name = "ProxSearch"
    engine.search.set(graph_search)

    ## Clustering
    from cello.graphs.transform import RemoveWeight
    from cello.clustering.common import Infomap, Walktrap
    from cello.clustering.filter import OtherInMisc
    #RMQ infomap veux un pds, donc on en ajoute un bidon s'il n'y en a pas
    walktrap = RemoveWeight(weight="weight") | Walktrap() | OtherInMisc()
    walktrap.name = "Walktrap"
    infomap = RemoveWeight(weight="weight") | Infomap() | OtherInMisc()
    infomap.name = "Infomap"
    engine.clustering.set(walktrap, infomap)

    ## Labelling
    from cello.clustering.labelling.model import Label
    from cello.clustering.labelling.basic import VertexAsLabel
    engine.labelling.set(VertexAsLabel(lambda graph, cluster, vtx: Label(vtx["label"], role="default")))

    ## Layout
    from cello.layout.simple import KamadaKawaiLayout
    from cello.layout.proxlayout import ProxLayoutRandomProj
    from cello.layout.proxlayout import ProxLayoutPCA
    from cello.layout.transform import Shaker
    
    prox_layout = ProxLayoutPCA(dim=3) | Shaker()
    prox_layout.name = "Prox"
    kamada_layout = KamadaKawaiLayout(dim=3)    
    kamada_layout.name = "KamadaKawai"
    
    engine.layout.set(
        prox_layout,
        kamada_layout
    )
    return engine

class LexnetComplete(Optionable):
    """ auto complete helper to find matching candidates 
    
    Usage exemple:
    >>> completion = LexnetComplete()
    
    Options:
    >>> completion.print_options()
    size (Numeric, default=10): Max number of propositions
    gkey key to access to the db
    """
    def __init__(self, gkey='fr', size=10):
        """
        :param size: default value for options 'size'
        """
        super(LexnetComplete, self).__init__()
        self.add_option("size", Numeric(
            vtype=int, min=0, max=300, default=size,
            help="Max number of propositions"
        ))
        
#        self.add_option("gkey", Text(
#            default=gkey,
#            help="Key of the graph to access to the corresponding database"
#        ))
        self._gkey = gkey

    @Optionable.check
    def __call__(self, name, gkey=None, size=None):
        """
        recursive call to tmuse.complete until text match suggestion
        removing last character during each call
        """
        response = {}
        params = dict(size=size)
        
        text = name or ""
        
        while len(text) and response.get('length',0) == 0 :
            self._logger.debug("Ask completion, text=%s" % (text))
            response = lexnet.complete(text, self._gkey, **params )
            text = text[:-1]

        return response

