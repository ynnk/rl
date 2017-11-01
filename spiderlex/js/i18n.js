//i18n.js



define([],    function() {
  
  var I18N = {

    'fr' : {
        'graph'     : 'Graph',
        'lexlinks'  : 'Liens lexicaux',
        'clusters'  : 'Clusters',
        'dict'      : 'Dictionnaire',
    },
    
    'en' : {},
    
    }


  return function(lang){
    
    return {
            get : function(key){
                var v = k in i18n ? i18n[k] : k;
                if ( v == "" ) v = k;
                return v;
                
            }
        }
  }

  });

