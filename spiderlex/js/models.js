/* Models */

define(['underscore','backbone', 'cello', 'embed'],    function(_,Backbone, Cello, App) {
  
    var Models = {};

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
                }
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
