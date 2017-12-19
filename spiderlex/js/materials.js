!!!define(['gviz'], function(gviz) {


    Materials =  {
"edge" : [
    {"default": 
        {
        "lineWidth"  : 2,
        "opacity"    : 0.5,

        'linecap'  : "butt", // "butt", "round", "square"
        'linejoin' : "bevel",// "round", "bevel", "miter"

        'lineType' : "plain",  // plain , dashed
        'dashSize' : 2,
        'gapSize'  : 5,
        
        'color'     : function(edge){
                    var a = [gviz.hexcolor(edge.source.get('color')), gviz.hexcolor(edge.target.get('color'))]
            return a
                      }
        }
    },

    {".selected": 
        {
        "lineWidth"  : 5,
        "opacity"    : 1
        }
    },

    {".emphasized": 
        {
        "lineWidth"  : 2,
        "opacity"    : 1,
        "color"      : "#62FF00"
        }
     },
    {".unactive": 
        {
        "opacity" : 0.1
        }
    },
    {".unactive_nodes": 
        {
        "opacity" : 0.1
        }
    },
    
    {".intersected": {
        "lineWidth"  : 4,

        } },
    

    {  '.disabled': {
            'lineWidth'  : 1,
            'opacity'    : 0.,
            'label_visible' : false,
            'orientation_visible' : false,
        }
    },

    {".es-bolder": 
        {
        "lineWidth"  : 3,
        }
    },

    { '.es-mo-faded': {
        'lineWidth'  : 1,
        'opacity'    : 0.2,
      }
    },

    { '.es-sel-faded': {
        'lineWidth'  : 1,
        'opacity'    : 0.2,
        
      }
    },


    { '.es-mo-adjacent': {
            'lineWidth'  : 3,
            'opacity'    : 0.8,
            //'label_visible' : true,
            //'orientation_visible' : true,
            'lineType' : "plain",
        }
    },

    { '.es-sel-adjacent': {
            'lineWidth'  : 5,
            'opacity'    : 0.8,
            'label_visible' : false,
            //'orientation_visible' : true,
        }
    },

],

"node" : [
    {".normal-font" : 
        {
        "font" : "normal 10px sans",
        "fontFillStyle" : "#333",  
        "paddingRelY" : 4,
        "paddingRelX" : 2,
        "fontStrokeWidth": 0.2
        }
    },
    
    {".subscript-font" : 
        {
        "font" : "normal 6px sans",
        "fontFillStyle" : "#333", 
        //"paddingRelY" : 6,
        "paddingRelX" : 4,
        "fontStrokeWidth": 0.2
        }
    },

    {".superscript-font" : 
        {
        "font" : "normal 6px sans",
        "fontFillStyle" : "#333", 
        //"paddingRelY" : -4,
        "paddingRelX" : 3,
        "fontStrokeWidth": 0.2
        }
    },

    {".num-font" : 
        {
        "font" : "bold 8px Helvetica",        
        "fontFillStyle" : "#333", 
        "paddingRelY" : 4,
        "paddingRelX" : 6,
        "fontStrokeWidth": 0.2
        }
    },
    
   {".faded":
        {
        "opacity" : 0.3
        }
    },

    
    {  '.disabled': {
            'lineWidth'  : 1,
            'opacity'    : 0.,
            'label_visible' : false,
            'orientation_visible' : false,
        }
    },

    {".emphasized" :
        {
        "scale"      : 1.5,
        "lineWidth" : 0.1,
        "strokeStyle": "#666"
        }
    },

    {".intersected": 
        {
        "scale"      : 2,
        "lineWidth"  : 0.1,
        "strokeStyle": "#666"
        }
    },

    {".selected": 
        {
        "scale"      : 1.5,
        "lineWidth" : 0.2
        }
    },
    {".unactive": 
        {
        "opacity" : 0.1
        }
     },
    {".unactive_edges": 
        {
        "opacity" : 0.1
        }
     },
     
     
    { ".form": {
        "shape": "circle",
        "textAlign": "left",
        "textVerticalAlign" : 'center',
        
        "scale": 1,
        "strokeStyle": "#EEEEEE",
        "fillStyle" : "get:color",

        'fontScale'  :  0.08,
        'font' : "normal 10px sans-serif",
        'fontFillStyle'  : '#222',  //#366633',
        //'fontStrokeStyle'  : 'black',
        //'fontStrokeWidth' : 0.6,

        'textPaddingY'  : 3,
        'textPaddingX'  : 0.5,
    }},

    
    { '.form.cluster-faded': {
        'opacity'   : 0.3,
    } },
    {'.form.mo-faded': {
        'opacity'   : 0.2,
        'scale'    : 0.6,
    } },

    {'.form.sel-faded': {
        'opacity'   : 0.2,
        'scale'    : 0.8,
    } },

    {'.form.disabled': {
        'opacity'   : 0.1,
    } },

    {'.form.mo-adjacent': {
        'opacity'   : 1.,
    } },

    {'.form.sel-adjacent': {
        'opacity'   : 1,
    } },

    { '.form.cluster': {
        //'shape': 'square',
        //'scale':1,
        'opacity'   : 1,
        'fontScale'  :  0.12,
    } },

    { '.form.intersected':  {
        'fontScale'  :  0.13,
        'scale': 1.2,
        'opacity'   : 1,

    } },

    { '.form.selected':  {
        'strokeStyle'  : '#FFFFFF',
        'scale':1.,
        'opacity'   : 1,
        //'fontScale'  :  0.4,
        'paddingX': 200,
    } },

    
    { ".pzero": {
        "shape": "triangle",
        "scale":1.3,
        "strokeStyle": "#EEEEEE",
        "fontScale"  :  0.12,
        //"textPaddingY" : 15, 
        "fillStyle" : "get:color",
        "textAlign": "center",
        "textVerticalAlign": "bottom"
    }},

    { ".pzero.intersected": {
        "strokeStyle": "#AAA"
    }}
]
};



    return Materials
});
