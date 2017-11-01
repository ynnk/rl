#!/usr/bin/env python
#-*- coding:utf-8 -*-

import MySQLdb
from MySQLdb import cursors

from reliure.types import GenericType
from reliure.types import Text, Numeric, Boolean
from reliure.pipeline import Optionable


def QueryUnit(**kwargs):
    default = {
        'prefix'  : '',
        'name'   : '',
        'subscript'  : '',
        'superscript'  : '',
        'num'  : ''
    }
    default.update(kwargs)
    return default


class ComplexQuery(GenericType):
    """ Lexnet query type, basicly a list of :class:`QueryUnit`
    
    >>> qtype = ComplexQuery()
    >>> qtype.parse("*se*casser*v*1*II:2")
    [{'prefix': 'se', 'name': 'casser', 'subscript': 'v', 'superscript': '1', 'num': 'II', 'boost':2}]
    """
    def parse(self, value):
        query = []
        if isinstance(value, basestring):
            for ele in value.split():
                ele = ele.split(':')
                if len(ele) > 1 : 
                    qunit["boost"] = ele[1]
                else : 
                    qunit["boost"] = 1
                    
                ele = ele[0].strip().split("*")
                qunit = {}
                qunit["prefix"] = ele[0]
                qunit["name"] = ele[1]
                qunit["subscript"] = ele[2]
                qunit["superscript"] = ele[3]
                qunit["num"] = ele[4]
                query.append(QueryUnit(**qunit))
        else:
            query = [
                QueryUnit(**{k:v for k,v in val.iteritems() if v is not None})
                for val in value
            ]
        return query

    @staticmethod
    def serialize(complexquery):
        uri = ";".join([  '*'.join( ( 
            q['prefix'], 
            q['name'],
            q['subscript'],
            q['superscript'], 
            q['num']
        ) ) for q in complexquery ])
#        print "uri : %s" % uri
        return {
            'units': complexquery,
            'uri': uri
       }




class VtxMatch(Optionable):
    """ Extract a list of weighted vertex ids from a query string
    """
    def __init__(self, graph, case_sensitive=False, name=None):
        """
        :attr graph: the graph to search vertices in
        :arre case_sensitive: is the search case_sensitive
        """
        super(VtxMatch, self).__init__(name=name)
        self.graph = graph
        self._case_sensitive = case_sensitive
        

    @Optionable.check
    def __call__(self, query):
        pzero = {}
        
        for qunit in query:
            names = [qunit['name']]
            if not self._case_sensitive : 
                names += [qunit['name'].lower(), qunit['name'].upper(), qunit['name'].title()]
            
            if (qunit['superscript'], qunit['subscript'], qunit['num']) == ('', '', ''):
            #search form
                vs = self.graph.vs(
                    prefix = qunit['prefix'], 
                    vocable_in = names # = qunit['name']
                )
            else:
            #search lexie
                vs = self.graph.vs(
                    prefix = qunit['prefix'], 
                    vocable_in = names, 
#                    vocable = qunit['name'], 
                    superscript = qunit['superscript'], 
                    subscript = qunit['subscript'], 
                    num = qunit['num']
                )
            for v in vs: 
                pzero[v.index] = qunit['boost']
#                print "PO ELEM: "
 #               print "prefix: %s" % v['prefix']
 #               print "name: %s" % v['vocable']
 #               print "superscript: %s" % v['superscript']
#                print "subscript: %s" % v['subscript']
#                print "num: %s" % v['num']

        return pzero




def complete(text, gkey, size=100):
    """ auto complete helper to find matching candidates 
    :param text: text to search candidates
    :param graph: graph key to search candidates in the correct database
    """
    group = "client%s_local_w" % gkey
    db = LexnetDB(my_group=group)
     
    res = db.suggest(text)
    
    response = { 'text':text, 'length': len(res), 'complete': res, 'size' : size }
    
    return response

#DB API
class LexnetDB(object):
    """ API to request the Relief database
    """
    def __init__(self, cnf_file = "./.my.cnf", my_group="fr_local_client"):
        """ Init:
        @param cnf_file: path to the file containing mysql connexion data
        @param my_group: selected .my.cnf file's group
        """
        
        charset = "utf8"
            
        self._db=MySQLdb.connect(read_default_file=cnf_file, read_default_group=my_group, charset=charset, cursorclass=cursors.DictCursor)

    def suggest(self, text, max=20):
        """ select and return proposition for completion
        """
        c = self._db.cursor()
        query = """SELECT prefix, name, subscript, superscript, num
                    FROM complete_lexies
                    WHERE name like '%s%s'
                    ORDER BY name ASC, prefix ASC, subscript ASC, superscript ASC, num ASC
                    LIMIT %d
                    """ % (text, "%", max)
#        print query
        c.execute(query)
        completion = []
        #form in order to add row with name only when a new form has come
        form = {'prefix' : '', 'name': '', 'superscript':None, 'subscript':None, 'num':None}
        for row in c:
            if  row['name'] != form['name'] or row['prefix'] != form['prefix']:
#                print "dedans %s" % form['name']
                form['prefix'] = row['prefix']
                form['name'] = row['name']
#                if row['superscript'] not in ('', None) and row['subscript'] not in ('', None) and row['num'] not in ('', None):
#                print "1 %s" % row['prefix']
#                print "2 %s" % row['name']
#                print "3 %s" % row['superscript']
#                print "4 %s" % row['subscript']
#                print "5 %s" % row['num']
                if not (row['superscript'] in ('', None) and row['subscript'] in ('', None) and row['num'] in ('', None)):
                    completion.append(form.copy())
            
            completion.append(row)
        c.close()
        
        return completion
