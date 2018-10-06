// Filename: main.js

var path = "../static/node_modules/"

require.config({
      waitSeconds: 0,
      paths: {

        semantic : path + 'semantic-ui-css/semantic.min',
        requirejs : path + 'requirejs/require',
        underscore : path + 'underscore/underscore-min',
        backbone   : path + 'backbone/backbone-min',
        jquery     : path + 'jquery/dist/jquery.min',
        threejs   :  path + 'three/three.min',
        tween     :  path + 'tweenjs/lib/tweenjs.min',
        mousetrap :  path + 'mousetrap/mousetrap.min',
        moment    :  path + 'moment/min/moment.min',

        app_graph     : 'app_graph',
        cello     : 'cello',
        gviz      : 'gviz',
        embed     : 'embed',        
        cello_core     : 'cello',
        celloui     : 'cello-ui',
        //pdgconst  : 'pdgconst',
        //gviz      : 'gviz',
        //embed     : 'embed',     
        //materials : 'materials',
        numeric   :  'numeric-1.2.6',
        json2html : 'json2html',
        autocomplete : 'backbone.autocomplete',
        bootbox : 'bootbox.min',
        tagsinput: 'semui-tagsinput',
        backbone_forms: 'backbone-forms.min',
      },
      
      shim: {
          // threejs not require compatible...
          'materials': {deps: ["gviz"]},
          'celloui': {deps: ["cello"]},
          'threejs': {
                exports: 'THREE',
            },
          'autocomplete': {deps: ["backbone"]},
          
          'json2html': {
                exports: 'json2html',
            },
          'tagsinput': {deps: ["jquery"]},
          'semantic': {
              deps: ['jquery']
          },
        }
    });


/*

require.config({
  paths: {
    underscore: 'lib/underscore-min',
    jquery: 'lib/jquery-1.11.0.min',

    backbone: 'lib/backbone-min',
    backbone_forms: 'lib/backbone-forms.min',

    semantic:  'semantic.min',
    
    //bootstrap: 'lib/bootstrap/js/bootstrap.min',
    bootstrap_tagsinput: 'lib/semui-tagsinput',

    bootbox: 'lib/bootbox.min',

    threejs: 'lib/three.min',
    threejs_trackball: 'lib/three-TrackballControls',

    tween: 'lib/Tween',

    text: 'lib/text',

    autocomplete: 'lib/backbone.autocomplete',

    moment:  'lib/moment.min',
    mousetrap:  'lib/mousetrap.min',

    cello_core: 'build/cello-lib',
    cello_ui: 'build/cello-ui',
    cello_gviz: 'build/cello-gviz',
    cello_templates: 'jstmpl',
  },
  shim: {
      // bootstrap need jquery
      //'bootstrap': {deps: ["jquery"]},
      //'bootstrap_tagsinput': {deps: ["bootstrap"]},
      // threejs not require compatible...
      'semantic': {deps: ["jquery"]},
      'bootstrap_tagsinput': {deps: ["jquery"]},
      'threejs_trackball': {
            exports: 'THREE',
            deps: ['threejs'],
        },
      
    }
});
*/
