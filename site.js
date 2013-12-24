(function(){
  var join$ = [].join, toString$ = {}.toString;
  prelude.installPrelude(window);
  $(function(){
    var i$, ref$, len$, example, src, boom;
    for (i$ = 0, len$ = (ref$ = $('.example .example-ls')).length; i$ < len$; ++i$) {
      example = ref$[i$];
      src = $(example).find('.lang-ls').html();
      $('<pre class="source"></pre>').html(src).appendTo(example);
    }
    prettyPrint();
    boom = function(action){
      var source, result, func, e, error, lns, i$, len$, ref$, tag, val, line, i, toPrepend;
      source = $('.compiler textarea').val();
      result = (function(){
        try {
          if (action === 'run') {
            source = "<- (do)\n" + source;
          }
          func = action === 'run' ? 'compile' : action;
          return LiveScript[func](source, {
            bare: true
          });
        } catch (e$) {
          e = e$;
          error = true;
          return e.message;
        }
      }());
      if (action === 'run') {
        result = (function(){
          try {
            return eval(result);
          } catch (e$) {
            e = e$;
            error = true;
            return e.message;
          }
        }());
      }
      if (result != null) {
        if (typeof console != 'undefined' && console !== null) {
          console.log(result);
        }
        if (action == 'lex' || action == 'tokens') {
          lns = [];
          for (i$ = 0, len$ = result.length; i$ < len$; ++i$) {
            ref$ = result[i$], tag = ref$[0], val = ref$[1], line = ref$[2];
            lns[line] == null && (lns[line] = []);
            lns[line].push(val === tag.toLowerCase()
              ? tag
              : tag + ":" + val);
          }
          for (i$ = 0, len$ = lns.length; i$ < len$; ++i$) {
            i = i$;
            line = lns[i$];
            lns[i] = (line != null ? line.join(' ').replace(/\n/g, '\\n') : void 8) || '';
          }
          result = join$.call(lns, '\n');
        }
        if (action === 'run' && (toString$.call(result).slice(8, -1) === 'Array' || toString$.call(result).slice(8, -1) === 'Object')) {
          result = JSON.stringify(result);
        }
        result = _.escape(result);
        result = result.replace(/\n/g, '<br>').replace(/\ /g, '&nbsp');
        if (action === 'compile' && !error) {
          result = prettyPrintOne(result, 'lang-js', false);
        }
        toPrepend = error
          ? "<div>\n<h3>" + action + " - error<span class=\"close\" title=\"Close\" >&times;</span></h3>\n<div class=\"alert alert-error\">" + result + "</div>\n</div>"
          : "<div>\n<h3>" + action + "<span class=\"close\" title=\"Close\" >&times;</span></h3>\n<pre class=\"prettyprint lang-js\">" + result + "</pre>\n</div>";
        return $(toPrepend).prependTo('.compiler-output').attr('title', source);
      }
    };
    $('#close-menu').on('click', function(){
      return $('#menu').hide();
    });
    $('#close-compiler').on('click', function(){
      return $('.compiler').hide();
    });
    $('.compiler-output').on('click', '.close', function(){
      $(this).parent().parent().hide();
      return false;
    });
    $('.actions button').on('click', function(){
      return boom($(this).data('action'));
    });
    $('.example').on('dblclick', function(){
      $('.compiler').show();
      return $('.compiler textarea').val($(this).find('.source').text());
    });
    $('.sidebar .nav').on('click', 'a', function(){
      $('.nav li').removeClass('active');
      return $(this).closest('li').addClass('active');
    });
    $('h1 a').click(function(){
      $('.nav li').removeClass('active');
      return $('.nav li').first().addClass('active');
    });
    $('body').scrollspy('refresh');
    return $('.sidebar .nav').scrollspy({
      offset: 0
    });
  });
}).call(this);
