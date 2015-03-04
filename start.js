
$(function() {

  var getOrgModeDate = function(d) {
    var defaultDate = new Date((new Date()).getTime() + (1000*60*60*24*7));
    if (!d) {
      return null;
    }
    var match = /([+-]?)(\d+)([dwmy])/.exec(d);
    if (!match) {
      return null;
    } else {
      var d = (new Date()).getTime();
      var n = match[2];
      var x = match[3];
      var k = 1000 * 60 * 60 * 24 * n; // Number of days
      k *= (x == 'w' ? 7 : (x == 'm' ? 30 : 1));
      if (match[1] == '-') {
        k *= -1;
      }
      return new Date((new Date()).getTime() + k).toLocaleDateString();
    }
  }

  /* Load Tasks from a File*/
  $('button.load-from-file').click(function(e) {

    chrome.fileSystem.chooseEntry({type: 'openFile'}, function(theEntry) {
      theEntry.file(function(file) {
        var reader = new FileReader();

        reader.onerror = function(e) {
          console.log('Error: ' + chrome.runtime.lastError);
        };
        reader.onloadend = function(e) {
          $('#tree').fancytree('destroy');
          chrome.storage.local.set({'todo_list': e.target.result}, function() {
            initialize();
          });
        };
        reader.readAsText(file);
      });
    });
  })

  // Saves the JSON value of the todo list to a file.
  $('button.save-to-file').click(function(e) {
    $('button.sync').trigger('click');
    chrome.fileSystem.chooseEntry({type: 'saveFile', suggestedName: 'todo.json'}, function(writableFileEntry) {
      writableFileEntry.createWriter(function(writer) {
        writer.onerror = function() {
          console.log('Error: ' + chrome.runtime.lastError);
        };
        writer.onwriteend = function(e) {
          console.log('write complete');
        };
        chrome.storage.local.get('todo_list', function(items) {
          var savedData = (items && items.todo_list) || '[]';
          writer.write(new Blob([savedData], {type: 'text/plain'}));
        });
      }, function() {
          console.log('Error: ' + chrome.runtime.lastError);
      });
    });
  });

  /* Dynamic Tree Filtering */
  $('input.filter').keyup(function(e) {

    var tree = $("#tree").fancytree("getTree");
    var filter = $.trim($(this).val());
    var open_only = true;

    // Check for @all in the filter
    if (filter.indexOf('@all') !== -1) {
      filter = $.trim(filter.replace('@all', ''));
      open_only = false;
    }

    // Keep the 'show all' button in sync with the filter
    //$('input.show-all-tasks').parent().removeClass('active');

    // Show the entire tree
    $('button.expand_all').trigger('click');

    // Execute the filter
    var rex = new RegExp(filter, "i");
    $("#tree").fancytree("getTree").filterNodes(function(node) {
      var searchString = (node.title + ';' + node.data.tags + ';' + node.data.description +
                          ';' + node.data.projectName + ';' + node.data.owner);

      if (open_only) {
        return node.data.status === 'open' && rex.test(searchString)
      } else {
        return rex.test(searchString);  // show all
      }
    });
  });

  $('input.show-all-tasks').change(function() {
    if ($(this).is(':checked')) {
      $('input.filter').val($.trim($('input.filter').val() + ' @all'));
    } else {
      var f = $('input.filter').val();
      f = f.replace('@all', '');
      $('input.filter').val($.trim(f));
    }
    $('input.filter').trigger('keyup');
  });

  $('button.sync').click(function() {
    var tree = $('#tree').fancytree('getTree');
    var treeJSON = JSON.stringify(tree.toDict());
    chrome.storage.local.set({'todo_list': treeJSON}, function() {});
  });

  // Expands all nodes in the tree
  $('button.expand_all').click(function() {
    $("#tree").fancytree("getRootNode").visit(function(node){
      node.setExpanded(true);
    });
  });

  // Removes a node from the tree.
  $('button.delete_item').click(function() {
    var tree = $("#tree").fancytree('getTree');
    var node = tree.getActiveNode();
    if (!node || node.isRootNode()) {
      return;
    }
    var prev = node.getPrevSibling() || node.getParent();
    prev.setFocus();
    prev.setActive();
    node.remove();
  });

  // Create a new node (todo list item)
  $('button.new_button').click(function() {
      var tree = $("#tree").fancytree('getTree');
      var node = tree.getActiveNode() || tree.getRootNode();
      $('#title').val('');
      $('#due').val('');
      $('#owner').val('');
      $('#tags').val('');
      $('#project').val('');
      $('#description').val('');
      $('input[name=priority][data-value="M"]').trigger('click');
      $('input[name=status][data-value="open"]').trigger('click');
      node.setFocus(false);
      node.setActive(false);
  });

  // Saves a node item back into the tree (authoritative)
  $('button.save_button').click(function() {

    if ($('#title').val() === '') {
      $('#title').animate( {backgroundColor: 'yellow'}, '100', function() {
        $('#title').animate( {backgroundColor: '#ffffff'}, '300');
      });
      return;
    }
    var tree = $("#tree").fancytree('getTree');
    var node = tree.getActiveNode();
    var newNode = node;
    if (!node || node.isRootNode()) {
      node = tree.getRootNode();
      newNode = node.addNode({
        title: $('#title').val()
      });
    }
    newNode.setTitle($('#title').val());

    newNode.data.due = $('#due').val();
    newNode.data.owner = $('#owner').val();
    newNode.data.projectName = $('#project').val();
    newNode.data.description = $('#description').val();
    newNode.data.tags = $('#tags').val();
    newNode.data.priority = $('input[name=priority]:checked').data('value');
    newNode.data.status = $('input[name=status]:checked').data('value');

    node.setExpanded(true);
    newNode.setFocus();
    newNode.setActive();
    $('button.sync').trigger('click');
    $('input.filter').trigger('keyup');

    tree.render(true, true);

  });

  // Catch the 'Return' or 'Ctrl-Return' key in the title block (quick input)
  $('body').keyup(function(evt) {
    if (evt.keyCode == 27) { // ESCAPE
      $('button.new_button').trigger('click');
    }
  });

  $(window).resize(function() {
    var t = $('#tree').offset().top;
    $('#tree').height($(window).height() - t - 10);
  });

  // When ENTER is pressed while typing in the text boxes, save+new
  $('#title,#owner,#project').keydown(function(evt) {
    if (evt.keyCode === 13) {
      $('button.save_button').trigger('click');
      $('button.new_button').trigger('click');
      return false;
    } else {
      return true;
    }
  });

  // Change "+7d" into (now) + 7 days, etc., like OrgMode
  $('#due').change(function(evt) {
    var nd = getOrgModeDate($(this).val());
    if (nd) {
      $(this).val(nd);
    }
  });

  // Initialization
  var initialize = function() {
    chrome.storage.local.get('todo_list', function(items) {
      // Extract todo_list items from Chrome storage
      var savedData = ((items && items.todo_list) ?
                       $.parseJSON(items.todo_list) : []);

      // Initialize a FancyTree object
      $("#tree").fancytree({
        extensions: ["dnd", "filter"],
        source: savedData, // gathered from Chrome storage
        filter: {
          mode: "hide",
          autoApply: true
        },
        keyboard: true,
        toggleEffect: null,

        /* Load data into the details on the right */
        activate: function(event, data) {
          var node = data.node;
          $('#title').val(node.title);
          $('#due').val(node.data.due || '');
          $('#owner').val(node.data.owner || '');
          $('#tags').val(node.data.tags || '');
          $('#project').val(node.data.projectName || '');
          $('#description').val(node.data.description || '');
          if (node.data.priority) {
            $('input[name=priority][data-value="' + node.data.priority + '"]').trigger('click');
          } else {
            $('input[name=priority][data-value="M"]').trigger('click');
          }
          if (node.data.status) {
            $('input[name=status][data-value="' + node.data.status + '"]').trigger('click');
          } else {
            $('input[name=status][data-value="open"]').trigger('click');
          }
          if (data.node.hasChildren()) {
            //$(data.node.span).addClass('fancytree-ico-ef');
          }

        },

        /* Custom styling */
        renderNode: function(event, data) {
          if (data.node.data.priority === 'H') {
            $(data.node.span).find('.fancytree-title').addClass('priority-high');
          } else if (data.node.data.priority === 'M') {
            $(data.node.span).find('.fancytree-title').addClass('priority-medium');
          } else if (data.node.data.priority === 'L') {
            $(data.node.span).find('.fancytree-title').addClass('priority-low');
          }

          if (data.node.data.status === 'closed') {
            $(data.node.span).find('.fancytree-title').addClass('task-closed');
          }

          if (data.node.data.due) {
            var due = new Date(data.node.data.due).getTime();
            var status = data.node.data.status;
            if (due > 0 && due < new Date().getTime() && status && status === 'open') {
              $(data.node.span).find('.fancytree-title').addClass('due-late');
            }
          }
        },

        /* Drag & Drop */
        dnd: {
          // Available options with their default:
          autoExpandMS: 1000,
          draggable: null,
          droppable: null,
          preventRecursiveMoves: true,
          preventVoidMoves: true,
          focusOnClick: false,
          dragStart: function() { return true; },
          dragStop: null,
          dragEnter: function() { return true; },
          dragOver: null,
          dragDrop: function(node, data) {
            data.otherNode.moveTo(node, data.hitMode);
            $('button.expand_all').trigger('click');
            $('button.save').removeClass('disabled');
            $('button.sync').trigger('click');
            node.folder = true;
            node.render(true);
          },
          dragLeave: null
        },
      });
      $('input.filter').trigger('keyup');
    });
  };

  // Auto-complete for project names
  $('#project.typeahead').typeahead({
    hint: true,
    highlight: false,
    minLength: 1
  }, {
    name: 'projects',
    displayKey: 'value',
    source: function(q, cb) {
      var matches = [];
      var substrRegex = new RegExp(q, 'i');
      var project_list = {};
      var strs = [];

      // Add *unique* project names to a list
      $('#tree').fancytree('getTree').visit(function(node) {
        if (node.data.projectName) {
          project_list[node.data.projectName] = 1;
        }
      });

      // Search the list for matches
      $.each(project_list, function(i, str) {
        if (substrRegex.test(i)) {
          matches.push({ value: i });
        }
      });
      cb(matches);
    }
  });

  // Kick things off
  initialize();
  $(window).trigger('resize');

});