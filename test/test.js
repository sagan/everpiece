	// mongoose style API ( e.g. all callback first paramater is error)
	// async, but functions are expected to return right away.
	// Objet Store
	// then internally sync with remote server.
	/*
		front end structure
			view abstract layer: html and view data.data access are sync. use them to renderering
			controller receive page events (mesages), then use model to fetch data and pass callback
				when data accessed, update view layer data and renderer
			model: data that persistently storage. all data access are async.
				but expected to finish  right now and internally sync with background
					sync abstrat layer: sync local database with server. continusly run in background.
					Read  (fetch from server) on need and idle (cache.)
					Write (push to server) when client side data changed immediatele. (use queue)

					When fetched new data from server, view data should be updated and re-renderer.
					event or callback ?


	*/

	
	e.parse_note_md = function(xml) {
		try {
			xmlDoc = $.parseXML( xml );
		} catch(e) {
			return false;
		}
		$container = $( xmlDoc ).find( "pre[style*=markdown]" );
		if( $container.length == 0 )
			return false;
		return $container.text();
	};

	e.make_note_xml =function(content) {
		var xml = "";

		xml += '<?xml version="1.0" encoding="UTF-8"?>';
		xml += '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">';
		xml += '<en-note><pre style="_format: markdown"><![CDATA[';
		xml += content;
		xml += ']]></pre></en-note>';

		return xml;
	};

	/*


	var socket = io.connect(root);
	socket.on('news', function (data) {
		console.log(data);
		socket.emit('my other event', { my: 'data' });
	});

*/

