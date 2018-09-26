CONFIG = {
    "langs" : ['fr', 'en'],

    "lnfr" : "../lnfr.picklez",
    "complete_fr" : "../completedb_fr.sqlite",
    
    "lnen" : "../lnen.picklez",
    "complete_en" : "../completedb_en.sqlite",
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
