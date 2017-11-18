/* Models */

define(['underscore','backbone', 'cello', 'embed'],    function(_,Backbone, Cello, App) {
  
    var Models = {};

    Models.EdgeType = Cello.EdgeType.extend({

    parse_label: function(){

            var label = this.label;
            
            var token = label.substring(label.indexOf('/') + 1);
            var splitted_token = token.split("_");
            
            var e = {};
            e.family = label.indexOf('/') >= 0 ? label.substring(0,label.indexOf('/')) : "";
            e.name =  splitted_token[0].trim();
            e.subscript = "";
            e.superscript = "";
            e.combination = "";

            if (splitted_token.length > 1){
                splitted_token = splitted_token[1].split("^");
                if (splitted_token.length >= 1) e.subscript = splitted_token[0].trim();
                if (splitted_token.length > 1) e.superscript = splitted_token[1].trim();
            }

            //if ( (index + 1) < label_combination.length )
                //e.combination = "&";  

            return e;
        }

    });
    
    Models.Edge = App.Models.Edge.extend({
    
        initialize : function(attrs, options){
            App.Models.Edge.__super__.initialize.apply(this, arguments);

            var lexlinks = new Backbone.Collection( _.filter( this.collection.between( this.source, this.target ), function(e){
                return false
            }));

            this.lexlinks = lexlinks;

        },
        
    },{ // !! static not in the same brackets !!
    active_flags : ['intersected', 'faded', 'selected']
});
            
    Models.Vertex = App.Models.Vertex.extend(
            {
            
                initialize : function(attrs, options){
                    App.Models.Vertex.__super__.initialize.apply(this, arguments);                    
//                    Cello.get(this, "formatted_definiens");
                    //var lfs = new Backbone.Collection();
                    //lfs.comparator = 'position';
                    //lfs.reset(_(attrs.lfs).toArray());
                    //this.set('lfs', lfs);

                    this.add_flag('form');
                    
                    this.on('addflag:pzero', function(){
                        this.remove_flag('form');
                    });
                },

                fetch_neighbors(success){

                    var self = this;
                    var url_root = this.url() ;

                    $.ajax({
                      url:`${url_root}/neighbors`,
                      type:"POST",
                      data:JSON.stringify({
                              start:0
                          }),
                      contentType:"application/json; charset=utf-8",
                      dataType:"json",
                      success: success              
                    })

                },

                
                _format_label : function(){
            
                    var formatted_label = [];
                    var num = this.properties.get('num');
                    var prefix = this.properties.get('prefix');
                    var vocable = this.properties.get('vocable');
                    var subscript = this.properties.get('subscript');
                    var superscript = this.properties.get('superscript');
                    
                    //prefix
                    if( prefix && prefix.length ){
                        formatted_label.push( {form : prefix, css : ".normal-font"});
                    }
                    //name
                    if( vocable && vocable.length ){
                        formatted_label.push( {form : vocable, css : ".normal-font"});
                    }
                    //subscript
                    if( subscript && subscript.length ){
                        formatted_label.push( {form : subscript, css : ".subscript-font"});
                    }
                    //superscript
                    if( superscript && superscript.length ){
                        formatted_label.push( {form : superscript, css : ".superscript-font"});
                    }
                    //number
                    if( num && num.length ){
                        formatted_label.push( {form : num, css : ".num-font"});
                    }
                    
                    return formatted_label;
                },

                toString: function(){
                    var str = [];
                    //TODO: Cello.get !
                    //TODO loop on graph, lang, pos
                    str.push(this.properties.get("prefix") || "");
                    str.push(this.properties.get("vocable"));
                    str.push(this.properties.get("subscript")  || "");
                    str.push(this.properties.get("superscript")  || "");
                    str.push(this.properties.get("num")  || "");

                    return str.join("*");
                },
                
            }) ;

    /* Query */
    Models.LexnetQueryUnit = Backbone.Model.extend({
        defaults: {
            prefix: null,    // name of the graph
            name: null,
            subscript: null,
            superscript: null,
            num: null,
            entry: null,
            boost: 1,
            // surface attr
            valid: false,
        },

        initialize: function(){
            // validate on each change
            this.on("change:id change:prefix change:superscript change:subscript change:num", this.validate);
        },

        /* Set the Query unit from a raw string, 
         * ex 
         *  * "se*casser*v*1*II"
         *  * "*causer**1*a"
         *  * "*apporter***II
        */
        //TODO: add boost parsing ("fr.V.manger:50")
        set_from_str: function(query_str){
            var qsplit = query_str.trim().split("*");
            data = {}
            data.prefix = qsplit[0];
            data.name = qsplit[1];
            data.subscript = qsplit[2];
            data.superscript = qsplit[3];
            data.num = qsplit[4];
            console.log(data)
            this.set(data);
        },

        

        to_string: function(){
            var str = [];
            //TODO: Cello.get !
            //TODO loop on graph, lang, pos
            str.push(this.get("prefix") || "");
            str.push(this.get("name"));
            str.push(this.get("subscript")  || "");
            str.push(this.get("superscript")  || "");
            str.push(this.get("num")  || "");

            str = str.join("*")
            if(this.get("boost") != 1.){
                str = str + ":" + this.get("boost");
            }
            return str;
        },

        /* Ajax call to check if this query unit exist (and so is valid)
        */
        validate: function() {
            //TODO
        },
    });

    Models.LexnetQueryUnits = Backbone.Collection.extend({
        model: Models.LexnetQueryUnit,

        reset_from_models: function(models){
            if ( _.isArray(models) === false  ){
                models = [models]
            }
            
            var data = [];
            _.each(models, function(model){
                attrs = _.pick(model, 'prefix', 'name', 'subscript', 'superscript', 'num', 'uuid', 'entry')
                var query_elem = new Models.LexnetQueryUnit(attrs);
                data.push(query_elem);
            });
            this.reset(data);
            
        },

        reset_ids_from_str: function(query_str){
            var data = [];
            var qsplit = query_str.split(";");
            _.each(qsplit, function(qstr){
                var el = new Models.LexnetQueryUnit();
                el.set('entry', qstr);
                data.push(el);
            });
            this.reset(data);

        },
        /* Reset the QueryUnit collection from a raw string, ex "se*casser*v*1*II;*apporter***II"
        */
        reset_from_str: function(query_str){
            console.log("query : " +query_str);
            var data = [];
            var qsplit = query_str.split(";");
            _.each(qsplit, function(qstr){
                var query_elem = new Models.LexnetQueryUnit();
                query_elem.set_from_str(qstr);
                data.push(query_elem);
            });
            this.reset(data);
        },

        to_string: function(){
            return this.models.map(function(qunit){ return qunit.to_string() }).join(";");
        },

        validate: function(){
            uuids = this.models.filter(function(unit){ return unit.get('uuid')  });
            var res = this.length > 0 && this.length == uuids.length;
            if (!res)
                this.request_uuids();
            return res;
        },

        request_uuids: function(){
            var _this = this
             
            var uuidsrequired = _.any( this.models ,
                function(e){
                    return !(e.get('entry') && e.get('entry').length > 0); 
                }
            );
                
            if (uuidsrequired) {
                url = this.url + "/uuids/" + this.to_string();
            }
            else {
                var params = _.map( this.models ,
                    function(e){
                         console.log(e)
                        var k = ['prefix', 'name', 'subscript', 'superscript', 'num', 'entry']
                        var v = _.map(k, function(ke){ return e.get(ke) });
                        return _.object(k,v);
                    }
                );
                var ids = _.map(params, function(v){ return v['entry'] });
                url = this.url + "/id/" + ids.join(';');
            }
            
            $.ajax({
                url: url,
                success: function(r){
                    _this.reset_from_models( r.results.response.complete );
                  }
            });
        },

        export_for_engine: function(){
            return this.toJSON();
        },
        
    });
    
    return Models;
});

