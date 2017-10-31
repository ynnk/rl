/* Models */

define(['underscore','backbone', 'cello'],    function(_,Backbone, Cello) {
  
    var Models = {};

    /* Query */
    Models.LexnetQueryUnit = Backbone.Model.extend({
        defaults: {
            prefix: null,    // name of the graph
            name: null,
            subscript: null,
            superscript: null,
            num: null,
            boost: 1,
            // surface attr
            valid: false,
        },

        initialize: function(){
            // validate on each change
            this.on("change:prefix change:superscript change:subscript change:num", this.validate);
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
            return this.models.map(function(qunit){ return qunit.to_string() }).join("; ");
        },

        validate: function(){
            uuids = this.models.filter(function(unit){ return unit.get('uuid')  });
            var res = this.length > 0 && this.length == uuids.length;
            if (!res)
                this.request_uuids();
            return res;
        },

        request_uuids: function(){
             var _this = this;
             params = _.map( this.models ,
                    function(e){
                         console.log(e)
                        var k = ['prefix', 'name', 'subscript', 'superscript', 'num']
                        var v = _.map(k, function(ke){ return e.get(ke) });
                        return _.object(k,v);
                    }
                );
             if (params.length) {
                 $.ajax({
                    url: this.url + this.to_string(),
                    success: function(r){
                        _this.reset_from_models( r.results.response.complete );
                      }
                        
                  });
            }
        },

        export_for_engine: function(){
            return this.toJSON();
        },
        
    });
    
    return Models;
});

