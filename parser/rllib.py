import igraph

import sqlite3
   
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    #d['subscript'] = ""
    #d['superscript'] = ""
    return d


    
def complete(search, db, limit=20):

    c = db.cursor()

    c.execute( "select  uuid, entry, name, lexnum as num , prefix, subscript, superscript from complete where name like ? ORDER BY name asc, lexnum asc limit ?", ( search+'%',limit) )
    rows =  c.fetchall()
    return rows

    
def complete_id(search, db):

    c = db.cursor()
    c.execute( "select  uuid, entry, name, lexnum as num , prefix, subscript, superscript from complete where entry=? ORDER BY name asc, lexnum asc", ( search, ) )
    rows =  c.fetchall()
    return rows

    
def complete_uuids(item, db, limit=20):

    db.row_factory = dict_factory
    c = db.cursor()
    
    args = [ item.get(e) for e in ['prefix', 'name', 'subscript', 'superscript', 'num'] ]
    args += [limit]
    c.execute( "select  uuid, entry, name , lexnum as num , prefix, subscript, superscript from complete where prefix = ? and name = ? and subscript = ? and superscript = ? and num = ? ORDER BY name asc, lexnum asc limit ?", tuple(args) )
    rows = c.fetchall()

    if len(rows) == 0 :
        c.execute( "select  uuid, entry, name , lexnum as num , prefix, subscript, superscript from complete where name = ? ORDER BY name asc, lexnum asc limit ?", ( item.get('name'), limit) )
        rows = c.fetchall() 
        
    return rows
    

def igraph2dict(graph, exclude_gattrs=[], exclude_vattrs=[], exclude_eattrs=[], id_attribute=None):
    """ Transform a graph (igraph graph) to a dictionary
    to send it to template (or json)
    
    :param graph: the graph to transform
    :type graph: :class:`igraph.Graph`
    :param exclude_gattrs: graph attributes to exclude (TODO)
    :param exclude_vattrs: vertex attributes to exclude (TODO)
    :param exclude_eattrs: edges attributes to exclude (TODO)
    """
        
    # some check
    assert isinstance(graph, igraph.Graph)
    if 'id' in graph.vs.attributes():
        raise ValueError("The graph already have a vertex attribute 'id'")

    # create the graph dict
    attrs = { k : graph[k] for k in graph.attributes()}
    d = {}
    d['vs'] = []
    d['es'] = []
    
    # attributs of the graph
    if 'nodetypes' in attrs : 
        d['nodetypes']  = attrs.pop('nodetypes')
    if 'edgetypes' in attrs : 
        d['edgetypes']  = attrs.pop('edgetypes')
    
    if 'properties' in attrs:
        d['properties'] = attrs.pop('properties', {})

    if 'meta' in attrs:
        d['meta'] = attrs.pop('meta', {})
        d['meta'].update( {
            'directed' : graph.is_directed(), 
            'bipartite' : 'type' in graph.vs and graph.is_bipartite(),
            'e_attrs' : sorted(graph.es.attribute_names()),
            'v_attrs' : sorted( [ attr for attr in graph.vs.attribute_names() if not attr.startswith('_')])
            })

    # vertices
    v_idx = { }
    for vid, vtx in enumerate(graph.vs):
        vertex = vtx.attributes()
        if id_attribute is not None:
            v_idx[vid] = vertex[id_attribute]
        else:
            v_idx[vid] = vid
            vertex["id"] = vid

        d['vs'].append(vertex)

    # edges
    _getvid = lambda vtxid : v_idx[vtxid] if id_attribute else vtxid 

    for edg in graph.es:
        edge = edg.attributes() # recopie tous les attributs
        edge["source"] = v_idx[edg.source] # match with 'id' vertex attributs
        edge["target"] = v_idx[edg.target]
        #TODO check il n'y a pas de 's' 't' dans attr
        d['es'].append(edge)

    return d

def prepare_graph(graph):

    if 'nodetype' not in graph.vs.attribute_names():
        graph.vs['nodetype'] = [ "T" for e in graph.vs ]
    if 'uuid' not in graph.vs.attribute_names():
        graph.vs['uuid'] = range(len(graph.vs))
    if 'properties' not in graph.vs.attribute_names():
        props = [ {  }  for i in range(len(graph.vs))]
        attrs = graph.vs.attribute_names()
        
        for p,v  in zip(props, graph.vs):
            for e in attrs:
                if e not in ['nodetype', 'uuid', 'properties' ]  :
                    p[e] = v[e]
            if 'label' not in attrs:
                p['label']  = v.index
                
        graph.vs['properties'] = props
            

    if 'edgetype' not in graph.es.attribute_names():
        graph.es['edgetype'] = [ "T" for e in graph.es ]
    if 'uuid' not in graph.es.attribute_names():
        graph.es['uuid'] = range(len(graph.es))
    if 'weight' not in graph.es.attribute_names():
        graph.es['weight'] = [1. for e in graph.es ]
    if 'properties' not in graph.es.attribute_names():
        props = [ {  }  for i in range(len(graph.es))]
        attrs = graph.es.attribute_names()
        
        for p,v  in zip(props, graph.es):
            for e in attrs:
                if e not in ['edgetype', 'uuid', 'properties' ]  :
                    p[e] = v[e]
            if 'label' not in attrs:
                p['label']  = v.index
                
        graph.es['properties'] = props

    return graph


def export_graph(graph, exclude_gattrs=[], exclude_vattrs=[], exclude_eattrs=[], id_attribute=None):
    return  igraph2dict(graph, exclude_gattrs, exclude_vattrs, exclude_eattrs, id_attribute)    
