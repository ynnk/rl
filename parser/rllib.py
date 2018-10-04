import sqlite3
   
def dict_factory(cursor, row):
    d = {}
    for idx, col in enumerate(cursor.description):
        d[col[0]] = row[idx]
    #d['subscript'] = ""
    #d['superscript'] = ""
    return d

    
def complete(search, db, limit=20):

    SELECT = "select  uuid, entry_id, entry, name, lexnum as num , prefix, subscript, superscript from complete where"
    ORDER = " ORDER BY name, entry_id, prefix, lexnum";

    c = db.cursor()

    c.execute( "%s name like ?  %s limit ?" % (SELECT, ORDER), ( search+'%',limit) )
    rows =  c.fetchall()
    return rows

    
def complete_id(search, db):

    c = db.cursor()    
    c.execute( "select  uuid, entry_id, entry, name, lexnum as num , prefix, subscript, superscript from complete where entry=? ORDER BY name asc, lexnum asc", ( search, ) )
    rows =  c.fetchall()
    return rows

    
def complete_uuids(item, db, limit=20):

    db.row_factory = dict_factory
    c = db.cursor()
    
    # ~ args = [ item.get(e) for e in ['prefix', 'name', 'subscript', 'superscript', 'num'] ]
    args = [ item.get(e) for e in ['prefix', 'name', 'subscript', 'superscript', 'num'] ]
    args += [limit]
    # ~ c.execute( "select  uuid, entry_id, entry, name , lexnum as num , prefix, subscript, superscript from complete where prefix = ? and name = ? and subscript = ?  ORDER BY name asc, lexnum asc limit ?", tuple(args) )
    c.execute( "select  uuid, entry_id, entry, name , lexnum as num , prefix, subscript, superscript from complete where prefix = ? and name = ? and subscript = ? and superscript = ? and num = ? ORDER BY name asc, lexnum asc limit ?", tuple(args) )
    rows = c.fetchall()

    print(args, rows)

    if len(rows) == 0 :
        c.execute( "select  uuid,  entry_id, entry, name , lexnum as num , prefix, subscript, superscript from complete where name = ? ORDER BY name asc, lexnum asc limit ?", ( item.get('name'), limit) )
        rows = c.fetchall() 
        
    return rows
    
