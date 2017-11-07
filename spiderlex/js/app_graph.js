//Filename: app.js

define([
  // These are path alias that we configured in our main.js
    'jquery',
    'underscore',
    'backbone',
    // cello
    'celloui',
    // lexnet 'lib' (models, materials)
    'models',
    'embed',
    //  plugins

    'autocomplete',
    'mousetrap',
    'bootbox',
    // semantic
    'semantic',
    'tagsinput'
    
], function($, _, Backbone, Cello, Models, Embed, AutoComplete,  Mousetrap, bootbox, SemUI, tagsinput) { //
    
    /** Query input & completion **/
    var QueryView = Backbone.View.extend({
        //note: the template should have an input with class 'query_input'
        template: _.template($('#query_form_tmpl').html() ),

        events: {
            'submit': 'submit',
            'drop input' : 'drop'
        },

        initialize: function(attr){
            var _this = this;
            _.bindAll(this, "render")

            /* model events */
            this.listenTo(this.model, 'add remove change reset', function(e){
                console.log("QueryView", e)
                _this.render();
                _this.submit();
            });

            /** Create the basic DOM elements **/
            /* form template */
            var data = {
                "label": "search :",
                "placeholder": "Enter a search ...",
                "submit": "search !",
            }
            this.$el.html(this.template(data));

            /* tagsinput */
            var $input = $('#searchQueryInput', this.$el);
            $input.tagsinput({
              itemValue: function(model){ return model;},
              itemText: function(model){
                return null;
              },
              tagClass: function(model){ return 'ui label'; }
            });

            $input.on('itemRemoved', function(event){
                var item = event.item;
                console.log("itemRemoved", item)
                _this.model.remove(item);
            });
            this.$input = $input;
            
            $('input').on('itemAdded', function(event) {
                  // event.item: contains the item
                  $(".bootstrap-tagsinput .label:last").prepend(
                          "<span class='normal-font'>" + (event.item.get("prefix") || '') + "</span>"
                        + "<span class='normal-font'>" + event.item.get("name") + "</span>"
                        + "<span class='subscript-font'>" + (event.item.get("subscript") || '') + "</span>"
                        + "<span class='superscript-font'>" + (event.item.get("superscript") || '') + "</span>"
                        + "<span class='num-font'>" + (event.item.get("num") || '') + "</span>"
                  );

            });

            /* completion */
            var CompletionItem = AutoComplete.ItemView.extend({
                // item completion view 
                template: _.template(""+
                         //"<span class='label label-primary'><%= graph %></span> " +
                         //"<span class='label label-primary'><%= lang %></span> " +
                         "<span class='normal-font'><%= prefix %></span>" +
                         "<span class='normal-font'><%= name %></span>" +
                         "<span class='subscript-font'><%= subscript %></span>" +
                         "<span class='superscript-font'><%= superscript %></span>" +
                         "<span class='num-font'><%= num %></span>"
                     ),

                render: function () {
                    var data = this.model.toJSON();
                    this.$el.html( this.template(data) );
                    if ( ! data.subscript && ! data.superscript && ! data.num){
                        this.$el.addClass('completion_form');
                    }else{
                        console.log( data.subscript + " " + data.superscript + " " + data.num) 
                        this.$el.addClass('completion_lexie');
                    }
                    
                    return this;
                },

                select: function () {
                    console.log("completion select ", this.model.attributes)
                    _this.model.add(new Models.LexnetQueryUnit(this.model.attributes));
                    console.log("query added: ", this.model)
                    this.parent.hide();
                    return this;
                }
            });
            
            // completion view 
            _this.querycomplete = new AutoComplete.View({
               model : app.models.completion,          // CompleteCollection
               input : this.$input.tagsinput('input'), // meta input created by tagsinput
               itemView: CompletionItem,               // item view
               queryParameter: "name",                 // options.data key for input
               minKeywordLength: 1
            });

            // append completion to the view
            $("#query_complete", this.$el).append(_this.querycomplete.render().$el);
            return this.render();
        },

        render: function(){
            var view = this;
            // clear input 
            view.$input.tagsinput('removeAll');
            // add unit as tag
            view.model.each(function(unit){
                view.$input.tagsinput('add', unit);
            });
            
            view.$input.tagsinput('input').val("");
            view.$input.tagsinput('input').focus();
            return this;
        },

        drop: function (event) {
            event.stopPropagation();
            event.preventDefault();
            var data = event.originalEvent.dataTransfer.getData("model");
            var ctrlKey = event.originalEvent.dataTransfer.getData("ctrlKey") == "true";
            
            var unit = new Models.LexnetQueryUnit();
            unit.set_from_str(data);
            if ( ctrlKey ) this.model.add(unit);
            else
                this.model.reset_from_models([unit]);
        },
        
        // exec the search
        submit: function(event){
            /* 
             * Note: returns false to avoid HTML form submit
             */
            if (event){
                event.stopPropagation(); //not always necessary
                event.preventDefault(); // this will stop the event from further propagation and the submission will not be executed
            }
            // note: this is not necessary for Chrome, but needed for FF
            this.trigger("submited")
            return false;
        },
    });
    
    /**************************************************************************/


//Extend of cluster models for lexnet
    var Cluster = Cello.Cluster.extend({
        initialize : function(attrs, options){
            Cluster.__super__.initialize.apply(this, arguments);
            _this = this;
            
            this.on("change:color", function(model, value){
                this.members.vs.each( function(vertex){
                    vertex.color = value;
                });
            });
            
            
            //add faded flag to the vs of the clusters not selected and remove faded flag to them if useful
            this.listenTo(this, "addflag:selected", function(){ 
                var other_clusters = this.collection.without(this);
                
                //if there is other selected clusters remove faded flag to its vertices
                if(this.collection.selected.length > 1 ){
                    this.members.vs.each( function(vertex){
                          vertex.remove_flag('faded');
                    });
                }
                
                _(other_clusters).each(function(cluster){
                    if (!cluster.selected) {
                        cluster.members.vs.each( function(vertex){
                          vertex.add_flag('faded');
                        });
                    }
                });
            });

            //add faded flag to the vs of the clusters not selected
            this.listenTo(this, "rmflag:selected", function(){
                //if other clusters are still selected, just remove flag faded on the vertices of the current cluster
                if( this.collection.some_selected() ){
                    this.members.vs.each( function(vertex){
                        vertex.add_flag('faded');
                    });
                }
                // else remove faded flag on the vertices of all other clusters
                else { 
                    var other_clusters = this.collection.without(this);
                    _(other_clusters).each(function(cluster){
                        cluster.members.vs.each( function(vertex){
                            vertex.remove_flag('faded');
                        });
                    });
                }
            });
        }
    });

    
    /** The app itself
     * defines models, views, and actions binding all that !
    */
    var App = Embed.Iframe.extend({
        // the main models, created in create_models()
        models: {},
        // the views, created in create_*_views()
        views: {},

        // DEBUG
        debug: false, // should be false by default else initialize can't change it

        initialize: function(options){
            App.__super__.initialize.apply(this, arguments);
            var app = this;
            app.debug = options.debug || app.debug;

            this.complete_url = options.complete_url;

            // manage debug
            Cello.DEBUG = app.debug;

            // console log  may cause performance issue on small devices
            //if(!app.debug){
                //console.log = function() {}
            //}
        },


        // state of the app;
        search_results: false, // true if some data are loaded !

        // create the models
        create_models: function(){
            
            var app = this;
            
            // completion
            
            CompleteCollection = AutoComplete.Collection.extend({
                url:app.complete_url,
                model: Backbone.Model.extend({
                        defaults : {
                            prefix: "", name: "", superscript: "", subscript: "", num: ""
                        },
                    }),
            });

            app.models.completion = new CompleteCollection({});

            // --- Clustering model ---
            // Clustering model and view
            app.models.clustering = new Cello.Clustering({ClusterModel:Cluster});
            
        },
        
        /** Create views for query and engine
         *
         * home: if true the app is setted with search input in middle of the page
         */
        create_query_engine_views: function(){

            /* explore : engine */

            var app = this;
            var searchdiv = '#query_form';
            
            app.views.userquery = new QueryView({
                model: app.models.userquery,
                el: $(searchdiv),
            }).render();
            $(searchdiv).show();
            
            // Configuration view for Cello engine
            app.views.keb = new Cello.ui.engine.Keb({
                model:app.engines.explore,
            });
            
        },
        
        /** 
         *   Create documents list views
         */
        create_results_views: function(){
            var app = this;

            var intersectnode_renderOn = function(node, event){
                if (! node.has_flag('intersected')){
                    node.add_flag('intersected');
                }
            }
            
            var intersectnode_renderOff = function(){
                if (app.gviz.model.vs.by_flag('intersected').length){
                    app.gviz.model.vs.set_intersected(null);
                }
            }
            
            //Edge tooltip
            EdgeToolTip = Cello.ui.Tooltip.extend({
                el : "#edge_tooltip",
                template :  _.template(
                    "<div class='edges'>"
                    +"<% _(edges).each( function(edge, index){ %>"
                    +   "<div class='ui centered'>"
                    +   "<a href='#' class='' >"
                    +     "<% _.each(edge.source.formatted_label, function(token){ %>"
                    +           " <span class = '<%= token.css.substring(1) %>'><%= token.form %></span>"
                    +        "<% }); %>"
                    +   "</a> &rarr;"
                    +   "<a href='#' class='' >"
                    +       "<% _.each(edge.target.formatted_label, function(token){ %>"
                    +       " <span class = '<%= token.css.substring(1) %>'><%= token.form %></span>"
                    +       "<% }); %>"
                    +   "</a>"
                    +   "</div>"
                    +   "<% edge.lexlinks.each( function(lexlink){ %>"
                    +   "<div class='ui centered familylink'>"
                    +       "<span><%= lexlink.family.label%></span>"
                    +       "<span  class = 'lexfunc'>"
                    +           "<% _.each(lexlink.formatted_label, function(token){ %>"
                    +               " <span class = '<%= token.css.substring(1) %>'><%= token.form %></span>"
                    +           "<% }); %>"
                    +       "</span>"
                    +   "</div>"
                    +   "<% }); %>"
                    +   "<% if ( index < (edges.length -1) ){ %>"
                    +      "<div class='ui divider'></div>"
                    +   "<% }%>"
                    +"<% }); %>"
                    +"</div>"
                ),
                  
                before_render : function(edge){
                    var data = {edges : [edge]}
                    var sym = edge.sym
                    if (sym) data.edges.push(sym);
                    return data;
                }
            });
            
            edge_tooltip = new EdgeToolTip({});
            
            

//CTX MENU

            var ItemMenuView  = Cello.ui.list.ListItemView.extend({
            
                className: "item small",
                tagName: "div",
                template: _.template("<div class='content'>"
                + "<span><% _.each(formatted_label, function(token){%>"
                + "<span class='<%= token.css.substring(1) %>'><%= token.form %></span><% })%>"
                + "</span>"
                + "</div>"),
                
                events: {"click >.content" : "clicked"},
                
                //add selectedd flag to the model
                clicked: function(event){
                    if ( this.model.has_flag("selected") ){
                        this.model.remove_flag("selected");
                    }else{
                        this.model.add_flag("selected");
                    }
                },
                
                initialize : function(options){
                    ItemMenuView.__super__.initialize.apply(this, arguments);
                    
                    this.listenTo(this.model, "addflag:selected", function(){ 
                        this.$el.addClass("active"); 
                    });
                    this.listenTo(this.model, "rmflag:selected", function(){ 
                        this.$el.removeClass("active"); 
                    });
                },
                
                get_data: function(){
                    var data = {};
                    if (this.model.formatted_label.length)
                        data.formatted_label = this.model.formatted_label;
                    return data
                },
                
                reset_collectionView: function() {
                    // useful to not render collections which contain a unique model with no label
                    if(this.collection.length > 1 && this.collection.at(0).label.length)
                        ItemMenuView.__super__.reset_collectionView.apply(this, arguments);
                }
                
            });
            
            var LexLinksView = Cello.ui.list.CollectionView.extend({
                tagName : "div",
                className : "ui selection list",
                ChildView : ItemMenuView
            });
            


            //CLUSTERING

            /** Create views for clustering */
            // label view
            // Note: the inheritage is not absolutely needed here, except for label overriding.
            // however if one want to add clustom events on each label it should
            // do that, so as documentation/exemple it is usefull the 'extend'.
            var ClusterVertexView = Cello.ui.clustering.ClusterMemberView.extend({
                
                className : "cvertex",
                
                events: {
                    "click": "clicked",
                    "mouseover" : "mouseover",
                    "mouseout" : "mouseout",
                },
                
                /* events sur le label, */
                mouseover: function(event){},
                mouseout: function(event){},

                clicked: function(event){
                    //note: here component "ClusterLabel" is hard linked to the app
                    // i.e. the global "app" is used !
                    // 
                    // it is acceptable here but it should not be the rule
                    // especialy if you want to mv this object in the lib
/*                    event.preventDefault();
                    if(event.ctrlKey){
                        app.navigate_to_label(this.model.formatted_label[0].form);
                    } else {
                        app.navigate_to_label(this.model.label);
                    }
*/
                    var node = this.model;
                    node.add_flag('dic');
                    app.dicNavView.add_childView(node);
                    app.dicContentView.add_childView(node);
                    $('#lndic .item:last').tab({ context: $('#lndic .dic-content')});
                    $('#dic_menu_item').click();
                    $('#lndic .item:last').click();
                },
                
                //RMQ: this computation may also be donne directly in the template
                before_render: function(model){
                    var data = {};
                    data.formatted_label = model.formatted_label;
                    
                    data.searchlabel = model.label;
                                        
                    data.size = 8 + model.score * 10;
                    return data
                },
            });
            
            //view over a list of vertices
            var ClusterVerticesView = Cello.ui.list.CollectionView.extend({
                className: "vs_list",
                ChildView: ClusterVertexView, 
            });

            // view over a cluster
            var ClusterView = Cello.ui.clustering.ClusterView.extend({
                MembersViews: {'vs': ClusterVerticesView}, 
            });

            // Cluster (label lists) view
            // Note: the list of cluster is just a classical ListView
            app.views.clusters = new Cello.ui.list.CollectionView({
                collection : app.models.clustering.clusters,
                ChildView : ClusterView
            });
            $("#clustering_items").append(app.views.clusters.render().el);
            $("#clustering_items").show(); // make it visible
            
        },

        // helper: add app attributes to global scope
        // put cello and the app in global for debugging
        _add_to_global: function(){
            var app = this;
            window.Cello = Cello;
            window.app = app;
        },

        //### actions ###

        /** when a query is loading
         *
         * Update the rooter (url) and add waiting indicator
         */
        search_loading: function(kwargs, state){
            var app = this;
            // placeholder
            app.views.userquery.$input.attr('placeholder', "          ... Loading ...");
            app.views.userquery.$el.addClass('loading');
        },


        /** when a search response arrive (in success)
         *
         */
        engine_play_completed: function(response, args, state){
            var app = this;
            if(app.debug){
                console.log("play:complete", 'args', args, 'state', state);
                app.response = response;    // juste pour le debug
            }
            //stop waiting
            app.views.userquery.$el.removeClass('loading');
            $("#loading-indicator").hide(0);
            app.views.userquery.$input.attr('placeholder', "Search");
            
            // collapse current graph viz
            if ( app.views.gviz ) {
                app.views.gviz.collapse(200);
            }

            app.update_models(response);
            //$("padagraph-collection-filter")[0].set_type_filter(null)
            $("padagraph-collection-filter").each(
                function(i,e) {
                    if (e.graph) e.set_type_filter(null);
                });
                
            // auto scroll on request 
            $(window).scrollTop($(".two.column.row").parent().height());

            // change the url
            //var query = response.results.query.uri;
            //var config = app.models.cellist.get_state_str(true);
            //if(config){
                //config = "?" + config;
            //}
            var query = app.models.userquery.to_string();
            // todo config
            app.router.navigate( "/" + app.lang+"/q/" + query );
        },


        /* callback when new data arrived */
        update_models: function(response){
           
            var ln = $("#lndic .ui.menu")
            ln.children().remove();

            _(response.results.request.units).each( function(unit){
                //filter : only for form search at the init
                var filter = {
                    prefix : unit.prefix,
                    vocable : unit.name,
                };

                var  model = app.models.graph.vs.get(unit);
                if (model){
                    model.add_flag("pzero");

                    var card = document.createElement("rlf-vertex-xs");
                    card.model = model;
                    
                    ln[0].appendChild(card);
                }
            });
            
            /*  dictionary */
            $('#lndic .item').tab({ context: $('#lndic .dic-content')});
            
            // TODO: create a proper view/model 
            // clear nav & .def
//            $('#lndef nav>a.item').remove();
//            $('#lndef .def-content').html("");
        },

        /** when the search failed
         */
        engine_play_error: function(response, xhr){
            var app = this;
            if(app.debug){
                console.log("play:error", 'response', response);
                app.response = response;    // juste pour le debug
                app.xhr = xhr;
            }

            //stop waiting
            $("#loading-indicator").hide(0);

            var text;

            if(!_.isEmpty(response)){
                // There is a cello response
                // so we can get the error messages
                text = response.meta.errors.join("<br />");
            } else {
                // HTTP error, just map the anwser
                text = $(xhr.responseText);
                // HACK:
                $("body").css("margin", "0"); //note: the Flask debug has some css on body that fucked the layout
            }

            var alert = Cello.ui.getAlert(text);
            $("body").prepend(alert);
        },
        
        /** Navigate (=play engine) to a vertex by giving it exact label
        */
        navigate_to_label: function(model){
            var app = this;
            if (_.isString(model) ){
                app.models.userquery.reset_from_str(model) ;
            }
            else
                app.models.query.reset_from_models(model) ;
        },

        /** Navigate (=play engine) to a vertex by giving it exact label
        */
        navigate_to_id: function(model){
            var app = this;
            if (_.isString(model) ){
                app.models.userquery.reset_ids_from_str(model, true) ;
                app.views.userquery.submit()
            }
            else
                app.models.query.reset_from_models(model) ;
        },

        // main function
        start: function(graph, explore){
            var app = this;

            // initialise the app it self
            app.create_models();
            
            if(app.debug){
                app._add_to_global();
            }
 
            // create views
            app.create_query_engine_views(explore);
            app.views.keb.install_on_body({});
            app.create_results_views();

            // bind the engine
            // Router
        },
        
        set_routes: function(){
            var AppRouter = Backbone.Router.extend({
                routes: {
                    ':gkey': 'index',
                    ':gkey/q/:query': 'search',
                    ':gkey/id/:query': 'search_by_id',
                    ':gkey/q/:query(?:config)': 'search',

                },

                initialize: function() {
                    console.log('<router init>');
                },

                index: function() {
                    console.log('<router> root /');
                    // index page setup
                    //app.open_home_view();
                },

                search: function(gkey, query, config){
                    console.log("<router> search start");
                    // configure the engine according to url config (if any)
                    //if(!_.isUndefined(config) && !_.isNull(config)){
                        //app.models.cellist.set_state_str(config);
                    //}
                    console.log("navigate_to_label", query);
                    app.navigate_to_label(query);
                },
                search_by_id: function(gkey, query, config){
                    console.log("<router> search by id start");
                    console.log("navigate_to_id", query);
                    app.navigate_to_id(query);
                },
            });
            
            // create the rooter
            app.router = new AppRouter();
            // Everything is now in place...
            Backbone.history.start({pushState: true, root: app.root_url});

        },
        set_ui:function(){
                    /* keyboard shortcuts */

            Mousetrap.bind(['?'], function(){
                $("#query_form input").focus().select();
                return false;
            });

            
            // arrows
            Mousetrap.bind('right', function(){
                $("#myCarousel").carousel("next");
            });
            Mousetrap.bind('left', function(){
                $("#myCarousel").carousel("prev");
            });

            // direct slide access
            var kevents = { 'g,G' : 0, 'c,C':1, 'l,L':2, 'd,D':3 }
            _.each(kevents , function(v,k){
                console.log(k,v)
                Mousetrap.bind(k.split(','), function(){
                    $("#myCarousel").carousel(v)
                });
            });
        }
    });
    
    return App;
    // What we return here will be used by other modules
});
