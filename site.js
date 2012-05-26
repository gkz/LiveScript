(function(){
  var __join = [].join;
  __import(this, prelude);
  $(function(){
    var example, src, boom, __i, __ref, __len;
    for (__i = 0, __len = (__ref = $('.example .example-ls')).length; __i < __len; ++__i) {
      example = __ref[__i];
      src = $(example).find('.lang-ls').html();
      $('<pre class="source"></pre>').html(src).appendTo(example);
    }
    prettyPrint();
    boom = __curry(function(action){
      var source, func, error, result, lns, tag, val, line, i, toPrepend, __i, __len, __ref;
      source = $('.compiler textarea').val();
      result = (function(){
        try {
          func = action === 'run' ? 'compile' : action;
          return LiveScript[func](source, {
            bare: true
          });
        } catch (e) {
          error = true;
          return e.message;
        }
      }());
      if (action === 'run') {
        result = (function(){
          try {
            return eval(result);
          } catch (e) {
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
          for (__i = 0, __len = result.length; __i < __len; ++__i) {
            __ref = result[__i], tag = __ref[0], val = __ref[1], line = __ref[2];
            lns[line] == null && (lns[line] = []);
            lns[line].push(val === tag.toLowerCase()
              ? tag
              : tag + ":" + val);
          }
          for (i = 0, __len = lns.length; i < __len; ++i) {
            line = lns[i];
            lns[i] = (line != null ? line.join(' ').replace(/\n/g, '\\n') : void 8) || '';
          }
          result = __join.call(lns, '\n');
        }
        result = _.escape(result);
        result = result.replace(/\n/g, '<br>').replace(/\ /g, '&nbsp');
        if (action === 'compile' && !error) {
          result = prettyPrintOne(result, 'lang-js', false);
        }
        toPrepend = error
          ? "<div>\n<h3>" + action + " - error<span class=\"close\" title=\"Close\" >&times;</span></h3>\n<div class=\"alert alert-error\">" + result + "</div>\n</div>"
          : "<div>\n<h3>" + action + "<span class=\"close\" title=\"Close\" >&times;</span></h3>\n<pre class=\"prettyprint lang-js\">" + result + "</pre>\n</div>";
        $(toPrepend).prependTo('.compiler-output').attr('title', source);
      }
    });
    $('.compiler-output').on('click', '.close', function(){
      $(this).parent().parent().hide();
      return false;
    });
    $('.actions button').on('click', function(){
      return boom($(this).data('action'));
    });
    $('.example').on('dblclick', function(){
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
  function __import(obj, src){
    var own = {}.hasOwnProperty;
    for (var key in src) if (own.call(src, key)) obj[key] = src[key];
    return obj;
  }
  function __curry(f, args){
    return f.length ? function(){
      var params = args ? args.concat() : [];
      return params.push.apply(params, arguments) < f.length ?
        __curry.call(this, f, params) : f.apply(this, params);
    } : f;
  }
}).call(this);
