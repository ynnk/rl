
(function(root, factory) {
    // require.js
    if (typeof define === 'function' && define.amd) {
        // require.js impl
        define(['cello','underscore','backbone','jquery','autocomplete','text!cello_templates/basic.html','text!cello_templates/list.html','text!cello_templates/doclist.html','text!cello_templates/engine.html','text!cello_templates/clustering.html','backbone_forms'],
            function(Cello,_,Backbone,$,AutoComplete,templates_basic,templates_list,templates_doclist,templates_engine,templates_clustering) {
              return factory(root, Cello,_,Backbone,$,AutoComplete,templates_basic,templates_list,templates_doclist,templates_engine,templates_clustering);
        });
    }
    //FIXME: implements nodejs loading
    //wide scope
    else {
        root.Cello = factory(root, Cello,_,Backbone,$,AutoComplete,templates_basic,templates_list,templates_doclist,templates_engine,templates_clustering);
    }
}(this, function(root, Cello,_,Backbone,$,AutoComplete,templates_basic,templates_list,templates_doclist,templates_engine,templates_clustering) {

// == src/ui/views.js ==


    Cello.ui = {};

    Cello.ui.templates = {
            basic : templates_basic,
            clustering : templates_clustering,
            list : templates_list,
            doclist : templates_doclist,
            engine : templates_engine,
        }
        
    // helper to get only one template from a cello_templates string
    Cello.ui.getTemplate = function(templates, template_id){
        //Cello.log("templates", templates);
        var template = $(templates).filter(template_id).html();
        if(!template){
            console.log("all templates:", templates);
            throw new Error("Template '"+template_id+"' not found");
        }
        return _.template(template);
    };

    // Helper to create a alert msg box
    Cello.ui.getAlert = function(message, title){
        var alert = $('<div class="ui negative message"></div>');
        alert.append('<i class="close icon"></i>');
        if(title){
            alert.append('<div class="header">' + title + '</div>');
        }
        alert.append(message);
        //alert.append('<p>' + message + '</p>');
        alert.find("i.close").click(function(){
            alert.remove();
        });
        return alert;
    };

    /* Make a text element "expandable" with a [+] btn
    */
    Cello.ui.expandable = function($el, lmax){
        if(_.isUndefined(lmax)){
            lmax = 120;
        }
        var split_line_space_re = /(.{max(0, lmax-10), lmax}) .*/g;
        var full_text = $el.html() || "";
        full_text = full_text.trim();
        var text = split_line_space_re.exec(full_text.substring(0, lmax+10));
        if(text){
            text = text[1];
        } else {
            text = full_text.substring(0, lmax);
        }
        if(text !== full_text){
            text += "... ";
            // setup the btn
            var full = false;
            var $btn = $(' <a href="#" class="expand small">[<i class="icon plus small" style="margin:0;"></i>]</a>')
            
            var toggle_fct = function(event){
                event.preventDefault();
                if(full){
                    console.log("small");
                    $el.find("span.text.full").hide();
                    $el.find("span.text.small").show();
                    $("i", $btn).removeClass("minus").addClass('plus');
                } else {
                    console.log("full");
                    $el.find("span.text.small").hide();
                    $el.find("span.text.full").show();
                    $("i", $btn).removeClass('plus').addClass("minus");
                }
                full = !full;
                return false;
            }
            
            $btn.click(toggle_fct);
            // add all that in the DOM
            $el.empty()
                .append("<span class='text full'>"+full_text+"</span>")
                .append("<span class='text small'>"+text+"</span>")
                .append($btn);
            $el.find("span.text.full").hide();
            $el.click(toggle_fct);
        }
    };

    /**
     *  Basic form view over a QueryModel
     */
    Cello.ui.Query = Backbone.View.extend({
        //note: the template should have an input with class 'query_input'
        template: Cello.ui.getTemplate(templates_basic, '#query_form_tmpl'),

        events: {
            'change': 'update_model',
            'submit': 'submit_query',
            //'click .query_randomq': 'randomq',
            'click': function(){
                this.trigger("clicked");
            },
        },

        initialize: function(attr){
            _.bindAll(this, "update_model", "update_query", "update_loaded", "submit_query")
            // re-render when the model change
            this.listenTo(this.model, 'change:query', this.update_query);
            this.listenTo(this.model, 'change:loaded', this.update_loaded);
            // getter for the input field
            Cello.get(this, "$input", function(){
                return this.$('input.query_input', this.$el);
            });
            return this;
        },

        // update query value in the input
        update_query: function(){
            this.$input.val(this.model.get('query'));
        },

        /** Return the string of the typed query
         */
        query_str: function(){
            return this.$input.val();
        },

        // exec the search
        submit_query: function(event){
            this.update_model()
            event.preventDefault(); // this will stop the event from further propagation and the submission will not be executed
            // note: this is not necessary for Chrome, but needed for FF
            console.log("submit_query");
            this.trigger("submit_query");
            return false;
        },

        // update the model
        update_model: function(){
            console.log("update query");
            this.model.query = this.query_str();
        },

        // update query value in the input
        update_loaded: function(){
            console.log("loaded", this.model.loaded);
            /**
            // add or remove a "play" icon on submit button
            if(this.model.loaded){
                this.$el.find("[type='submit'] span.glyphicon").remove();
            } else {
                var play_icon = $("<span class='glyphicon glyphicon-play'></span>")
                this.$el.find("[type='submit']").prepend(" ").prepend(play_icon);
            }
            */
        },

        render: function(){
            var data = {
                "label": "search :",
                "placeholder": "Enter a search ...",
                "submit": "search !",
            }
            // setup the template
            if (this.template)
                this.$el.html(this.template(data));
            // update the query input
            this.update_query();
            this.update_loaded();
            return this;
        },
    });
   
   
    /**
     * Make a view hiddable/showable by this $el
     */
    Cello.ui.Showable = function(view, visible) {
        view.is_showable = true;
        view.visible = visible;

        view.hide = function(duration) {
            var duration = duration || 0;
            this.visible = false;
            this.$el.hide(duration);
            return this;
        };

        view.show = function(duration) {
            var duration = duration || 0;
            this.visible = true;
            this.$el.show(duration);
            return this;
        };

        view.toggle = function(duration) {
            var duration = duration || 0;
            if (this.visible) {
                this.hide(duration);
            } else {
                this.show(duration);
            }
            return this;
        };
        
        view.fadeIn = function(duration) {
            var duration = duration || 0;
            this.visible = true;
            this.$el.fadeIn(duration);
            return this;
        };
        
        view.fadeOut = function(duration) {
            var duration = duration || 0;
            this.visible = true;
            this.$el.fadeOut(duration);
            return this;
        };
        
        view.fadeToggle = function(duration) {
            var duration = duration || 0;
            this.visible = true;
            this.$el.fadeToggle(duration);
            return this;
        };
        
        // update the state of the view
        if(view.visible){
            view.show();
        } else {
            view.hide();
        }
    };


    /**
     *  View over a
     */
    Cello.ui.CollectionSearch = Backbone.View.extend({

        initialize: function(attrs,options) {
            var self = this;
            this.on_select = attrs.on_select || function(model) {
                model.set({'selected': true}); // collection item
            };

            this.listenTo(this.model.collection,'change:selected', function(e) { 
                self.upselected(e);
            });
            this.listenTo(this.model.collection,'reset', function() {
                console.log('Views.CollectionSearch:', "reset");
                attrs.input.val('');
            });

            this.autocomplete = new AutoComplete.View({
                input: attrs.input, // your input field
                model: this.model.collection, // your collection
                onSelect: this.on_select,
            });
            this.autocomplete.render();
        },

        render: function() {
            return this;
        },

        /** Mise a jour de la vue quand un element est selectioné dans le model
         */
        upselected: function(e) {
            console.log('Views.CollectionSearch: selected change, e=' , e);
            console.log('>>> id ', e.cid, "title "  ,e.label() , this.$el, $('input', this.$el));
            $('input', this.$el).val(e.label());
        },
    });
    
     /**
     *  add set_position function to the view
     *  
     */
    Cello.ui.Movable = function(view) {
        
        view.set_position = function(event){
            posY = event.offsetY - 20;
            posX = event.offsetX;
            this.$el.css('top',  posY + 'px');
            this.$el.css('left', posX + 'px');
        };
    };

     /**
     *  Tooltip View
     */
    Cello.ui.Tooltip = Backbone.View.extend({
    
       template : _.template("No content"),
       el : "#tooltip",
       
       initialize: function(options) {
            this.template = options.template || this.template;
            
//            Cello.ui.Movable(this);
        },
        
        render : function(event, data){
//            this.set_position(event);
            this.set_content(this.before_render(data));
//            this.$el.width(this.$el.width() + 4)
            return this;
        },
        
        set_content : function(data){
            this.$el.html(this.template(data));
        },
        
        
        //data parsing before render if needed (default : no parsing)
        before_render : function(data){
            return data;
        }
    });
    
    
    


// == src/ui/choice.js ==


    /**
     * Choice View
     * **********
     * attributes
     * ==========
     * elements: is a list of possible item selected could also be a function
     * item: acces to a model attributes storing selection
     * callback: function(view) called after an items is clicked
     *            view is the actual clicked item view
     *            use to set a model attributes.
     *
     * Usage
     * =====
     * var choice = new Views.Choice({
     *       elements: function(){return _.keys(self.model.get('sortables'))},
     *       item: function(){return self.model.get('sort_key')},
     *       callback: function(view){
     *           self.model.set({'sort_key': view.model.get('name')});
     *       },
     *   }); //  create item
     */
    Cello.ui.Choice = Backbone.View.extend({
        template: _.template('<div class="choice btn-group"></div>'),

        initialize: function(attrs){
            //XXX: mouve it in Cello.core as val_or_func
            //TODO need tests ! (realy need test !)
            var wrap = function(val_or_func, defaults){
                if( _.isFunction(val_or_func)){
                    return val_or_func
                }
                // TODO un seul "if" ne suffit pas ?
                var val = val_or_func || defaults;
                if ( _.isFunction(val) )
                    return val;
                return function(){return val};
            };
            this.elements = wrap(attrs.elements , []); // [] or function
            this.item = wrap(attrs.item , {} ); // string, {} or function
            this.callback = wrap(attrs.callback , function(){}) ; // function
        },

        render: function() {
            // remove all neested views (ie all btns)
            this.trigger('removeChoiceItems');
            // create default div
            this.$el.html(this.template());
            var $div = this.$el.find("div.choice");
            // create items
            var elements = this.elements(),
                item = this.item();
            for(var k in elements){
                k = parseInt(k);
                var name = elements[k];
                // setup the class
                var classname = 'clickable btn';
                if(name === item) classname += ' active';
                // create btn model
                var btn_view  = new Cello.ui.ChoiceItemBtn({
                    model: new Backbone.Model({name: name}), // need a very simple model
                    className: 'clickable btn'
                });
                btn_view.listenTo(this, 'removeChoiceItems', btn_view.remove);
                btn_view.listenTo(this, 'unactive', btn_view.unactive);
                this.listenTo(btn_view, 'choice:item', this.on_click);
                $div.append(btn_view.render().$el);
            }
            return this;
        },

        on_click: function(event, btn_view) {
            this.trigger('unactive');
            btn_view.active();
            // callback
            this.callback(btn_view.model.get("name")); // callback
        }
    });
    // make it extendable
    Cello.ui.Choice.extend  = Backbone.View.extend;

    /**
     * A simple choice button
     */
    Cello.ui.ChoiceItemBtn = Backbone.View.extend({
        tagName: 'button',
        className: "clickable btn",
        events: {
            'click': 'onclick'
        },

        render: function() {
            this.$el.append(this.model.get('name'));
            return this;
        },

        onclick: function(event){
            this.trigger('choice:item', event, this);
        },

        active: function(){
            this.$el.addClass("active");
        },

        unactive: function(){
            this.$el.removeClass("active");
        },
    });

// == src/ui/list.js ==


    /** Standard list item view
     *
     * model should have a "selected" property
     */
    Cello.ui.list = {};
    
    Cello.ui.list.ListItemView = Backbone.View.extend({
        tagName: 'li',
        template: Cello.ui.getTemplate(templates_list, '#Formatted_label_template'),
        attrs: {}, //dict of attributes to add to $elem {"name" : "value"}
        
        //useful if the item model contains a collection to display
        CollectionView: Cello.ui.list.CollectionView, //CollectionView 
        collection_view: null, //view of the collection

        initialize: function(options) {
            _.bindAll(this, ['update_selected']);
            this.listenTo(this.model, 'change:selected', this.update_selected);
            
            if(!_.isUndefined(options)){
                this.CollectionView = options.CollectionView || this.CollectionView;
                this.template = options.template || this.template;
                this.parent = options.parent || null; // parent view;
            }
            if (this.collection) {
                this.reset_collectionView();
            }
            
            this.on('rendered', this.reset_childviews)
        },

        /* override to render child views and append them to this view
        ** here is an exemple to fill this function, replace ChildView with the name of your Child View
        */
        reset_childviews: function() {
/*
            this.trigger('resetChildViews');
            this.child_view = new ChildView({
                model : this.model //collection  : this.collection
            });
            this.on("resetChildViews", this.child_view.remove, this.child_view); 
            if (this._rendered) {
                $(this.el).append(child_view.render().el);
            }
*/
            return this;
        },

        get_data: function(){
            /* override to pass custom dictionnary */
            var data = this.model.toJSON();
            return data;
        },
        
        render: function() {
            var data = this.get_data();
            this.$el.html(this.template(data));
            
            this._rendered = true;
            
            if (this.collection_view) {
                this.$el.append(this.collection_view.render().el);
            }
            this.update_selected();
            this.set_attrs();
            this.trigger('rendered');
            return this;
        },
        
        /**  May be override to process model data before template rendering
         */
        before_render: function(model){
            return model.toJSON();
        },
        
        //function that set this.attrs attribute to $el
        set_attrs: function(){
            _this = this;
            _(this.attrs).each( function(val, name){
                _this.$el.attr(name, val);
            });
        },
        
        //override remove to remove subviews
        remove: function() {
            this.trigger("removeCollectionView");
            Backbone.View.prototype.remove.apply(this, arguments);
        },

        reset_collectionView: function() {
            Cello.assert(this.collection);
            this.trigger('removeCollectionView');
            this.collection_view = new this.CollectionView({
                collection : this.collection
            });
            
            this.on("removeCollectionView", this.collection_view.remove, this.collection_view); 

            if (this._rendered) {
                $(this.el).append(collection_view.render().el);
            }
        },

        // when the model get selected (or unselected)
        update_selected: function() {
            //console.log("update selected", this.model)
            if (this.model.get('selected')) {
                this.$el.addClass('active');
            } else {
                this.$el.removeClass('active');
            }
        }
    });

    /* View over a Backbone collection 
    */
    Cello.ui.list.CollectionView = Backbone.View.extend({
        tagName: 'ul',
        className: '',

        ChildView: Cello.ui.list.ListItemView,
        sortable: false,

        initialize : function(options) {
            //options: {ChildView: , sortable: true/false, ...}
            
            Cello.assert(options, "options needed");
            Cello.assert(options.collection, "options.collection needed");
            this.className = options.className || this.className;
            this.tagName = options.tagName || this.tagName;
            
            _(this).bindAll('add_childView', 'remove_childView', 'reset_childViews');
            // child view and default child views options
            this.ChildView = options.ChildView || this.ChildView;
            this.ChildViewOptions = options.ChildViewOptions || {};
            
            if (options.template){
                this.template = options.template;
            }

            this.reset_childViews();

            this.sortable = options.sortable || this.sortable;
            
            if (this.sortable) {
                this.listenTo(this.collection, "sort", this.reset_childViews);
            }

            this.listenTo(this.collection, "add", this.add_childView);
            this.listenTo(this.collection, "remove", this.remove_childView);
            this.listenTo(this.collection, "reset", this.reset_childViews);
        },

        //override remove to remove subviews
        remove: function() {
            this.trigger("removeSubViews");
            Backbone.View.prototype.remove.apply(this, arguments);
        },

        // Reset all child views, callback on reset event on collection
        reset_childViews : function(){
            this.trigger('removeSubViews');
            this.childViews = [];
            this.collection.each(this.add_childView);
        },

        // Add add a child views, callback on add event on collection
        add_childView : function(model) {
            var child_options = this._childViewOptions(model);
            var childView = new this.ChildView(child_options);
            //console.log("child_options", child_options);
            this.on("removeSubViews", childView.remove, childView)
            this.childViews.push(childView);
            // if already rendered add it to the dom
            if (this._rendered) {
                this.$el.append(childView.render().el);
            }
        },
        
        //return child view option to render a spectific model
        _childViewOptions : function(model){
            var _this = this;
            //console.log("RAW child_options", this.ChildViewOptions);
            return _({}).extend(
                this.ChildViewOptions,
                {
                    model: model,
                    parent: _this,
                }
            );
        },

        // Remove a child views, callback on remopve event on collection
        remove_childView: function(model) {
            //console.log("[[remove]]", model);
            var viewToRemove = _(this.childViews).select(function(cv) { return cv.model === model; })[0];
            this.childViews = _(this.childViews).without(viewToRemove);
            // if already rendered, remove it from DOM
            if (this._rendered) {
                $(viewToRemove.el).remove();
                viewToRemove.remove();
            }
        },
        
        get_data: function(){
            /* override to pass custom dictionnary to the template*/
            var data = {};
            return data;
        },

        render: function() {
            var _this = this;
            if (this.template){
                this.$el.html(this.template( this.get_data() ));
            }
            this._rendered = true;
            _(this.childViews).each(function(childView) {
                _this.$el.append(childView.render().el);
            });
            return this;
        }
    });
    
    
    // render a Nested Collection
    // we need to init this view with a new option
    //   {nested_collection_key: key of the nested collection in the model}
    Cello.ui.list.NestedCollectionView = Cello.ui.list.CollectionView.extend({
        
        initialize : function(options) {
            Cello.assert(_.isString(options.nested_collection_key));
            this.nested_collection_key = options.nested_collection_key;
            Cello.ui.list.NestedCollectionView.__super__.initialize.apply(this, arguments);
        },
        
        //return child view option to render a spectific model
        _childViewOptions : function(model){
            return _({}).extend(
                this.ChildViewOptions,
                {model: model, collection : model[this.nested_collection_key]}
            );
        }
    });
    
    
    /**  Simple button to select one of the possible order of elements in a Cello.Sortable model
     */
    Cello.ui.list.SortByItem = Backbone.View.extend({
        tagName: "div",
        className: "ui button",

        template: Cello.ui.getTemplate(templates_list, '#SortByItem_template'),

        initialize: function(options){            
            // binding to the sortable collection
            this.listenTo(this.model.collection, "change:selected change:reversed", this.render)
        },

        events: {
            'click': 'on_click',
        },

        // update the model selection
        on_click: function(){
            if (this.model.selected) {
                this.model.toggle_reverse();
            }else{
                this.model.select();
            }
        },

        render: function() {
            var data = this.model.toJSON();
            data["active"] = this.model.selected;
            data["reverse"] = this.model.reversed;
            //console.log("-------");
            //console.log(data);
            //console.log("-------");
            this.$el
                .empty()
                .removeClass("active")
                .html(this.template(data));
            if(data["active"]){
                this.$el.addClass("active");
            }
            return this;
        },
    });


    /** Search view with autocomplete inside a list ie. a model that have a "model.elements"
     *
     * by default: it "select" the found item.
     */
    Cello.ui.list.ListSearch = Backbone.View.extend({

        template: Cello.ui.getTemplate(templates_list, '#ListSearch_template'),

        search_in: "label", // default attribute used for search

        initialize: function(options) {
            this.search_in = options.search_in || this.search_in;
            _.bindAll(this, ["on_select"]);
            this.render()
        },

        render: function() {
            var data = {
                label: "search",    //TODO use attr for that
                placeholder: "search within the results", //TODO use attr for that
            };
            this.$el.empty().html(this.template(data));
            // add autocomplete
            var $input = this.$el.find(".search_input");
            this.autocomplete = new AutoComplete.View({
                input: $input, // your input field
                model: this.model.collection, // your collection
                searchIn: this.search_in,
                onSelect: this.on_select,
            });
            this.autocomplete.render();
            return this;
        },

        // select a document
        on_select: function(document){
            this.model.clear_selection();
            this.model.select(document);
        },
    });

// == src/ui/engine.js ==


    var Models = {}, Views = {};

    /**
     *  Model between a component (list of option) and a form view
     */
    Models.FormModel = Backbone.Model.extend({
        initialize: function(attrs, options){
            this.component = options.component;
            _.bindAll(this, "update_component", "update_from_component");
            this.listenTo(this, 'change', this.update_component);
            this.listenTo(this.component, 'change:options', this.update_from_component);
            this.update_from_component();
        },

        /** Set option values of the component
         */
        update_component: function(){
            var attrs = this.attributes;
            //console.log("Update", attrs);
            for(var opt_name in attrs){
                var option = this.component.get_option(opt_name);
                if(option.otype.type === "Boolean"){
                    value = _.isEqual(attrs[opt_name], ["true"]);
                } else {
                    value = attrs[opt_name];
                }
                //console.log("SET", option.otype.type, opt_name, attrs[opt_name], value);
                this.component.set_option(opt_name, value);
            }
        },

        /** update model values form the component options
         *
         * note: a event "change_from_elsewhere" is triggered if a change realy
         * apprear here. This allows the Backbone.Form view above this model
         * to be re rendered only if a change cames from elsewhere.
         * see OptionableView.
         */
        update_from_component: function(){
            var _this = this;
            var changed = false;
            //console.log("Update_from_comp", arguments);
            _.each(this.component.options.models, function(option){
                var name = option.name;
                var value = option.value;
                if(option.otype.type === "Boolean"){
                    value = value ? ["true"] : [];
                } 
                changed = changed || (_this.get(name) !== value);
                //console.log(changed);
                //console.log(name, String(_this.get(name)), String(value))
                _this.set(name, value);
            });
            if(changed){
                this.trigger("change_from_elsewhere");
            }
        },
    });

    /**
     *  FormView of an Optionable
     */
    Views.OptionableView = Backbone.View.extend({
        className: "optionable item",
        template: Cello.ui.getTemplate(templates_engine, '#OptionableView_template'),

        // list of options to show
        option_list: [], // all if empty

        events: {
            //Note: the click is trigger as an event to allow to bind somewhere above, 
            // typicaly in ComponentPane as component selection
            'click': function(){
                this.trigger("clicked");
            },
        },

        /** Initialise the view over a composent options
        
        possible options are :
         * model : the model to views
         * el : DOM element
         * template
         * option_list : the list of option to show (all if None)
        */
        initialize: function(options){
            this.form = null;

            var _this = this;

            //template
            this.template = options.template || this.template;

            // List of option to show
            this.option_list = options.option_list || this.option_list;

            // create the data model for the form
            this.form_model = new Models.FormModel({}, {
                component: this.model
            });

            // binding to the model
            this.listenTo(this.model, "change:selected", this.update_select)
            // note: re-render when options changed (but not if the change cames
            //  from the form view)
            this.listenTo(this.form_model, 'change_from_elsewhere', this.render);
        },

        render: function(){
            // trigger event to remove all sub views
            this.trigger("remove_subviews")
            // clear the dom
            this.$el.empty();
            // ... then build the view
            var tmpl = {
                name: this.model.name,
                help: this.model.doc,    //TODO help better than doc
            };
            // render the template
            this.$el.append(this.template(tmpl));
            // add the options form
            // append the form
            if(this.model.options.size() > 0){
                var options_form = this.$el.find(".options_form")
                var form = this.get_form();
                form.render();
                form.listenTo(this, "remove_subviews", form.remove)
                options_form.append(form.el);
            }
            this.update_select();
            return this;
        },

        // add/remove 'active' class
        update_select: function(){
            if(this.model.selected){
                this.$el.addClass('active');
                $(":input", this.$el).prop("disabled", false);
            } else {
                this.$el.removeClass('active');
                $(":input", this.$el).prop("disabled", true);
            }
        },

        // build Form (view and model) from the component
        get_form: function(){
            var _this = this;
            // build the form config from options
            var schema = {};    // form schema
            _.each(this.model.options.models, function(opt_model){
                var name = opt_model.name;
                // Add the option only if listed
                if(_this.option_list.length == 0 || _this.option_list.indexOf(name) >= 0){
                    schema[name] = _this.to_form_schema(opt_model);
                }
            });
            
            // create the form itself
            var form = new Backbone.Form({
                // change on the view form data are not set to the component model
                events: {
                    'change': function(event){
                        console.log("<form changed>", arguments);
                        this.commit();
                    },
                    'submit': function(event){
                        console.log("<form submit>", arguments);
                        this.commit();
                        _this.trigger("submit");
                        event.preventDefault();
                    },
                },
                //Schema
                schema: schema,
                //Model + data to populate the form with
                model: this.form_model,
            });
            return form;
        },

        // Create a Backbone.Form schema from an Cello.Option
        to_form_schema: function(option_model){
            var type_mapping = {
                'Numeric': 'Number',
                'Text': 'Text',
                //'Boolean': 'Radio',
                'Boolean': 'Checkboxes',
            };

            var schema = {};
            var validators = [];
            var otype = option_model.otype;

            schema.label = option_model.name;
            schema.title = otype.help;

            schema.type = type_mapping[otype.type];

            if(otype.choices && otype.choices.length){
                if(!otype.multi){
                    schema.type = 'Select';
                } else {
                    schema.type = 'Checkboxes';
                }
                schema.options = otype.choices;
            }

            if(otype.type === 'Numeric'){
                schema.editorAttrs = {};
                if(otype.vtype == "int"){
                    schema.editorAttrs.step = 1;
                } else {
                    schema.editorAttrs.step = 0.1;
                }
                if(!_.isUndefined(otype.min) && !_.isNull(otype.min)){
                  schema.editorAttrs.min = otype.min;
                }
                if(!_.isUndefined(otype.max) && !_.isNull(otype.max)){
                  schema.editorAttrs.max = otype.max;
                }
            } else if(otype.type === 'Boolean'){
                //schema.options = [true, false];
                schema.options = [
                  {label: otype.help, val: true}
                ];
                schema.editorClass = "ui toggle checkbox";
                schema.title = null;
            }
            return schema;
        },
         
    });

    //TODO rename it BlockView
    /**
     *  View of a Block
     *
     * associated model is Cello.Block
     */
    Views.ComponentPane = Backbone.View.extend({
        className: 'item header',
        template: Cello.ui.getTemplate(templates_engine, '#ComponentPane_template'),

        events: {
            'click .done': 'hide',
        },

        initialize: function(options){
            // make the view showable/hidable
            Cello.ui.Showable(this, options ? options.visible: false);
        },

        render: function(){
            var _this = this;
            var data = {
                val: this.model.name,
                value: this.model.name,
                label: this.model.name,
            };
            this.$el.append(this.template(data));
            var $cont = this.$el.find('.menu').first();
            _.each(this.model.components.models, function(component, index, list){
                var optionable_view = new Views.OptionableView({
                    model: component
                });
                // bind the selection/click
                optionable_view.listenTo(component, 'change:selected', optionable_view.upselect);
                optionable_view.listenTo(optionable_view, 'clicked', function(){
                    _this.model.select(component);
                });
                // render the view (and append it)
                $cont.append(optionable_view.render().el);
            });
            this.$el.append($cont);
            return this;
        },
    });


    /**
     * Full view over a Cello engine
     */
    var global_btn_id_counter = 0;
    //TODO: rename it EngineView
    Views.Keb = Backbone.View.extend({
        events: {
            'click .getmodel': 'getmodel',
            'click .state': 'state',
            'click .isvalid': 'isvalid',
            'click .set_defaults': 'set_defaults',
            'click .reset': 'reset',
            'click .fetch': 'fetch',
        },

        tagName: "div",
        className: "ui vertical wide sidebar menu left",
        template: Cello.ui.getTemplate(templates_engine, '#engine_view_template'),
        btn_template: Cello.ui.getTemplate(templates_engine, '#engine_view_openner_template'),

        initialize: function(){
            _.bindAll(this, ['set_defaults']);
            // prepare helper links
            $helpers = $('.helpers', this.$el);
            if($helpers){
                $helpers.append(_.map(_.values(this.events), function(e){
                    return "<a href='#' class='"+e+"'>"+e+"</a>";
                }).join(' - '));
            }
            this.listenTo(this.model, 'change:blocks', this.render);
            this.listenTo(this.model, 'change:blocks', this.set_defaults);
        },

        fetch: function(){
            this.trigger('removeAll');
            this.model.fetch({parse:true});
        },

        /**  Install the KEB view as a sidebar for body
        **/
        install_on_body: function(options){
            console.log("<install engine view on body>");
            // compute default options
            position = options.position || "left";
            // render the View
            this.render();
            // some configuration
            this.$el.addClass(position);
            // add it to DOM with btn
            // render openting btn
            var btn_id = "keb_btn_" + global_btn_id_counter++; // uniq id
            var data = {
                id: btn_id
            }
            var open_btn = $(this.btn_template(data));
            open_btn.addClass(position == "left" ? "right": "left")
                .css(position, "0")
                .css("position", 'absolute')
                .css("z-index", '80')
                .css("padding", '0.5em');
            // add "pusher" div an mv body in it
            // add sidebar to body and  pusher (containt)
            $("body").append(this.$el);
            $("body").append(open_btn);
            this.$el
                .sidebar('setting', 'transition', 'overlay')
                .sidebar('attach events', '#' + btn_id);
        },

        render: function(){
            console.log("<engine view rendering>");
            var _this = this;
            var data = {};
            this.$el.html(this.template(data));
            // remove all sub views
            this.trigger("removeAll");
            var $optbuttons = $('.optbuttons', this.$el);
            // rebuild subviews
            // for each block
            _.each(this.model.blocks.models, function(block, index, list){
                // create the ComponentPane
                var itempane = new Views.ComponentPane({
                        model: block,
                        visible: true,
                });
                // bind it and add it to DOM
                itempane.listenTo(_this, 'removeAll', itempane.remove); // listento remove calls
                itempane.listenTo(_this, 'hideAll', itempane.hide);

                // add buttons
                if($optbuttons){ // add button
                    var itembtn = new Views.BlockButton({
                        model: block,
                        view: _this,
                        pane: itempane,
                    });
                    itembtn.listenTo(_this, 'removeAll', itembtn.remove); // listento remove calls
                    itembtn.listenTo(_this, 'hideAll', itembtn.unactive);
                    //$optbuttons.append(itembtn.render().el);
                }
                _this.$el.append(itempane.render().el);
            });
            return this;
        },

        /* helper functions */
        getmodel: function(){console.log('Keb', 'getmodel', this.model);},
        state: function(){console.log('Keb', 'state', this.model.state());},
        isvalid: function(){console.log('Keb', 'isvalid', this.model.is_valid());},
        set_defaults: function(){},
        reset: function(){ this.model.reset_selections(); },
    });


    /**
     * Button view over a block
     */
    Views.BlockButton = Backbone.View.extend({
        className: 'btnopt',
        template: Cello.ui.getTemplate(templates_engine, '#BlockButton_template'),

        events:{
            'click': 'toggle',
        },

        attributes: {
            max_chars: 20,
        },
        /**
         * attributes that should be given :
         *  * model : the Cello.Block model
         *  * pane : the ComponentPane
         *  * view : the Keb (view)
         */
        initialize: function(options){
            this.model = options.model;
            this.pane = options.pane;
            this.view = options.view;
            this.listenTo(this.model, 'change:selected', this.update_selected);
        },

        render: function(){
            var tmpl = {
                name: this.model.name,
            };
            this.$el.append( this.template(tmpl) );
            this.update_selected()
            return this;
        },

        // Update the name of selected component
        update_selected: function(){
            //@console.log("Views.KebButton","render", this.model);
            // render update just the 
            var sel = this.model.selected;
            var val;
            if(sel.length === 0) {
                val = "...";
            } else {
                val = _.pluck(sel, 'name').join(', ');
                if(sel.length > 1) {
                    val = "(" + sel.length + ") " + val;
                }
            }
            val = val.substring(0, this.attributes.max_chars);
            $(".value", this.$el).html(val);
            return this;
        },

        // update selection
        toggle: function(){
            //console.log('toggle', this.pane.visible);
            if(this.pane.visible){
                this.pane.hide();
                this.unactive();
            }
            else{
                this.view.trigger('hideAll');
                this.pane.show();
                this.$el.addClass('active');
            }
            return this;
        },

        unactive: function(){
            this.$el.removeClass('active');
            return this;
        }
    });

    Cello.ui.engine = Views;

// == src/ui/clustering.js ==


/**
 * Clustering views
 * 
 * Clustering views show each cluster's item
 * 
 * A ClusterItem is a cell that might contains:
 *      # vids of the graph vertex belonging to that cluster
 *      # docnums for the document that are part of this cluster
 *      # labels take from document attributes or vertex labels
 * 
 * Clustering views might also embed a Choice  to switch over different labelling.
 * 
 * 
 * 
 
 */
    
    /* Views Clustering */
    var clustering = {};

    /** View connected to a Cello.Clustering Model that show one pastille by cluster
     */
    clustering.ClusterPastille = Backbone.View.extend({
        tagName: 'li',
        className: 'pastille',

        events: {
            "click a": "clicked",
        },

        rendered: false,

        initialize: function(options){
            _.bindAll(this, "_color_changed", "render");
            //this.listenTo(this.model, "change", this.render);
            this.listenTo(this.model, "change:color", this._color_changed);
        },

        clicked: function(event){
            // NOT exclusif selection (i.e. they may have more than one cluster selected)
            // if there is CRTL pressed OR click with middle button
            var exclusif = !(event.ctrlKey || event.button === 1);
            this.model.toggle_select(exclusif);
            return false; // stop propagation and html click
        },

        render: function(){
            //console.log("<pastille.render>");
            this.rendered = true;
            this.pastille = $("<a href='#' data-cluster-id='"+this.model.cid+"' data-clustering-id='"+this.model.collection.clustering.cid+"'>&nbsp;</a>");
            this.$el.html(this.pastille);
            // check pastille color
            this._color_changed();
            return this;
        },

        _color_changed: function(){
            if(this.rendered){
                var color_html = Cello.utils.css_color(this.model.color);
                this.pastille.css("background-color", color_html);
            }
        },
    });


    /** Default view for one cluster member
     */
    clustering.ClusterMemberView = Backbone.View.extend({
        tagName: 'li',

        // fallback template
        template: Cello.ui.getTemplate(templates_clustering, '#cluster_label_item'),

        defaults: {
            cluster: null,
        },
        
        collectionView: null,
        
        initialize : function(options){
            var _this = this;
            //console.log("clustering.ClusterMemberView", options);
            this.parent = options.parent; // ref to clustering ID
            this.collectionView = options.collectionView || this.collectionView;
            this.listenTo(this.model, "change", function(){_this.render()});
        },
        
        render: function(){
            var data = this.before_render(this.model);
            this.$el.html(this.template(data));
            return this;
        },

        /**  May be override to process model data before template rendering
         */
        before_render: function(model){
            return model.toJSON();
        }
    });


    /** Show members of a cluster, for a given role
    */
    clustering.ClusterView = Backbone.View.extend({
        className: 'cluster',
        tagName: 'li',

        MembersViews: {},

//        LabelView: clustering.LabelView,

        events: {
            "click": "clicked",
            "mouseover": "clicked",
            "mouseout": "clicked",
        },

        initialize: function(options){
            //setup clustering view
//            this.collectionView = options.collectionView || collectionView;

            // binding
            _.bindAll(this, "reset_membersViews", "remove_members", "update_selected");

            this.MembersViews = options.MembersViews || this.MembersViews;
            this.reset_membersViews(this.MembersViews);

            this.listenTo(this.model.collection, "change:selected", this.update_selected);
            this.listenTo(this.model, "change:color", this.render_cluster);

            // if members or active roles changed then re-render just the members
            this.listenTo(this.model, "change:members", this.render_members);
            this.listenTo(this.model, "change:roles", this.render_members);
            // if clustering becames editable
            this.listenTo(this.model.clustering, "change:editable", this.render_members);
        },

        reset_membersViews : function(MembersViews){
            var _this = this;
            this.trigger('removeMembersViews');
            this._membersViews = {};
            
            var members_names = _.intersection( _(MembersViews).keys(), _(this.model.members).keys() );
            MembersViews = _(MembersViews).pick(members_names);

            // Render the members views for one kind of member
            _(MembersViews).each(function(MemberView, members_name) {
                Cello.assert(_this.model.members[members_name]);
                var membersView = new MemberView({
                    collection: _this.model.members[members_name],
                    //clustering_cid: _this.model.clustering.cid
                });

                _this.on("removeMembersViews." + members_name, membersView.remove, membersView)
                _this.on("removeMembersViews", membersView.remove, membersView); 

                _this._membersViews[members_name] = membersView;

                if (_this._rendered) {
                    _this.$el.append(membersView.render().el);
                }
            });
        },
        
        /** When clicked, just toggle the selection in the model
         */
        clicked: function(event){
            // NOT exclusif selection (i.e. they may have more than one cluster selected)
            // if there is CRTL pressed OR click with middle button
            var exclusif = !(event.ctrlKey || event.button === 1);
            this.model.toggle_select(exclusif);
        },
        
        //override remove to remove subviews
        remove: function() {
            this.trigger("removeMembersViews");
            Backbone.View.prototype.remove.apply(this, arguments);
        },

        remove_members: function(members_name) {
            delete this._membersViews[members_name];
            this.trigger("removeMembersViews." + members_name);
        },

        /** Render the item and then all the labels neested views
         */
        render: function(){
            this.render_cluster();
            this.render_members();
            
            this._rendered = true;
            
            return this;
        },

        render_cluster: function(){
            // basic template :
            var data = {}
            _.extend(data, this.model.toJSON());
            // gradient background
            var color = this.model.color;
            // donner la couleur direct en CCS fait que c'est dur doverridé...
            color = Cello.utils.css_color(color);
            //this.$el.css("background-image", Cello.utils.css_gradient(color, Cello.utils.color_darker(color)) );
            this.$el.css("background-color", color);
            this.$el.css("border-color", color);
            // add a class if misc
            if(this.model.misc){
                this.$el.addClass("misc");
            }
            return this;
        },
        
        render_members: function(){
            var _this = this;
            
            _(this._membersViews).each(function(membersView) {
                _this.$el.append(membersView.render().el);
            });

            return this;
        },

        /** Called when the model 'selection' changed
         *
         * The complexity in this function is that when no cluster are selected
         * then cluster view should have no special class, but if an other
         * cluster is selected then it should have a class 'unactive'
         */
        update_selected: function(){
            if (this.model.selected) {
                this.$el.addClass('active');
                this.$el.removeClass('unactive');
            } else {
                this.$el.removeClass('active');
                if(this.model.collection.some_selected()){
                    this.$el.addClass('unactive');
                } else {
                    this.$el.removeClass('unactive');
                }
            }
        },
    });

    /* View that select active "role" of labels of a Clustering model
    */
    clustering.LabelRolesSelector = Backbone.View.extend({
        events:{
            'click .btn': "btn_clicked",
        },

        initialize: function(){
            // re-render when roles change
            this.listenTo(this.model, "change:roles", this.render);
        },

        btn_clicked: function(e){
            //hack: Toggle by hand the button to be sure it is toggle when set the model
            e.stopImmediatePropagation()
            $(e.target).button('toggle');

            // get selected roles
            var roles = []
            _.each(this.$el.find(".btn.active"), function(btn){
                roles.push($(btn).data("role"));
            });
            this.model.roles = roles;
        },

        render: function(){
            var $btns = $('<div class="btn-group" data-toggle="buttons"></div>')
            var active_roles = this.model.roles;
            _.each(this.model.all_roles(), function(role){
                // render each role btn
                var _btn_tmpl = _.template('<label class="btn btn-primary <%=active%>" data-role="<%=role%>"><input type="checkbox"> <%=role%> </label>')
                var data = {
                    role: role,
                    active: active_roles.indexOf(role) >= 0 ? "active" : "",
                };
                $btns.append(_btn_tmpl(data));
            }, this)
            // reset the element
            this.$el.empty().append($btns);
            return this;
        },
    });

    Cello.ui.clustering = clustering;

// == src/ui/doclist.js ==


    var doclist = {};

    /** ItemView over a Cello.Doc
     *
     * This view is made to be use in a Cello.ui.list.ListView.
     * It may be extend.
     */
    doclist.DocView = Cello.ui.list.ListItemView.extend({
        template: Cello.ui.getTemplate(templates_doclist, '#DocItemView_template'),

        initialize: function(options){
            // super call 
            doclist.DocView.__super__.initialize.apply(this, arguments);
            // override
            _.bindAll(this, 'flags_changed');
            this.bind_to_model();
        },

        /** automatic binding of the view to the model
         *
         * Called in the init
         * may be overriden
         */
        bind_to_model: function(){
            this.listenTo(this.model, "addflag rmflag", this.flags_changed);
        },

        render: function(){
            // super call 
            doclist.DocView.__super__.render.apply(this, arguments);
            // add flags/class
            this.set_flags();
            return this;
        },

        // flags are transformed to CSS classes
        flags_changed: function(){
            var previous_flags = this.model.previous("flags");
            _.each(previous_flags, function(flag){
                this.$el.removeClass(flag);
            }, this);
            this.set_flags();
        },

        // copy the model flags to CSS classes
        set_flags: function(){
            var flags = this.model.flags;
            _.each(flags, function(flag){
                this.$el.addClass(flag);
            }, this);
        },
        
        // scrool to the item
        scroll_to: function(){
            var parent_div = this.$el.parent("ul").parent();
            parent_div.animate({
                scrollTop: parent_div.scrollTop() + this.$el.position().top - 1,
            }, 100);
        },
    });


    /**  ItemView over a Cello.Doc with cluster pastilles
     *
     *  This view is also linked to a clustering model
     * and on each documents are managed pastilles
     */
    doclist.DocPastilleView = doclist.DocView.extend({
        template: Cello.ui.getTemplate(templates_doclist, '#DocPastilleItemView_template'),
        
        // this additional models should be given in initialize
        clustering_cid: null,    // permit to build the nested cluster pastille view
        ClusterPastille: Cello.ui.clustering.ClusterPastille, // default view for pastilles

        initialize: function(options){
            // super call 
            doclist.DocPastilleView.__super__.initialize.apply(this);
            this.ClusterPastille = options.ClusterPastille || this.ClusterPastille
            // setup custom attr
            //cluserting_cid is the cid of the clustering that we want to display in pastille views
            if (!this.clustering_cid) {
                Cello.assert(options.clustering_cid, "DocPastilleView should know the cid of the clustering to display");
            }
            this.clustering_cid = options.clustering_cid || this.clustering_cid;
            this.listenTo(this.model, "change:clusters", function(){
                //console.log("<docPastille render (change:clusters)>");
                this.render_pastilles();
            });
            
        },

        /** Render the document
         *
         * overiden to manage cluster pastilles
         */
        render: function(){
            //console.log("<docPastille render>");
            // super call 
            doclist.DocPastilleView.__super__.render.apply(this);
            if(_.has(this.model.clusters, this.clustering_cid)){
                this.render_pastilles();
            }
            return this;
        },

        /** renders the pastilles subviews
         */
        render_pastilles: function(){
            //console.log("<render pastilles>");
            var clusters_collection = new Backbone.Collection(
                _(this.model.clusters[this.clustering_cid]).pluck('cluster')
            );
            this.trigger('removeSubViews');
            // add pastille view
            var pastilles = new Cello.ui.list.CollectionView({
                className: "pastilles",
                collection: clusters_collection,
                ChildView: this.ClusterPastille,
            });
            pastilles.listenTo(this, "removeSubViews", pastilles.remove, pastilles);
            // add the view in DOM
            this.$el.find(".pastilles").empty().append(pastilles.render().el);
        },

    });


    Cello.ui.doclist = doclist;


    return Cello;
}))
