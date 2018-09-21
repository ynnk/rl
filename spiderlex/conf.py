CONFIG = {
    "langs" : ['fr', 'en'],

    "lnfr" : "../lnfr1806.picklez",
    "complete_fr" : "../completedb_fr1806.sqlite",
    
    "lnen" : "../lnen1806.picklez",
    "complete_en" : "../completedb_en1806.sqlite",
}
        

LANGS = tuple([ lang for lang in CONFIG["langs"]])


CLIENT_CONF =  {
    'sync': "/static/rlfr.json",
    'routes' : "/engines",
    'urlRoot': "/graphs/g/",
}

MENU = {
      'fr' :{
        'graph' : 'Graphe', 
        'lexlinks' : 'Liens lexicaux', 
        'clusters' : 'Clusters', 
        'def' : 'Dictionnaire', 
      },
      'en' :{
        'graph' : 'Graph', 
        'lexlinks' : 'Lexical links', 
        'clusters' : 'Clusters', 
        'def' : 'Dictionary', 
      }
    }
