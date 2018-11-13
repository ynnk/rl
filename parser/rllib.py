import sqlite3
import json
   
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    #d['subscript'] = ""
    #d['superscript'] = ""
    return d

    
def complete(search, db, prefix=False, limit=20, accents=True):
    db.row_factory = dict_factory
    c = db.cursor()

    query = ["SELECT  name, name_ascii, entry_id FROM complete ",
             "WHERE name like ? " + (" and prefix != '' " if prefix else "") ,
             "GROUP BY entry_id ORDER BY lower(name_ascii)  LIMIT ? "
            ]
    query = " ".join(query)
    c.execute( query , ( search+'%',limit) )

    rows = c.fetchall()
    entries =  [ d['entry_id'] for d in  rows ]
    if len(entries) == 1 :
        entries = ['oooooooo'] + entries

    SELECT = "SELECT  uuid, entry_id, entry, name, name_ascii, lexnum as num, prefix, subscript, superscript from complete"
    WHERE =  " WHERE entry_id IN  {}".format(str(tuple(entries)))
    ORDER =  " ORDER BY lower(name_ascii), length(name), prefix, subscript, superscript, cast(lexnum as integer) asc , lexnum asc ";
    
    c.execute( "%s %s %s " % (SELECT , WHERE, ORDER) )
    rows =  c.fetchall()
    return rows

    
def complete_id(search, db):

    c = db.cursor()    
    c.execute( "select  uuid, entry_id, entry, name, lexnum as num , prefix, subscript, superscript from complete where entry=? ORDER BY name asc, lexnum asc", ( search, ) )
    rows =  c.fetchall()
    return rows

    
def complete_uuids(item, db, limit=50):

    db.row_factory = dict_factory
    c = db.cursor()
    
    args = [ item.get(e) for e in ['prefix', 'name', 'subscript', 'superscript', 'num'] ]
    args += [limit]
    c.execute( "select  uuid, entry_id, entry, name , lexnum as num , prefix, subscript, superscript from complete where prefix = ? and name = ? and subscript = ? and superscript = ? and num = ? ORDER BY name asc, lexnum asc limit ?", tuple(args) )
    rows = c.fetchall()


    if len(rows) == 0 :
        if len(args[2]):
            c.execute( "select  uuid,  entry_id, entry, name , lexnum as num , prefix, subscript, superscript from complete where name = ? and subscript = ? ORDER BY name asc, lexnum asc limit ?", ( item.get('name'),item.get('subscript'), limit) )
        else:
            c.execute( "select  uuid,  entry_id, entry, name , lexnum as num , prefix, subscript, superscript from complete where name = ? ORDER BY name asc, lexnum asc limit ?", ( item.get('name'), limit) )
        rows = c.fetchall() 
        
    return rows
    
