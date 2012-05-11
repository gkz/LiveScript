(function(){
  $(function(){
    var example, src, boom, __i, __ref, __len;
    for (__i = 0, __len = (__ref = $('.example .example-ls')).length; __i < __len; ++__i) {
      example = __ref[__i];
      src = $(example).find('.lang-ls').html();
      $('<pre class="source"></pre>').html(src).appendTo(example);
    }
    prettyPrint();
    boom = function(action){
      var source, func, error, result, toPrepend;
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
        $(toPrepend).prependTo('.compiler-output').attr('title', source);
      }
    };
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
}).call(this);
